<?php
declare(strict_types=1);

include __DIR__ . '/auth_common.php';
handle_api_preflight();
include __DIR__ . '/conexao.php';

start_app_session();
ensure_auth_tables($conn);

$user = current_session_user($conn);
if ($user === null) {
    $user = try_remember_login($conn);
}

if ($user === null) {
    json_response(200, [
        'success' => true,
        'authenticated' => false,
    ]);
}

json_response(200, [
    'success' => true,
    'authenticated' => true,
    'user' => [
        'id' => (int) $user['id'],
        'nome' => (string) ($user['nome'] ?? ''),
        'email' => (string) ($user['email'] ?? ''),
        'genero' => (string) ($user['genero'] ?? ''),
    ],
]);
