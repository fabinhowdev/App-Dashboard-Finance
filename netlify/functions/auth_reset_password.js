const bcrypt = require("bcryptjs");
const { ensureSchema, getSql } = require("./_lib/db");
const { json, methodNotAllowed, parseRequestBody, preflight } = require("./_lib/http");
const { passwordIsStrong, sha256 } = require("./_lib/security");

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

    const token = String(body.token || "").trim();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirm_password || "");

    if (!token || !/^[a-f0-9]+$/i.test(token)) {
      return json(event, 422, {
        success: false,
        message: "Token de redefinicao invalido.",
      });
    }

    if (!password || !confirmPassword) {
      return json(event, 422, {
        success: false,
        message: "Preencha os campos de senha.",
      });
    }

    if (password !== confirmPassword) {
      return json(event, 422, {
        success: false,
        message: "As senhas nao coincidem.",
      });
    }

    if (!passwordIsStrong(password)) {
      return json(event, 422, {
        success: false,
        message:
          "Senha fraca. Use 8+ caracteres, maiuscula, minuscula, numero e caractere especial.",
      });
    }

    const tokenHash = sha256(token);
    const resetRows = await sql`
      SELECT id, user_id, expires_at, used_at
      FROM password_resets
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `;
    const resetRow = resetRows[0];

    if (!resetRow) {
      return json(event, 400, {
        success: false,
        message: "Link de redefinicao invalido ou expirado.",
      });
    }

    const isExpired = new Date(resetRow.expires_at).getTime() <= Date.now();
    if (resetRow.used_at || isExpired) {
      return json(event, 400, {
        success: false,
        message: "Link de redefinicao invalido ou expirado.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = Number(resetRow.user_id);
    const resetId = Number(resetRow.id);

    await sql.begin(async (tx) => {
      await tx`UPDATE users SET senha_hash = ${passwordHash} WHERE id = ${userId}`;
      await tx`UPDATE password_resets SET used_at = NOW() WHERE id = ${resetId}`;
      await tx`DELETE FROM auth_sessions WHERE user_id = ${userId}`;
    });

    return json(event, 200, {
      success: true,
      message: "Senha redefinida com sucesso. Faça login com a nova senha.",
    });
  } catch (error) {
    console.error("auth_reset_password error", error);
    return json(event, 500, {
      success: false,
      message: "Nao foi possivel redefinir a senha.",
    });
  }
};
