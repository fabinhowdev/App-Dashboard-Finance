let transactions = [];
try {
  const raw = localStorage.getItem("transactions");
  transactions = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(transactions)) transactions = [];
  // sanitize stored items
  transactions = transactions
    .map((t) => ({
      description: String(t.description || "").trim(),
      amount: Number(t.amount) || 0,
      type: t.type === "expense" ? "expense" : "income",
    }))
    .filter((t) => t.description && isFinite(t.amount));
} catch (e) {
  transactions = [];
}
let chart;

const loginPage = "../index.html";
const defaultApiPrefix = document.body?.dataset.apiPrefix || "../";
const apiBase =
  window.FinanceApi?.resolveApiBase(defaultApiPrefix) || defaultApiPrefix;
const authStatusRequest = buildApiRequest("auth_status", apiBase);
const logoutRequest = buildApiRequest("auth_logout", apiBase);
const welcomeUserEl = document.getElementById("welcome_user");
const logoutButton = document.getElementById("logout_btn");
const incomeTotalEl = document.getElementById("total_income");
const expenseTotalEl = document.getElementById("total_expense");
const txCountEl = document.getElementById("tx_count");

verifyAuthenticatedUser();
setupLogout();

function parseAmount(value) {
  const normalized = String(value).trim().replace(",", ".");
  return Number(normalized);
}

const balanceEl = document.getElementById("balance");
const listEl = document.getElementById("list");

function save() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function updateBalance() {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = transactions.reduce(
    (acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount),
    0,
  );

  balanceEl.textContent = balance.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  if (incomeTotalEl) {
    incomeTotalEl.textContent = income.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  if (expenseTotalEl) {
    expenseTotalEl.textContent = expense.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  if (txCountEl) {
    txCountEl.textContent = String(transactions.length);
  }
}

function updateChart() {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);

  const ctx = document.getElementById("chart");

  if (chart) chart.destroy();

  const hasValues = income > 0 || expense > 0;

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: hasValues ? ["Receitas", "Despesas"] : ["Sem dados", "Sem dados"],
      datasets: [
        {
          data: hasValues ? [income, expense] : [1, 1],
          backgroundColor: hasValues ? ["#22c55e", "#ef4444"] : ["#e2e8f0", "#f1f5f9"],
          borderWidth: 2,
          borderColor: "#f8fafc",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#334155",
            boxWidth: 14,
            boxHeight: 14,
          },
        },
      },
    },
  });
}

function render() {
  listEl.innerHTML = "";

  if (transactions.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "Nenhuma transação adicionada ainda.";
    listEl.appendChild(li);
    updateBalance();
    updateChart();
    return;
  }

  transactions.forEach((t, index) => {
    const li = document.createElement("li");
    li.className = "transaction-item";

    const info = document.createElement("div");
    info.className = "transaction-info";

    const title = document.createElement("span");
    title.className = "transaction-title";
    title.textContent = t.description;

    const meta = document.createElement("span");
    meta.className = "transaction-meta";
    meta.textContent = t.type === "income" ? "Receita" : "Despesa";

    info.appendChild(title);
    info.appendChild(meta);

    const value = document.createElement("span");
    value.className = `transaction-amount ${t.type}`;
    value.textContent = t.amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-btn";
    btn.dataset.index = String(index);
    btn.setAttribute("aria-label", `Remover transação ${t.description}`);
    btn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

    li.appendChild(info);
    li.appendChild(value);
    li.appendChild(btn);
    listEl.appendChild(li);
  });

  updateBalance();
  updateChart();
}

function removeTransaction(index) {
  transactions.splice(index, 1);
  save();
  render();
}

document.getElementById("form").addEventListener("submit", function (e) {
  e.preventDefault();

  const description = document.getElementById("description").value;
  const amount = parseAmount(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  if (!description || !description.trim()) {
    alert("Por favor insira uma descrição.");
    return;
  }

  if (!isFinite(amount) || amount <= 0) {
    alert("Insira um valor numérico maior que 0.");
    return;
  }

  transactions.push({ description: description.trim(), amount, type });

  save();
  render();
  this.reset();
});

// Allow submitting the form by pressing Enter on inputs/selects
(function enableEnterSubmit() {
  const formEl = document.getElementById("form");
  if (!formEl) return;

  formEl.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;

    const tgt = e.target;
    if (!tgt) return;

    const tag = tgt.tagName;
    if (tag !== "INPUT" && tag !== "SELECT") return;

    // prevent accidental form double firing
    e.preventDefault();

    if (typeof formEl.requestSubmit === "function") {
      formEl.requestSubmit();
    } else {
      const submitBtn = formEl.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
      else formEl.submit();
    }
  });
})();

// Event delegation for remove buttons
listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button.remove-btn");
  if (!btn) return;
  const idx = Number(btn.dataset.index);
  if (Number.isFinite(idx)) removeTransaction(idx);
});

render();

async function verifyAuthenticatedUser() {
  try {
    const response = await fetch(authStatusRequest.url, {
      credentials: authStatusRequest.credentials,
    });
    const data = await response.json();

    if (!response.ok || !data.authenticated) {
      window.location.href = loginPage;
      return;
    }

    if (welcomeUserEl) {
      const nome = data.user?.nome || data.user?.email || "usuário";
      welcomeUserEl.textContent = `Olá, ${nome}`;
    }
  } catch (_) {
    window.location.href = loginPage;
  }
}

function setupLogout() {
  if (!logoutButton) return;

  logoutButton.addEventListener("click", async () => {
    try {
      await fetch(logoutRequest.url, {
        method: "POST",
        credentials: logoutRequest.credentials,
      });
    } catch (_) {
      // Mesmo em falha de rede local, segue para a tela de login.
    }

    window.location.href = loginPage;
  });
}

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
