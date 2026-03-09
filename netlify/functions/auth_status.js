const { ensureSchema, getSql } = require("./_lib/db");
const { json, methodNotAllowed, preflight } = require("./_lib/http");
const { cleanupExpiredSessions, getAuthenticatedUser } = require("./_lib/session");

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

  if (event.httpMethod !== "GET") {
    return methodNotAllowed(event, "GET");
  }

  try {
    await ensureSchema();
    const sql = getSql();
    await cleanupExpiredSessions(sql);

    const user = await getAuthenticatedUser(event, sql);
    if (!user) {
      return json(event, 200, {
        success: true,
        authenticated: false,
      });
    }

    return json(event, 200, {
      success: true,
      authenticated: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("auth_status error", error);
    return json(event, 500, {
      success: false,
      authenticated: false,
      message: "Erro ao verificar sessao.",
    });
  }
};
