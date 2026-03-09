const { getAllowedOrigins, parseOrigin } = require("./env");

function getHeaderCaseInsensitive(headers = {}, name) {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return "";
}

function buildCorsHeaders(event) {
  const requestOrigin = parseOrigin(getHeaderCaseInsensitive(event.headers, "origin"));
  const allowedOrigins = getAllowedOrigins();

  if (!requestOrigin || allowedOrigins.length === 0 || !allowedOrigins.includes(requestOrigin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(event, statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...buildCorsHeaders(event),
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

function preflight(event) {
  return {
    statusCode: 204,
    headers: {
      ...buildCorsHeaders(event),
    },
    body: "",
  };
}

function methodNotAllowed(event, allowedMethod) {
  return json(event, 405, {
    success: false,
    message: `Metodo invalido. Envie via ${allowedMethod}.`,
  });
}

function parseRequestBody(event) {
  if (!event.body) return {};

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  const contentType = String(getHeaderCaseInsensitive(event.headers, "content-type")).toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return {};
    }
  }

  const params = new URLSearchParams(raw);
  const body = {};
  for (const [key, value] of params.entries()) {
    body[key] = value;
  }
  return body;
}

module.exports = {
  getHeaderCaseInsensitive,
  json,
  preflight,
  methodNotAllowed,
  parseRequestBody,
};
