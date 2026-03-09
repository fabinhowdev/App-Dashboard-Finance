<?php
declare(strict_types=1);

include __DIR__ . '/conexao.php';
include __DIR__ . '/auth_common.php';

ensure_auth_tables($conn);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, [
        'success' => false,
        'message' => 'Metodo invalido. Envie via POST.',
    ]);
}

$token = trim($_POST['token'] ?? '');
$password = $_POST['password'] ?? '';
$confirmPassword = $_POST['confirm_password'] ?? '';

if ($token === '' || !ctype_xdigit($token)) {
    json_response(422, [
        'success' => false,
        'message' => 'Token de redefinicao invalido.',
    ]);
}

if ($password === '' || $confirmPassword === '') {
    json_response(422, [
        'success' => false,
        'message' => 'Preencha os campos de senha.',
    ]);
}

if ($password !== $confirmPassword) {
    json_response(422, [
        'success' => false,
        'message' => 'As senhas nao coincidem.',
    ]);
}

if (!password_is_strong($password)) {
    json_response(422, [
        'success' => false,
        'message' => 'Senha fraca. Use 8+ caracteres, maiuscula, minuscula, numero e caractere especial.',
    ]);
}

$tokenHash = hash('sha256', $token);

$stmt = $conn->prepare(
    'SELECT id, user_id, expires_at, used_at
     FROM password_resets
     WHERE token_hash = ?
     LIMIT 1'
);
$stmt->bind_param('s', $tokenHash);
$stmt->execute();
$result = $stmt->get_result();
$resetRequest = $result->fetch_assoc() ?: null;
$stmt->close();

if ($resetRequest === null) {
    json_response(400, [
        'success' => false,
        'message' => 'Link de redefinicao invalido ou expirado.',
    ]);
}

if (!empty($resetRequest['used_at']) || strtotime((string) $resetRequest['expires_at']) <= time()) {
    json_response(400, [
        'success' => false,
        'message' => 'Link de redefinicao invalido ou expirado.',
    ]);
}

$userId = (int) $resetRequest['user_id'];
$passwordHash = password_hash($password, PASSWORD_DEFAULT);
$resetId = (int) $resetRequest['id'];

try {
    $conn->begin_transaction();

    $updatePasswordStmt = $conn->prepare('UPDATE usuarios SET senha = ? WHERE id = ?');
    $updatePasswordStmt->bind_param('si', $passwordHash, $userId);
    $updatePasswordStmt->execute();
    $updatePasswordStmt->close();

    $markUsedStmt = $conn->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = ?');
    $markUsedStmt->bind_param('i', $resetId);
    $markUsedStmt->execute();
    $markUsedStmt->close();

    // Invalida logins persistentes antigos após troca de senha.
    $deleteRememberStmt = $conn->prepare('DELETE FROM remember_tokens WHERE user_id = ?');
    $deleteRememberStmt->bind_param('i', $userId);
    $deleteRememberStmt->execute();
    $deleteRememberStmt->close();

    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    json_response(500, [
        'success' => false,
        'message' => 'Nao foi possivel redefinir a senha.',
    ]);
}

json_response(200, [
    'success' => true,
    'message' => 'Senha redefinida com sucesso. Faça login com a nova senha.',
]);

