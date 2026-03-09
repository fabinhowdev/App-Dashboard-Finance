document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reset_form");
  if (!form) return;

  const apiPrefix = form.dataset.apiPrefix || "";
  const statusMessage = document.getElementById("status_message");
  const submitButton = form.querySelector('button[type="submit"]');
  const tokenInput = document.getElementById("token");
  const urlToken = new URLSearchParams(window.location.search).get("token") || "";

  setupPasswordToggle();

  if (!urlToken) {
    setStatus("Link de redefinição inválido.", "error");
    if (submitButton) submitButton.disabled = true;
    return;
  }

  tokenInput.value = urlToken;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    if (submitButton) submitButton.disabled = true;

    const password = (document.getElementById("password") || {}).value || "";
    const confirmPassword =
      (document.getElementById("confirm_password") || {}).value || "";

    if (password !== confirmPassword) {
      setStatus("As senhas não coincidem.", "error");
      if (submitButton) submitButton.disabled = false;
      return;
    }

    try {
      const response = await fetch(`${apiPrefix}auth_reset_password.php`, {
        method: "POST",
        credentials: "same-origin",
        body: new FormData(form),
      });
      const payload = await parseJsonResponse(response);

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Falha ao redefinir a senha.");
      }

      setStatus(payload.message || "Senha redefinida com sucesso.", "success");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    } catch (error) {
      setStatus(error.message || "Não foi possível redefinir sua senha.", "error");
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
});

function setupPasswordToggle() {
  const passwordIcons = document.querySelectorAll(".password-icon");
  passwordIcons.forEach((icon) => {
    const toggle = () => {
      const input = icon.parentElement?.querySelector("input");
      if (!input) return;

      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      icon.classList.toggle("fa-eye-slash", !isPassword);
      icon.classList.toggle("fa-eye", isPassword);
    };

    icon.addEventListener("click", toggle);
  });
}

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

