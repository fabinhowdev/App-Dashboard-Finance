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

function toIntArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return [];

    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
  }

  return [];
}

async function dedupeUsersByNormalizedEmail(sql) {
  await sql.begin(async (tx) => {
    const groups = await tx`
      SELECT
        LOWER(BTRIM(email)) AS email_key,
        ARRAY_AGG(id ORDER BY created_at DESC, id DESC) AS user_ids
      FROM users
      GROUP BY LOWER(BTRIM(email))
      HAVING COUNT(*) > 1
    `;

    for (const group of groups) {
      const userIds = toIntArray(group.user_ids);
      if (userIds.length < 2) continue;

      const keeperId = userIds[0];
      const duplicateIds = userIds.slice(1);
      const duplicateIdsArray = tx.array(duplicateIds, "int4");

      await tx`
        UPDATE auth_sessions
        SET user_id = ${keeperId}
        WHERE user_id = ANY(${duplicateIdsArray})
      `;

      await tx`
        UPDATE password_resets
        SET user_id = ${keeperId}
        WHERE user_id = ANY(${duplicateIdsArray})
      `;

      await tx`
        UPDATE transactions
        SET user_id = ${keeperId}
        WHERE user_id = ANY(${duplicateIdsArray})
      `;

      await tx`
        DELETE FROM users
        WHERE id = ANY(${duplicateIdsArray})
      `;
    }
  });
}

async function ensureNormalizedEmailUniqueIndex(sql) {
  try {
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_normalized
      ON users ((LOWER(BTRIM(email))))
    `;
  } catch (error) {
    if (error?.code !== "23505") {
      throw error;
    }

    await dedupeUsersByNormalizedEmail(sql);

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_normalized
      ON users ((LOWER(BTRIM(email))))
    `;
  }
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

  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id
      ON transactions (user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at
      ON transactions (created_at)
  `;

  await dedupeUsersByNormalizedEmail(sql);
  await ensureNormalizedEmailUniqueIndex(sql);

  schemaReady = true;
}

module.exports = {
  getSql,
  ensureSchema,
};
