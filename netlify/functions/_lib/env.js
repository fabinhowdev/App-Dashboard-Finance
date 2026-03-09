function normalize(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function getNetlifyEnv(name) {
  try {
    const netlifyEnv = globalThis.Netlify?.env;
    if (typeof netlifyEnv?.get === "function") {
      const value = netlifyEnv.get(name);
      return normalize(value);
    }
  } catch (_) {
    // Fallback para process.env
  }

  return "";
}

function getEnv(name, fallback = "") {
  const fromNetlify = getNetlifyEnv(name);
  if (fromNetlify !== "") return fromNetlify;

  const fromProcess = normalize(process.env[name]);
  if (fromProcess !== "") return fromProcess;

  return fallback;
}

function getEnvFromList(names, fallback = "") {
  for (const name of names) {
    const value = getEnv(name, "");
    if (value !== "") return value;
  }
  return fallback;
}

function getEnvBoolean(name, fallback = false) {
  const raw = getEnv(name, "");
  if (raw === "") return fallback;

  const value = raw.toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
}

function getEnvNumber(name, fallback) {
  const raw = getEnv(name, "");
  if (raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseOrigin(input) {
  const value = normalize(input);
  if (!value) return "";

  try {
    const url = new URL(value);
    const defaultPort = url.protocol === "https:" ? "443" : "80";
    const hasCustomPort = url.port && url.port !== defaultPort;
    return `${url.protocol}//${url.hostname}${hasCustomPort ? `:${url.port}` : ""}`;
  } catch (_) {
    return "";
  }
}

function getAllowedOrigins() {
  const origins = [];
  const fromFrontend = parseOrigin(getEnv("APP_FRONTEND_URL", ""));
  if (fromFrontend) origins.push(fromFrontend);

  const extra = getEnv("CORS_ALLOW_ORIGINS", "");
  if (extra) {
    for (const item of extra.split(",")) {
      const origin = parseOrigin(item);
      if (origin) origins.push(origin);
    }
  }

  return [...new Set(origins)];
}

module.exports = {
  getEnv,
  getEnvFromList,
  getEnvBoolean,
  getEnvNumber,
  parseOrigin,
  getAllowedOrigins,
};
