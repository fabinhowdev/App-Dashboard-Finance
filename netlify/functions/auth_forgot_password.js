const { ensureSchema, getSql } = require("./_lib/db");
const { getEnvBoolean } = require("./_lib/env");
const { json, methodNotAllowed, parseRequestBody, preflight } = require("./_lib/http");
const { buildResetPasswordUrl } = require("./_lib/links");
const { logResetEmail } = require("./_lib/mail");
const { randomHex, sha256 } = require("./_lib/security");

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
    const body = parseRequestBody(event);
    const email = String(body.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return json(event, 422, {
        success: false,
        message: "Informe um e-mail valido.",
      });
    }

    const genericMessage =
      "Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.";

    const users = await sql`
      SELECT id, email
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;
    const user = users[0];

    let debugResetUrl = null;

    if (user) {
      const token = randomHex(32);
      const tokenHash = sha256(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await sql`DELETE FROM password_resets WHERE user_id = ${user.id}`;
      await sql`
        INSERT INTO password_resets (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${tokenHash}, ${expiresAt})
      `;

      const resetUrl = buildResetPasswordUrl(event, token);
      logResetEmail(email, resetUrl);

      const allowDebug = getEnvBoolean("ENABLE_DEBUG_RESET_URL", false);
      if (allowDebug) {
        debugResetUrl = resetUrl;
      }
    }

    return json(event, 200, {
      success: true,
      message: genericMessage,
      debug_reset_url: debugResetUrl,
    });
  } catch (error) {
    console.error("auth_forgot_password error", error);
    return json(event, 500, {
      success: false,
      message: "Erro ao processar recuperacao de senha.",
    });
  }
};
