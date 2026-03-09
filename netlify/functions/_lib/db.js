const postgres = require("postgres");
const { getEnvFromList } = require("./env");

let sqlClient;
let schemaReady = false;

function getDatabaseUrl() {
  return getEnvFromList(
    [
      "NETLIFY_DATABASE_URL",
      "DATABASE_URL",
      "NETLIFY_DATABASE_URL_UNPOOLED",
      "POSTGRES_URL",
    ],
    "",
  );
}

function getSql() {
  if (sqlClient) return sqlClient;

  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "Database URL ausente. Configure NETLIFY_DATABASE_URL (ou DATABASE_URL).",
    );
  }

  sqlClient = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 20,
    ssl: "require",
  });

  return sqlClient;
}

async function ensureSchema() {
  if (schemaReady) return;
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      sobrenome TEXT NOT NULL,
      nascimento DATE NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      genero TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
      ON auth_sessions (user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires
      ON auth_sessions (expires_at)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_password_resets_user_id
      ON password_resets (user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_password_resets_expires
      ON password_resets (expires_at)
  `;

  schemaReady = true;
}

module.exports = {
  getSql,
  ensureSchema,
};
