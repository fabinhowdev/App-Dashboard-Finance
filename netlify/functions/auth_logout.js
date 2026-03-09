const { ensureSchema, getSql } = require("./_lib/db");
const { json, methodNotAllowed, preflight } = require("./_lib/http");
const { clearSession } = require("./_lib/session");

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
    const expiredCookie = await clearSession(event, sql);

    return json(
      event,
      200,
      {
        success: true,
        message: "Logout realizado com sucesso.",
      },
      {
        "Set-Cookie": expiredCookie,
      },
    );
  } catch (error) {
    console.error("auth_logout error", error);
    return json(event, 500, {
      success: false,
      message: "Erro ao processar logout.",
    });
  }
};
