const form = document.querySelector("#form");

if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fields = [
      {
        id: "name",
        label: "Nome",
        validator: nameIsValid,
      },
      {
        id: "last_name",
        label: "Sobrenome",
        validator: nameIsValid,
      },
      {
        id: "birthdate",
        label: "Nascimento",
        validator: dateIsValid,
      },
      {
        id: "email",
        label: "E-mail",
        validator: emailIsValid,
      },
      {
        id: "password",
        label: "Senha",
        validator: passwordIsSecure,
      },
      {
        id: "confirm_password",
        label: "Confirmar senha",
        validator: passwordMatch,
      },
    ];

    const errorIcon = '<i class="fa-solid fa-circle-exclamation"></i>';
    let formIsValid = true;

    for (const field of fields) {
      const input = document.getElementById(field.id);
      const inputBox = input.closest(".input-box");
      const inputValue = input.value;

      const errorSpan = inputBox.querySelector(".error");
      errorSpan.innerHTML = "";

      const fieldValidator = field.validator(inputValue);

      if (!fieldValidator.isValid) {
        errorSpan.innerHTML = `${errorIcon} ${fieldValidator.errorMessage}`;
        inputBox.classList.add("invalid");
        inputBox.classList.remove("valid");
        formIsValid = false;
      } else {
        inputBox.classList.remove("invalid");
        inputBox.classList.add("valid");
      }
    }

    const genders = document.getElementsByName("gender");
    const radioContainer = document.querySelector(".radio-container");
    const genderErrorSpan = radioContainer.querySelector(".error");
    const selectedGender = [...genders].find((input) => input.checked);

    if (!selectedGender) {
      radioContainer.classList.add("invalid");
      radioContainer.classList.remove("valid");
      genderErrorSpan.innerHTML = `${errorIcon} Selecione um gênero!`;
      formIsValid = false;
    } else {
      radioContainer.classList.add("valid");
      radioContainer.classList.remove("invalid");
      genderErrorSpan.innerHTML = "";
    }

    if (!formIsValid) return;

    await submitRegistration(form);
  });
}

function isEmpty(value) {
  return value.trim() === "";
}

function nameIsValid(value) {
  const validator = {
    isValid: true,
    errorMessage: null,
  };

  if (isEmpty(value)) {
    validator.isValid = false;
    validator.errorMessage = "O campo é obrigatório!";
    return validator;
  }

  const min = 3;
  if (value.length < min) {
    validator.isValid = false;
    validator.errorMessage = `O nome deve ter no mínimo ${min} caracteres!`;
    return validator;
  }

  const regex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
  if (!regex.test(value)) {
    validator.isValid = false;
    validator.errorMessage = "Use apenas letras, espaço, apóstrofo e hífen!";
  }

  return validator;
}

function dateIsValid(value) {
  const validator = {
    isValid: true,
    errorMessage: null,
  };

  if (isEmpty(value)) {
    validator.isValid = false;
    validator.errorMessage = "O nascimento é obrigatório!";
    return validator;
  }

  const year = new Date(value).getFullYear();

  if (year < 1920 || year > new Date().getFullYear()) {
    validator.isValid = false;
    validator.errorMessage = "Data inválida!";
    return validator;
  }

  return validator;
}

function emailIsValid(value) {
  const validator = {
    isValid: true,
    errorMessage: null,
  };

  if (isEmpty(value)) {
    validator.isValid = false;
    validator.errorMessage = "O e-mail é obrigatório!";
    return validator;
  }

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!regex.test(value)) {
    validator.isValid = false;
    validator.errorMessage = "O e-mail precisa ser válido!";
    return validator;
  }

  return validator;
}

function passwordIsSecure(value) {
  const validator = {
    isValid: true,
    errorMessage: null,
  };

  if (isEmpty(value)) {
    validator.isValid = false;
    validator.errorMessage = "O senha é obrigatória!";
    return validator;
  }

  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;

  if (!regex.test(value)) {
    validator.isValid = false;
    validator.errorMessage = `
            Sua senha deve conter ao menos: <br/>
            8 dígitos <br/>
            1 letra minúscula <br/>
            1 letra maiúscula  <br/>
            1 número </br>
            1 caractere especial!
        `;
    return validator;
  }

  return validator;
}

function passwordMatch(value) {
  const validator = {
    isValid: true,
    errorMessage: null,
  };

  const passwordValue = document.getElementById("password").value;

  if (value === "" || passwordValue !== value) {
    validator.isValid = false;
    validator.errorMessage = "Senhas não condizem!";
    return validator;
  }

  return validator;
}

const passwordIcons = document.querySelectorAll(".password-icon");

passwordIcons.forEach((icon) => {
  icon.addEventListener("click", function () {
    const input = this.parentElement.querySelector(".form-control");
    input.type = input.type === "password" ? "text" : "password";
    this.classList.toggle("fa-eye");
  });
});

async function submitRegistration(formElement) {
  const submitButton = formElement.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  const apiPrefix =
    window.FinanceApi?.resolveApiBase(formElement.dataset.apiPrefix || "") ||
    (formElement.dataset.apiPrefix || "");
  const endpoint = formElement.getAttribute("action") || "salvar";
  const submitRequest = buildApiRequest(endpoint, apiPrefix);

  try {
    const response = await fetch(submitRequest.url, {
      method: "POST",
      credentials: submitRequest.credentials,
      body: new URLSearchParams(new FormData(formElement)),
    });
    const rawResponse = await response.text();
    const message = rawResponse.trim();
    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    // Se o endpoint não executar, alguns hosts retornam código-fonte em vez de JSON.
    if (message.startsWith("<?php")) {
      throw new Error(
        "Backend não executou o endpoint da API.",
      );
    }

    const startsWithHtml = /^<!doctype html|^<html/i.test(message);
    if (startsWithHtml || (contentType.includes("text/html") && message.startsWith("<"))) {
      throw new Error(
        "Servidor retornou HTML em vez de JSON. Verifique a rota da API no deploy.",
      );
    }

    let payload = null;
    try {
      payload = JSON.parse(message);
    } catch (_) {
      throw new Error("Resposta inválida do servidor. Esperado JSON do backend.");
    }

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Falha ao cadastrar.");
    }

    if (!payload.inserted_id) {
      throw new Error("Cadastro sem confirmação de insert no banco.");
    }

    alert(payload.message || "Conta criada com sucesso!");
    const redirect = formElement.dataset.successRedirect || "../index.html";
    window.location.href = redirect;
  } catch (error) {
    alert(error.message || "Erro ao enviar cadastro.");
  } finally {
    submitButton.disabled = false;
  }
}

function buildApiRequest(endpoint, fallbackPrefix = "") {
  const api = window.FinanceApi;
  const url = api?.buildApiUrl
    ? api.buildApiUrl(endpoint, fallbackPrefix)
    : new URL(endpoint, window.location.href).toString();
  const credentials = api?.getCredentialsMode
    ? api.getCredentialsMode(url)
    : "same-origin";

  return { url, credentials };
}
