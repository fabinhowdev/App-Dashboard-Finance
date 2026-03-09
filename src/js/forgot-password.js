document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgot_form");
  if (!form) return;

  const apiPrefix = form.dataset.apiPrefix || "";
  const statusMessage = document.getElementById("status_message");
  const debugLinkContainer = document.getElementById("debug_link_container");
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    setDebugLink("");
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(`${apiPrefix}auth_forgot_password.php`, {
        method: "POST",
        credentials: "same-origin",
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

async function parseJsonResponse(response) {
  const text = (await response.text()).trim();
  if (text.startsWith("<?php")) {
    throw new Error("Servidor atual não executa PHP.");
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    throw new Error("Resposta inválida do servidor.");
  }
}

