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
  const balance = transactions.reduce(
    (acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount),
    0,
  );
  balanceEl.textContent = balance.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Receitas", "Despesas"],
      datasets: [
        {
          data: [income, expense],
          backgroundColor: ["#22c55e", "#ef4444"],
        },
      ],
    },
  });
}

function render() {
  listEl.innerHTML = "";

  transactions.forEach((t, index) => {
    const li = document.createElement("li");

    const text = document.createElement("span");
    text.textContent = `${t.description} - ${t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-btn";
    btn.dataset.index = String(index);
    btn.setAttribute("aria-label", `Remover transação ${t.description}`);
    btn.textContent = "X";

    li.appendChild(text);
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
