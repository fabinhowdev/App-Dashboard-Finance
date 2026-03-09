<?php
declare(strict_types=1);

if (!class_exists('mysqli')) {
    http_response_code(500);
    if (function_exists('apply_cors_headers')) {
        apply_cors_headers();
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Erro: extensão mysqli não está habilitada no PHP.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$dbHost = getenv('DB_HOST') ?: '127.0.0.1';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') ?: '';
$dbName = getenv('DB_NAME') ?: 'dashboard_finance';
$dbPort = (int) (getenv('DB_PORT') ?: '3306');

try {
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName, $dbPort);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    http_response_code(500);
    if (function_exists('apply_cors_headers')) {
        apply_cors_headers();
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Erro de conexão com o banco: ' . $e->getMessage(),
        'db' => [
            'host' => $dbHost,
            'port' => $dbPort,
            'database' => $dbName,
        ],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
