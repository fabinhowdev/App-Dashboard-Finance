<?php
declare(strict_types=1);

include __DIR__ . '/auth_common.php';
handle_api_preflight();
include __DIR__ . '/conexao.php';

start_app_session();
ensure_auth_tables($conn);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, [
        'success' => false,
        'message' => 'Metodo invalido. Envie os dados via POST.',
    ]);
}

$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$rememberMeRaw = strtolower(trim((string) ($_POST['remember_me'] ?? '')));
$rememberMe = in_array($rememberMeRaw, ['1', 'true', 'on', 'yes'], true);

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    json_response(422, [
        'success' => false,
        'message' => 'Informe e-mail e senha validos.',
    ]);
}

$user = get_user_by_email($conn, $email);
if ($user === null) {
    json_response(401, [
        'success' => false,
        'message' => 'E-mail ou senha incorretos.',
    ]);
}

$storedPassword = (string) ($user['senha'] ?? '');
$isValidPassword = false;
$shouldUpgradeHash = false;

if ($storedPassword !== '' && password_verify($password, $storedPassword)) {
    $isValidPassword = true;
    $shouldUpgradeHash = password_needs_rehash($storedPassword, PASSWORD_DEFAULT);
} elseif ($storedPassword !== '' && hash_equals($storedPassword, $password)) {
    // Compatibilidade com registros antigos em texto puro.
    $isValidPassword = true;
    $shouldUpgradeHash = true;
}

if (!$isValidPassword) {
    json_response(401, [
        'success' => false,
        'message' => 'E-mail ou senha incorretos.',
    ]);
}

if ($shouldUpgradeHash) {
    $newHash = password_hash($password, PASSWORD_DEFAULT);
    $updateStmt = $conn->prepare('UPDATE usuarios SET senha = ? WHERE id = ?');
    $userId = (int) $user['id'];
    $updateStmt->bind_param('si', $newHash, $userId);
    $updateStmt->execute();
    $updateStmt->close();
}

set_authenticated_session($user);

if ($rememberMe) {
    issue_remember_token($conn, (int) $user['id']);
} else {
    clear_remember_cookie($conn);
}

json_response(200, [
    'success' => true,
    'message' => 'Login realizado com sucesso!',
    'redirect' => 'dash-function/dash.html',
    'user' => [
        'id' => (int) $user['id'],
        'nome' => (string) ($user['nome'] ?? ''),
        'email' => (string) ($user['email'] ?? ''),
    ],
]);
