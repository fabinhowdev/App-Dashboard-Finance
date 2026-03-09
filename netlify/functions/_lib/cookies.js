const { getEnv, getEnvBoolean } = require("./env");
const { getHeaderCaseInsensitive } = require("./http");

function shouldUseSecureCookies(event) {
  const configured = getEnv("COOKIE_SECURE", "");
  if (configured) {
    return getEnvBoolean("COOKIE_SECURE", true);
  }

  const proto = String(getHeaderCaseInsensitive(event.headers, "x-forwarded-proto") || "").toLowerCase();
  return proto.includes("https");
}

function getCookieSameSite() {
  const configured = String(getEnv("COOKIE_SAMESITE", "Lax")).trim();
  if (!configured) return "Lax";

  const normalized = configured.toLowerCase();
  if (normalized === "none") return "None";
  if (normalized === "strict") return "Strict";
  return "Lax";
}

function serializeCookie(event, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  const path = options.path || "/";
  parts.push(`Path=${path}`);
  parts.push("HttpOnly");
  parts.push(`SameSite=${options.sameSite || getCookieSameSite()}`);

  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.expires instanceof Date) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (shouldUseSecureCookies(event)) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function parseCookies(event) {
  const cookieHeader = String(getHeaderCaseInsensitive(event.headers, "cookie") || "");
  if (!cookieHeader) return {};

  const cookies = {};
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.split("=");
    const name = String(rawName || "").trim();
    if (!name) continue;
    const value = rawValueParts.join("=");
    cookies[name] = decodeURIComponent(String(value || "").trim());
  }

  return cookies;
}

module.exports = {
  serializeCookie,
  parseCookies,
};
