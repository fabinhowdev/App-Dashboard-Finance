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

$email = trim($_POST['email'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(422, [
        'success' => false,
        'message' => 'Informe um e-mail valido.',
    ]);
}

$genericMessage = 'Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.';
$debugResetUrl = null;

$user = get_user_by_email($conn, $email);
if ($user !== null) {
    $resetData = create_password_reset($conn, (int) $user['id']);
    $baseUrl = build_app_base_url();
    $resetUrl = $baseUrl . '/login-dash/reset-password.html?token=' . urlencode((string) $resetData['token']);

    $sent = send_password_reset_email(
        (string) $user['email'],
        (string) ($user['nome'] ?? ''),
        $resetUrl
    );

    if (!$sent && is_local_environment()) {
        $debugResetUrl = $resetUrl;
    }
}

json_response(200, [
    'success' => true,
    'message' => $genericMessage,
    'debug_reset_url' => $debugResetUrl,
]);

