<?php
declare(strict_types=1);

include __DIR__ . '/conexao.php';
include __DIR__ . '/auth_common.php';

start_app_session();
ensure_auth_tables($conn);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, [
        'success' => false,
        'message' => 'Metodo invalido. Envie via POST.',
    ]);
}

destroy_auth_session($conn);

json_response(200, [
    'success' => true,
    'message' => 'Logout realizado com sucesso.',
]);

