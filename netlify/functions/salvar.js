const bcrypt = require("bcryptjs");
const { ensureSchema, getSql } = require("./_lib/db");
const { json, methodNotAllowed, parseRequestBody, preflight } = require("./_lib/http");

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
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
    const body = parseRequestBody(event);

    const nome = String(body.name || "").trim();
    const sobrenome = String(body.last_name || "").trim();
    const nascimento = String(body.birthdate || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const senha = String(body.password || "");
    const confirmar = String(body.confirm_password || "");
    const genero = String(body.gender || "").trim();

    if (!nome || !sobrenome || !nascimento || !email || !senha || !confirmar || !genero) {
      return json(event, 422, {
        success: false,
        message: "Preencha todos os campos obrigatorios.",
      });
    }

    if (!isEmailValid(email)) {
      return json(event, 422, {
        success: false,
        message: "E-mail invalido.",
      });
    }

    if (senha !== confirmar) {
      return json(event, 422, {
        success: false,
        message: "As senhas nao coincidem.",
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const inserted = await sql`
      INSERT INTO users (nome, sobrenome, nascimento, email, senha_hash, genero)
      VALUES (${nome}, ${sobrenome}, ${nascimento}, ${email}, ${senhaHash}, ${genero})
      RETURNING id
    `;

    const insertedId = inserted[0]?.id;
    if (!insertedId) {
      throw new Error("Insert sem id retornado.");
    }

    return json(event, 201, {
      success: true,
      message: "Conta criada com sucesso!",
      inserted_id: Number(insertedId),
    });
  } catch (error) {
    console.error("salvar error", error);

    if (error?.code === "23505") {
      return json(event, 409, {
        success: false,
        message: "Este e-mail ja esta cadastrado.",
      });
    }

    return json(event, 500, {
      success: false,
      message: "Erro ao salvar no banco.",
    });
  }
};
