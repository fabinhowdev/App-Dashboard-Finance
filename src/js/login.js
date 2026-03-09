document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form#form");
  if (!form) return;

  const statusMessage = document.getElementById("status_message");
  const redirect = form.dataset.redirect || "dash-function/dash.html";
  const apiPrefix =
    window.FinanceApi?.resolveApiBase(form.dataset.apiPrefix || "") ||
    (form.dataset.apiPrefix || "");
  const submitButton = form.querySelector('button[type="submit"]');
  const loginRequest = buildApiRequest("auth_login.php", apiPrefix);
  const statusRequest = buildApiRequest("auth_status.php", apiPrefix);

  setupPasswordToggle();
  checkExistingSession();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(loginRequest.url, {
        method: "POST",
        credentials: loginRequest.credentials,
        body: new FormData(form),
      });
      const payload = await parseJsonResponse(response);

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Falha no login.");
      }

      setStatus(payload.message || "Login realizado com sucesso!", "success");
      window.location.href = payload.redirect || redirect;
    } catch (error) {
      setStatus(error.message || "Não foi possível fazer login.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  async function checkExistingSession() {
    try {
      const response = await fetch(statusRequest.url, {
        credentials: statusRequest.credentials,
      });
      const payload = await parseJsonResponse(response);

      if (response.ok && payload.authenticated) {
        window.location.href = redirect;
      }
    } catch (_) {
      // Ignora erro de verificação de sessão para não bloquear login manual.
    }
  }

  function setStatus(message, type = "") {
    if (!statusMessage) {
      if (message) alert(message);
      return;
    }

    statusMessage.textContent = message;
    statusMessage.classList.remove("success", "error");
    if (type) statusMessage.classList.add(type);
  }
});

function buildApiRequest(endpoint, fallbackPrefix = "") {
  const api = window.FinanceApi;
  const url = api?.buildApiUrl
    ? api.buildApiUrl(endpoint, fallbackPrefix)
    : new URL(endpoint, new URL(fallbackPrefix || "./", window.location.href)).toString();
  const credentials = api?.getCredentialsMode
    ? api.getCredentialsMode(url)
    : "same-origin";

  return { url, credentials };
}

function setupPasswordToggle() {
  const passwordIcons = document.querySelectorAll(".password-icon");

  passwordIcons.forEach((icon) => {
    icon.setAttribute("role", "button");
    icon.setAttribute("tabindex", "0");
    icon.setAttribute("aria-pressed", "false");

    const toggle = () => {
      const input = icon.parentElement?.querySelector("input");
      if (!input) return;

      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      icon.classList.toggle("fa-eye-slash", !isPassword);
      icon.classList.toggle("fa-eye", isPassword);
      icon.setAttribute("aria-pressed", String(isPassword));
    };

    icon.addEventListener("click", toggle);
    icon.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });
}

async function parseJsonResponse(response) {
  const text = (await response.text()).trim();
  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  if (text.startsWith("<?php")) {
    throw new Error("Servidor atual não executa PHP.");
  }

  const startsWithHtml = /^<!doctype html|^<html/i.test(text);
  if (startsWithHtml || (contentType.includes("text/html") && text.startsWith("<"))) {
    throw new Error(
      "Servidor retornou HTML em vez de JSON. Em deploy estático (ex.: Netlify), o PHP não é executado.",
    );
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    throw new Error("Resposta inválida do servidor. Esperado JSON do backend.");
  }
}
