const { ensureSchema, getSql } = require("./_lib/db");
const { json, parseRequestBody, preflight } = require("./_lib/http");
const { cleanupExpiredSessions, getAuthenticatedUser } = require("./_lib/session");

const ALLOWED_TYPES = new Set(["income", "expense"]);

function unauthorized(event) {
  return json(event, 401, {
    success: false,
    message: "Sessao expirada. Faca login novamente.",
  });
}

function sanitizeTransaction(row) {
  return {
    id: Number(row.id),
    description: String(row.description || ""),
    amount: Number(row.amount) || 0,
    type: String(row.type || "income"),
    created_at: row.created_at,
  };
}

function validateTransactionInput(body) {
  const description = String(body.description || "").trim();
  const amountValue = String(body.amount || "").trim().replace(",", ".");
  const amount = Number(amountValue);
  const type = String(body.type || "").trim().toLowerCase();

  if (!description) {
    return {
      valid: false,
      statusCode: 422,
      message: "Descricao obrigatoria.",
    };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      valid: false,
      statusCode: 422,
      message: "Valor invalido. Use um numero maior que 0.",
    };
  }

  if (!ALLOWED_TYPES.has(type)) {
    return {
      valid: false,
      statusCode: 422,
      message: "Tipo invalido. Use income ou expense.",
    };
  }

  return {
    valid: true,
    payload: {
      description,
      amount,
      type,
    },
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return preflight(event);
  }

  if (!["GET", "POST", "DELETE"].includes(event.httpMethod)) {
    return json(event, 405, {
      success: false,
      message: "Metodo invalido. Use GET, POST ou DELETE.",
    });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    await cleanupExpiredSessions(sql);

    const user = await getAuthenticatedUser(event, sql);
    if (!user) return unauthorized(event);
    const userId = Number(user.id);

    if (event.httpMethod === "GET") {
      const rows = await sql`
        SELECT id, description, amount::float8 AS amount, type, created_at
        FROM transactions
        WHERE user_id = ${userId}
        ORDER BY created_at DESC, id DESC
      `;

      return json(event, 200, {
        success: true,
        transactions: rows.map(sanitizeTransaction),
      });
    }

    if (event.httpMethod === "POST") {
      const body = parseRequestBody(event);
      const validation = validateTransactionInput(body);
      if (!validation.valid) {
        return json(event, validation.statusCode, {
          success: false,
          message: validation.message,
        });
      }

      const inserted = await sql`
        INSERT INTO transactions (user_id, description, amount, type)
        VALUES (${userId}, ${validation.payload.description}, ${validation.payload.amount}, ${validation.payload.type})
        RETURNING id, description, amount::float8 AS amount, type, created_at
      `;

      return json(event, 201, {
        success: true,
        transaction: sanitizeTransaction(inserted[0]),
      });
    }

    const body = parseRequestBody(event);
    const fromQuery = event.queryStringParameters?.id;
    const txId = Number(body.id ?? fromQuery);

    if (!Number.isInteger(txId) || txId <= 0) {
      return json(event, 422, {
        success: false,
        message: "ID da transacao invalido.",
      });
    }

    const removed = await sql`
      DELETE FROM transactions
      WHERE id = ${txId}
        AND user_id = ${userId}
      RETURNING id
    `;

    if (!removed[0]) {
      return json(event, 404, {
        success: false,
        message: "Transacao nao encontrada.",
      });
    }

    return json(event, 200, {
      success: true,
      removed_id: txId,
    });
  } catch (error) {
    console.error("transactions error", error);
    return json(event, 500, {
      success: false,
      message: "Erro ao processar transacoes.",
    });
  }
};
