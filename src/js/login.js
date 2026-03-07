// Centralized login module for project
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form#form");
  if (!form) return;

  // allow configuring where to redirect after successful login
  const redirect = form.dataset.redirect || "dash-function/dash.html";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = (document.getElementById("email") || {}).value || "";
    const password = (document.getElementById("password") || {}).value || "";

    if (email === "admin@gmail.com" && password === "admin") {
      alert("Login realizado com sucesso!");
      location.href = redirect;
      return;
    }

    alert("Login ou senha incorretos!");
  });

  // Toggle show/hide password from the eye icon
  const passwordIcons = document.querySelectorAll(".password-icon");
  passwordIcons.forEach((icon) => {
    // make the icon keyboard-accessible and announceable
    icon.setAttribute("role", "button");
    icon.setAttribute("tabindex", "0");
    icon.setAttribute("aria-pressed", "false");

    const getInput = () => {
      // input is expected to be the previous sibling inside .input-field
      if (
        icon.previousElementSibling &&
        icon.previousElementSibling.tagName === "INPUT"
      ) {
        return icon.previousElementSibling;
      }
      return icon.parentElement
        ? icon.parentElement.querySelector("input")
        : null;
    };

    const toggle = () => {
      const input = getInput();
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      // swap icon classes between eye and eye-slash
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
});

export {};
