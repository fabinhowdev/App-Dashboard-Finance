document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgot_form");
  if (!form) return;

  const apiPrefix =
    window.FinanceApi?.resolveApiBase(form.dataset.apiPrefix || "") ||
    (form.dataset.apiPrefix || "");
  const statusMessage = document.getElementById("status_message");
  const debugLinkContainer = document.getElementById("debug_link_container");
  const submitButton = form.querySelector('button[type="submit"]');
  const forgotRequest = buildApiRequest("auth_forgot_password.php", apiPrefix);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    setDebugLink("");
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(forgotRequest.url, {
        method: "POST",
        credentials: forgotRequest.credentials,
        body: new FormData(form),
      });
      const payload = await parseJsonResponse(response);

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Falha ao enviar e-mail de recuperação.");
      }

      setStatus(payload.message || "Instruções enviadas para seu e-mail.", "success");
      if (payload.debug_reset_url) {
        setDebugLink(payload.debug_reset_url);
      }
    } catch (error) {
      setStatus(error.message || "Não foi possível processar sua solicitação.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  function setStatus(message, type = "") {
    if (!statusMessage) {
      if (message) alert(message);
      return;
    }

    statusMessage.textContent = message;
    statusMessage.classList.remove("success", "error");
    if (type) statusMessage.classList.add(type);
  }

  function setDebugLink(url) {
    if (!debugLinkContainer) return;
    debugLinkContainer.textContent = "";

    if (!url) return;

    const label = document.createElement("span");
    label.textContent = "Ambiente local detectado. Link de redefinição: ";

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.textContent = "abrir link";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    debugLinkContainer.appendChild(label);
    debugLinkContainer.appendChild(anchor);
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
