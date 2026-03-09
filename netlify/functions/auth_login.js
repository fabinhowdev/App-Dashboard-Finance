const bcrypt = require("bcryptjs");
const { ensureSchema, getSql } = require("./_lib/db");
const { json, methodNotAllowed, parseRequestBody, preflight } = require("./_lib/http");
const { createSession, cleanupExpiredSessions } = require("./_lib/session");
const { normalizeStoredBcryptHash } = require("./_lib/security");

function asBoolean(value) {
  return ["1", "true", "on", "yes"].includes(String(value || "").trim().toLowerCase());
}

function sanitizeUser(user) {
  return {
    id: Number(user.id),
    nome: String(user.nome || ""),
    email: String(user.email || ""),
    genero: String(user.genero || ""),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return preflight(event);
  }

  if (event.httpMethod !== "POST") {
    return methodNotAllowed(event, "POST");
  }

  try {
    await ensureSchema();
    const sql = getSql();
    await cleanupExpiredSessions(sql);

    const body = parseRequestBody(event);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rememberMe = asBoolean(body.remember_me);

    if (!email || !password || !email.includes("@")) {
      return json(event, 422, {
        success: false,
        message: "Informe e-mail e senha validos.",
      });
    }

    const users = await sql`
      SELECT id, nome, email, genero, senha_hash
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;
    const user = users[0];

    if (!user) {
      return json(event, 401, {
        success: false,
        message: "E-mail ou senha incorretos.",
      });
    }

    const storedHash = String(user.senha_hash || "");
    let valid = false;
    let shouldUpgradeHash = false;

    if (storedHash.startsWith("$2")) {
      const normalizedHash = normalizeStoredBcryptHash(storedHash);
      valid = await bcrypt.compare(password, normalizedHash);
    } else if (storedHash && storedHash === password) {
      // Compatibilidade com registros legados sem hash.
      valid = true;
      shouldUpgradeHash = true;
    }

    if (!valid) {
      return json(event, 401, {
        success: false,
        message: "E-mail ou senha incorretos.",
      });
    }

    if (shouldUpgradeHash) {
      const upgraded = await bcrypt.hash(password, 10);
      await sql`UPDATE users SET senha_hash = ${upgraded} WHERE id = ${user.id}`;
    }

    const session = await createSession(event, sql, Number(user.id), rememberMe);

    return json(
      event,
      200,
      {
        success: true,
        message: "Login realizado com sucesso!",
        redirect: "/dash-function/dash.html",
        user: sanitizeUser(user),
      },
      {
        "Set-Cookie": session.setCookie,
      },
    );
  } catch (error) {
    console.error("auth_login error", error);
    return json(event, 500, {
      success: false,
      message: "Erro interno ao processar login.",
    });
  }
};
