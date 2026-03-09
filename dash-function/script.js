let transactions = [];
let chart;

const LEGACY_STORAGE_KEY = "transactions";
const loginPage = "../index.html";
const defaultApiPrefix = document.body?.dataset.apiPrefix || "../";
const apiBase =
  window.FinanceApi?.resolveApiBase(defaultApiPrefix) || defaultApiPrefix;
const authStatusRequest = buildApiRequest("auth_status", apiBase);
const logoutRequest = buildApiRequest("auth_logout", apiBase);
const transactionsRequest = buildApiRequest("transactions", apiBase);
const welcomeUserEl = document.getElementById("welcome_user");
const userProfileEl = document.getElementById("user_profile");
const logoutButton = document.getElementById("logout_btn");
const incomeTotalEl = document.getElementById("total_income");
const expenseTotalEl = document.getElementById("total_expense");
const txCountEl = document.getElementById("tx_count");
const balanceEl = document.getElementById("balance");
const listEl = document.getElementById("list");
const formEl = document.getElementById("form");

initDashboard();

function parseAmount(value) {
  const normalized = String(value).trim().replace(",", ".");
  return Number(normalized);
}

function readLegacyTransactions() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];

    return list
      .map((item) => ({
        description: String(item.description || "").trim(),
        amount: Number(item.amount) || 0,
        type: item.type === "expense" ? "expense" : "income",
      }))
      .filter((item) => item.description && Number.isFinite(item.amount) && item.amount > 0);
  } catch (_) {
    return [];
  }
}

function clearLegacyTransactions() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (_) {
    // Ignora falhas do storage para não bloquear o fluxo.
  }
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

  transactions.forEach((t) => {
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
    btn.dataset.id = String(t.id);
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

function toTransactionItem(raw) {
  const id = Number(raw?.id);
  const description = String(raw?.description || "").trim();
  const amount = Number(raw?.amount);
  const type = raw?.type === "expense" ? "expense" : "income";

  if (!Number.isInteger(id) || id <= 0) return null;
  if (!description) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return { id, description, amount, type, created_at: raw?.created_at || null };
}

async function loadTransactions() {
  const response = await fetch(transactionsRequest.url, {
    method: "GET",
    credentials: transactionsRequest.credentials,
  });

  if (response.status === 401) {
    window.location.href = loginPage;
    return;
  }

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Erro ao carregar transações.");
  }

  const items = Array.isArray(data.transactions) ? data.transactions : [];
  transactions = items.map(toTransactionItem).filter(Boolean);
}

async function createTransaction(payload) {
  const response = await fetch(transactionsRequest.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: transactionsRequest.credentials,
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    window.location.href = loginPage;
    return null;
  }

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Erro ao salvar transação.");
  }

  return toTransactionItem(data.transaction);
}

async function deleteTransaction(transactionId) {
  const response = await fetch(transactionsRequest.url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: transactionsRequest.credentials,
    body: JSON.stringify({ id: transactionId }),
  });

  if (response.status === 401) {
    window.location.href = loginPage;
    return;
  }

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Erro ao remover transação.");
  }
}

async function migrateLegacyTransactionsIfNeeded() {
  const legacy = readLegacyTransactions();
  if (legacy.length === 0 || transactions.length > 0) {
    return;
  }

  for (const tx of legacy) {
    await createTransaction(tx);
  }

  clearLegacyTransactions();
  await loadTransactions();
}

async function removeTransaction(transactionId) {
  await deleteTransaction(transactionId);
  transactions = transactions.filter((t) => t.id !== transactionId);
  render();
}

async function verifyAuthenticatedUser() {
  try {
    const response = await fetch(authStatusRequest.url, {
      credentials: authStatusRequest.credentials,
    });
    const data = await response.json();

    if (!response.ok || !data.authenticated) {
      window.location.href = loginPage;
      return false;
    }

    if (welcomeUserEl) {
      const nome = data.user?.nome || data.user?.email || "usuário";
      welcomeUserEl.textContent = `Olá, ${nome}`;
    }

    if (userProfileEl) {
      const genderLabel = formatGenderLabel(data.user?.genero);
      userProfileEl.textContent = genderLabel ? `Gênero: ${genderLabel}` : "";
    }

    return true;
  } catch (_) {
    window.location.href = loginPage;
    return false;
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

function formatGenderLabel(rawGender) {
  const normalizedGender = normalizeGender(rawGender);

  if (normalizedGender === "feminino") return "Feminino";
  if (normalizedGender === "masculino") return "Masculino";
  if (normalizedGender === "outro") return "Outro";
  if (normalizedGender === "nao_informado") return "Prefiro não informar";
  return "";
}

function normalizeGender(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return "";

  const aliases = {
    female: "feminino",
    male: "masculino",
    other: "outro",
    "nao informado": "nao_informado",
    "não informado": "nao_informado",
    "nao-informado": "nao_informado",
    "não-informado": "nao_informado",
    "prefiro-nao-informar": "nao_informado",
    "prefiro_nao_informar": "nao_informado",
    prefer_not_to_say: "nao_informado",
  };

  return aliases[normalized] || normalized;
}

async function initDashboard() {
  if (!(await verifyAuthenticatedUser())) return;

  setupLogout();

  try {
    await loadTransactions();
    await migrateLegacyTransactionsIfNeeded();
  } catch (error) {
    alert(error.message || "Falha ao carregar dados.");
  }

  render();
}

if (formEl) {
  formEl.addEventListener("submit", async function (e) {
    e.preventDefault();

    const description = document.getElementById("description").value;
    const amount = parseAmount(document.getElementById("amount").value);
    const type = document.getElementById("type").value;
    if (!description || !description.trim()) {
      alert("Por favor insira uma descrição.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Insira um valor numérico maior que 0.");
      return;
    }

    const submitButton = formEl.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const created = await createTransaction({
        description: description.trim(),
        amount,
        type,
      });

      if (created) {
        transactions.unshift(created);
        render();
      }

      this.reset();
    } catch (error) {
      alert(error.message || "Erro ao adicionar transação.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });

  // Allow submitting the form by pressing Enter on inputs/selects
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
}

// Event delegation for remove buttons
listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button.remove-btn");
  if (!btn) return;
  const txId = Number(btn.dataset.id);
  if (!Number.isInteger(txId)) return;

  try {
    await removeTransaction(txId);
  } catch (error) {
    alert(error.message || "Erro ao remover transação.");
  }
});
