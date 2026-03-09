const { getEnv, getEnvNumber } = require("./env");
const { serializeCookie, parseCookies } = require("./cookies");
const { randomHex, sha256 } = require("./security");

const COOKIE_NAME = getEnv("COOKIE_NAME", "finance_session");

function sessionHours() {
  return Math.max(1, getEnvNumber("SESSION_TTL_HOURS", 24));
}

function rememberDays() {
  return Math.max(1, getEnvNumber("REMEMBER_TTL_DAYS", 30));
}

function toIsoAfterSeconds(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function sessionTtlSeconds(rememberMe = false) {
  if (rememberMe) {
    return rememberDays() * 24 * 60 * 60;
  }
  return sessionHours() * 60 * 60;
}

async function createSession(event, sql, userId, rememberMe = false) {
  const token = randomHex(32);
  const tokenHash = sha256(token);
  const ttlSeconds = sessionTtlSeconds(rememberMe);
  const expiresAt = toIsoAfterSeconds(ttlSeconds);

  await sql`DELETE FROM auth_sessions WHERE user_id = ${userId}`;
  await sql`
    INSERT INTO auth_sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
  `;

  const setCookie = serializeCookie(event, COOKIE_NAME, token, {
    maxAge: ttlSeconds,
  });

  return {
    setCookie,
    expiresAt,
  };
}

async function clearSession(event, sql) {
  const cookies = parseCookies(event);
  const rawToken = String(cookies[COOKIE_NAME] || "");
  if (rawToken) {
    const tokenHash = sha256(rawToken);
    await sql`DELETE FROM auth_sessions WHERE token_hash = ${tokenHash}`;
  }

  return serializeCookie(event, COOKIE_NAME, "", {
    maxAge: 0,
    expires: new Date(0),
  });
}

async function getAuthenticatedUser(event, sql) {
  const cookies = parseCookies(event);
  const token = String(cookies[COOKIE_NAME] || "");
  if (!token) return null;

  const tokenHash = sha256(token);
  const rows = await sql`
    SELECT u.id, u.nome, u.email
    FROM auth_sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
    LIMIT 1
  `;

  return rows[0] || null;
}

async function cleanupExpiredSessions(sql) {
  await sql`DELETE FROM auth_sessions WHERE expires_at <= NOW()`;
}

module.exports = {
  COOKIE_NAME,
  createSession,
  clearSession,
  getAuthenticatedUser,
  cleanupExpiredSessions,
};
