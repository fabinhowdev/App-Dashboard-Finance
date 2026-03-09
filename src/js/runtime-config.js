(() => {
  const globalConfig = window;
  // Exemplo em produção: globalConfig.__API_BASE_URL__ = "https://api.seudominio.com/";
  globalConfig.__API_BASE_URL__ = globalConfig.__API_BASE_URL__ || "/.netlify/functions/";

  function normalize(value) {
    return String(value || "").trim();
  }

  function readMetaApiBase() {
    const meta = document.querySelector('meta[name="api-base-url"]');
    return normalize(meta?.content);
  }

  function resolveApiBase(fallback = "") {
    const configured = normalize(globalConfig.__API_BASE_URL__);
    const fromMeta = readMetaApiBase();
    const fromFallback = normalize(fallback);
    return configured || fromMeta || fromFallback || "";
  }

  function buildApiUrl(endpoint, fallbackBase = "") {
    const target = normalize(endpoint);
    if (!target) return "";

    if (/^https?:\/\//i.test(target)) {
      return target;
    }

    const base = resolveApiBase(fallbackBase);
    if (!base) {
      return new URL(target, window.location.href).toString();
    }

    const resolvedBase = new URL(base, window.location.href);
    return new URL(target, resolvedBase).toString();
  }

  function getCredentialsMode(url) {
    try {
      const target = new URL(url, window.location.href);
      return target.origin === window.location.origin ? "same-origin" : "include";
    } catch (_) {
      return "same-origin";
    }
  }

  globalConfig.FinanceApi = {
    resolveApiBase,
    buildApiUrl,
    getCredentialsMode,
  };
})();
