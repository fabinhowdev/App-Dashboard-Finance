<?php
declare(strict_types=1);

include __DIR__ . '/auth_common.php';
handle_api_preflight();
include __DIR__ . '/conexao.php';

const ALLOWED_GENDERS = ['feminino', 'masculino', 'outro', 'nao_informado'];

function normalize_gender(string $value): string
{
    $normalized = strtolower(trim($value));
    $aliases = [
        'female' => 'feminino',
        'male' => 'masculino',
        'other' => 'outro',
        'nao informado' => 'nao_informado',
        'não informado' => 'nao_informado',
        'nao-informado' => 'nao_informado',
        'não-informado' => 'nao_informado',
        'prefiro-nao-informar' => 'nao_informado',
        'prefiro_nao_informar' => 'nao_informado',
        'prefer_not_to_say' => 'nao_informado',
    ];

    return $aliases[$normalized] ?? $normalized;
}

function respond(int $statusCode, array $payload): void
{
    json_response($statusCode, $payload);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'success' => false,
        'message' => 'Método inválido. Envie os dados via POST.',
    ]);
}

$nome = trim($_POST['name'] ?? '');
$sobrenome = trim($_POST['last_name'] ?? '');
$nascimento = trim($_POST['birthdate'] ?? '');
$email = trim($_POST['email'] ?? '');
$senha = $_POST['password'] ?? '';
$confirmar = $_POST['confirm_password'] ?? '';
$genero = normalize_gender($_POST['gender'] ?? '');

if (
    $nome === '' || $sobrenome === '' || $nascimento === '' ||
    $email === '' || $senha === '' || $confirmar === '' || $genero === ''
) {
    respond(422, [
        'success' => false,
        'message' => 'Preencha todos os campos obrigatórios.',
    ]);
}

if (!in_array($genero, ALLOWED_GENDERS, true)) {
    respond(422, [
        'success' => false,
        'message' => 'Gênero inválido.',
    ]);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, [
        'success' => false,
        'message' => 'E-mail inválido.',
    ]);
}

if ($senha !== $confirmar) {
    respond(422, [
        'success' => false,
        'message' => 'As senhas não coincidem.',
    ]);
}

$senhaHash = password_hash($senha, PASSWORD_DEFAULT);

try {
    $stmt = $conn->prepare(
        'INSERT INTO usuarios (nome, sobrenome, nascimento, email, senha, genero)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('ssssss', $nome, $sobrenome, $nascimento, $email, $senhaHash, $genero);
    $stmt->execute();
    $insertedId = $conn->insert_id;

    if ($stmt->affected_rows !== 1 || $insertedId <= 0) {
        throw new RuntimeException('O insert não foi confirmado pelo banco.');
    }

    $stmt->close();
    $conn->close();

    respond(201, [
        'success' => true,
        'message' => 'Conta criada com sucesso!',
        'inserted_id' => $insertedId,
        'db' => [
            'host' => $dbHost,
            'port' => $dbPort,
            'database' => $dbName,
        ],
    ]);
} catch (mysqli_sql_exception $e) {
    respond(500, [
        'success' => false,
        'message' => 'Erro ao salvar no banco: ' . $e->getMessage(),
    ]);
} catch (RuntimeException $e) {
    respond(500, [
        'success' => false,
        'message' => 'Erro ao salvar no banco: ' . $e->getMessage(),
    ]);
}
