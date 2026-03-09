const { getEnv } = require("./env");
const { getHeaderCaseInsensitive } = require("./http");

function normalizeBaseUrl(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  return input.replace(/\/+$/, "");
}

function normalizeOriginHeader(value) {
  const input = String(value || "").trim();
  if (!input) return "";

  try {
    const url = new URL(input);
    return normalizeBaseUrl(url.origin);
  } catch (_) {
    return "";
  }
}

function buildBaseUrlFromEvent(event) {
  const host = getHeaderCaseInsensitive(event.headers, "x-forwarded-host")
    || getHeaderCaseInsensitive(event.headers, "host");
  const proto = getHeaderCaseInsensitive(event.headers, "x-forwarded-proto") || "https";

  if (!host) return "";
  return normalizeBaseUrl(`${proto}://${host}`);
}

function getFrontendBaseUrl(event) {
  const fromOrigin = normalizeOriginHeader(getHeaderCaseInsensitive(event.headers, "origin"));
  if (fromOrigin) return fromOrigin;

  const explicit = normalizeBaseUrl(getEnv("APP_FRONTEND_URL", ""));
  if (explicit) return explicit;

  const fromUrlVar = normalizeBaseUrl(getEnv("URL", ""));
  if (fromUrlVar) return fromUrlVar;

  return buildBaseUrlFromEvent(event);
}

function buildResetPasswordUrl(event, token) {
  const base = getFrontendBaseUrl(event);
  if (!base) return "";
  return `${base}/login-dash/reset-password.html?token=${encodeURIComponent(String(token))}`;
}

module.exports = {
  getFrontendBaseUrl,
  buildResetPasswordUrl,
};
