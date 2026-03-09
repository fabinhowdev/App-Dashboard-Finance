<?php
declare(strict_types=1);

const REMEMBER_COOKIE_NAME = 'finance_remember';
const REMEMBER_TTL_SECONDS = 2592000; // 30 dias
const RESET_TOKEN_TTL_SECONDS = 3600; // 1 hora

function json_response(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function start_app_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function ensure_auth_tables(mysqli $conn): void
{
    $conn->query(
        'CREATE TABLE IF NOT EXISTS remember_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            selector VARCHAR(32) NOT NULL UNIQUE,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_remember_user_id (user_id),
            INDEX idx_remember_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );

    $conn->query(
        'CREATE TABLE IF NOT EXISTS password_resets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token_hash CHAR(64) NOT NULL UNIQUE,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_reset_user_id (user_id),
            INDEX idx_reset_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
}

function get_user_by_email(mysqli $conn, string $email): ?array
{
    $stmt = $conn->prepare(
        'SELECT id, nome, email, senha
         FROM usuarios
         WHERE email = ?
         LIMIT 1'
    );
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc() ?: null;
    $stmt->close();

    return $user;
}

function get_user_by_id(mysqli $conn, int $userId): ?array
{
    $stmt = $conn->prepare(
        'SELECT id, nome, email
         FROM usuarios
         WHERE id = ?
         LIMIT 1'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc() ?: null;
    $stmt->close();

    return $user;
}

function set_authenticated_session(array $user): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['user_nome'] = (string) ($user['nome'] ?? '');
    $_SESSION['user_email'] = (string) ($user['email'] ?? '');
    $_SESSION['logged_at'] = time();
}

function current_session_user(mysqli $conn): ?array
{
    $userId = (int) ($_SESSION['user_id'] ?? 0);
    if ($userId <= 0) {
        return null;
    }

    return get_user_by_id($conn, $userId);
}

function set_remember_cookie(string $cookieValue, int $expiresAt): void
{
    setcookie(REMEMBER_COOKIE_NAME, $cookieValue, [
        'expires' => $expiresAt,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function issue_remember_token(mysqli $conn, int $userId): void
{
    $selector = bin2hex(random_bytes(8));
    $validator = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $validator);
    $expiresAtTimestamp = time() + REMEMBER_TTL_SECONDS;
    $expiresAt = date('Y-m-d H:i:s', $expiresAtTimestamp);

    $cleanupStmt = $conn->prepare('DELETE FROM remember_tokens WHERE user_id = ?');
    $cleanupStmt->bind_param('i', $userId);
    $cleanupStmt->execute();
    $cleanupStmt->close();

    $stmt = $conn->prepare(
        'INSERT INTO remember_tokens (user_id, selector, token_hash, expires_at)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->bind_param('isss', $userId, $selector, $tokenHash, $expiresAt);
    $stmt->execute();
    $stmt->close();

    set_remember_cookie($selector . ':' . $validator, $expiresAtTimestamp);
}

function clear_remember_cookie(mysqli $conn): void
{
    $cookieValue = $_COOKIE[REMEMBER_COOKIE_NAME] ?? '';
    if ($cookieValue !== '' && str_contains($cookieValue, ':')) {
        [$selector] = explode(':', $cookieValue, 2);
        if ($selector !== '') {
            $stmt = $conn->prepare('DELETE FROM remember_tokens WHERE selector = ?');
            $stmt->bind_param('s', $selector);
            $stmt->execute();
            $stmt->close();
        }
    }

    setcookie(REMEMBER_COOKIE_NAME, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    unset($_COOKIE[REMEMBER_COOKIE_NAME]);
}

function try_remember_login(mysqli $conn): ?array
{
    $cookieValue = $_COOKIE[REMEMBER_COOKIE_NAME] ?? '';
    if ($cookieValue === '' || !str_contains($cookieValue, ':')) {
        return null;
    }

    [$selector, $validator] = explode(':', $cookieValue, 2);
    if ($selector === '' || $validator === '' || !ctype_xdigit($validator)) {
        clear_remember_cookie($conn);
        return null;
    }

    $stmt = $conn->prepare(
        'SELECT id, user_id, token_hash, expires_at
         FROM remember_tokens
         WHERE selector = ?
         LIMIT 1'
    );
    $stmt->bind_param('s', $selector);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc() ?: null;
    $stmt->close();

    if ($row === null) {
        clear_remember_cookie($conn);
        return null;
    }

    if (strtotime((string) $row['expires_at']) <= time()) {
        clear_remember_cookie($conn);
        return null;
    }

    $expectedHash = (string) $row['token_hash'];
    $actualHash = hash('sha256', $validator);
    if (!hash_equals($expectedHash, $actualHash)) {
        clear_remember_cookie($conn);
        return null;
    }

    $userId = (int) $row['user_id'];
    $user = get_user_by_id($conn, $userId);
    if ($user === null) {
        clear_remember_cookie($conn);
        return null;
    }

    set_authenticated_session($user);
    issue_remember_token($conn, $userId); // rotaciona token

    return $user;
}

function destroy_auth_session(mysqli $conn): void
{
    clear_remember_cookie($conn);
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => (bool) $params['secure'],
            'httponly' => (bool) $params['httponly'],
            'samesite' => $params['samesite'] ?: 'Lax',
        ]);
    }

    session_destroy();
}

function create_password_reset(mysqli $conn, int $userId): array
{
    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $expiresAt = date('Y-m-d H:i:s', time() + RESET_TOKEN_TTL_SECONDS);

    $cleanupStmt = $conn->prepare('DELETE FROM password_resets WHERE user_id = ?');
    $cleanupStmt->bind_param('i', $userId);
    $cleanupStmt->execute();
    $cleanupStmt->close();

    $stmt = $conn->prepare(
        'INSERT INTO password_resets (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)'
    );
    $stmt->bind_param('iss', $userId, $tokenHash, $expiresAt);
    $stmt->execute();
    $stmt->close();

    return [
        'token' => $token,
        'expires_at' => $expiresAt,
    ];
}

function password_is_strong(string $password): bool
{
    return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/', $password) === 1;
}

function build_app_base_url(): string
{
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ((int) ($_SERVER['SERVER_PORT'] ?? 80) === 443);
    $scheme = $isHttps ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
    $scriptDir = rtrim($scriptDir, '/');
    if ($scriptDir === '/' || $scriptDir === '.') {
        $scriptDir = '';
    }

    return $scheme . '://' . $host . $scriptDir;
}

function is_local_environment(): bool
{
    $host = $_SERVER['HTTP_HOST'] ?? '';
    return str_contains($host, 'localhost')
        || str_contains($host, '127.0.0.1')
        || str_contains($host, '::1');
}

function send_password_reset_email(string $email, string $name, string $resetUrl): bool
{
    $subject = 'Redefinicao de senha - Finance Dashboard';
    $safeName = htmlspecialchars($name !== '' ? $name : 'usuario', ENT_QUOTES, 'UTF-8');
    $safeUrl = htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8');

    $htmlMessage = <<<HTML
<html>
  <body style="font-family: Arial, sans-serif;">
    <p>Ola, {$safeName}.</p>
    <p>Recebemos uma solicitacao para redefinir sua senha.</p>
    <p>
      <a href="{$safeUrl}" style="display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
        Redefinir senha
      </a>
    </p>
    <p>Se o botao nao abrir, copie e cole este link no navegador:</p>
    <p>{$safeUrl}</p>
    <p>Este link expira em 1 hora.</p>
  </body>
</html>
HTML;

    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= 'From: ' . (getenv('MAIL_FROM') ?: 'no-reply@financedashboard.local') . "\r\n";

    $sent = @mail($email, $subject, $htmlMessage, $headers);
    if (!$sent) {
        $logLine = sprintf(
            "[%s] Falha ao enviar para %s | Link: %s%s",
            date('Y-m-d H:i:s'),
            $email,
            $resetUrl,
            PHP_EOL
        );
        @file_put_contents(__DIR__ . '/mail_debug.log', $logLine, FILE_APPEND);
    }

    return $sent;
}

