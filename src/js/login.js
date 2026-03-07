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
});

export {};
