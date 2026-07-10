const sessionKey = "inforcred:session";
const today = new Date().toISOString().slice(0, 10);
const root = document.getElementById("root");

const icons = {
  dashboard: "▦",
  account: "⌂",
  card: "▣",
  income: "$",
  movement: "↕",
  logout: "⇥",
  user: "◉",
  plus: "+",
};

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

const id = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

const userStoreKey = (email) => `inforcred:data:${email.toLowerCase()}`;

const defaultData = (name) => ({
  accounts: [{ id: id(), name: "Conta principal", bank: "Banco pessoal", balance: 1850, limit: 500 }],
  cards: [{ id: id(), name: "Cartao do dia a dia", brand: "Visa", closingDay: 8, dueDay: 15, limit: 2500, used: 620 }],
  incomes: [{ id: id(), source: `Salario de ${(name || "usuario").split(" ")[0]}`, amount: 3200, day: 5 }],
  transactions: [
    { id: id(), description: "Mercado", type: "saida", amount: 286.5, category: "Alimentacao", date: today },
    { id: id(), description: "Recebimento mensal", type: "entrada", amount: 3200, category: "Renda", date: today },
  ],
});

const state = {
  user: readSession(),
  data: null,
  view: "Resumo",
};

if (state.user) {
  state.data = readData(state.user);
}

function readSession() {
  const raw = localStorage.getItem(sessionKey);
  return raw ? JSON.parse(raw) : null;
}

function readData(user) {
  const key = userStoreKey(user.email);
  const raw = localStorage.getItem(key);
  if (raw) return JSON.parse(raw);
  const seeded = defaultData(user.name);
  localStorage.setItem(key, JSON.stringify(seeded));
  return seeded;
}

function saveData(nextData) {
  state.data = nextData;
  localStorage.setItem(userStoreKey(state.user.email), JSON.stringify(nextData));
  render();
}

function setUser(user) {
  state.user = user;
  state.data = readData(user);
  localStorage.setItem(sessionKey, JSON.stringify(user));
  render();
}

function logout() {
  localStorage.removeItem(sessionKey);
  state.user = null;
  state.data = null;
  render();
}

function render() {
  root.innerHTML = state.user ? shellTemplate() : authTemplate();
  bindEvents();
}

function authTemplate() {
  return `
    <main class="auth-page">
      <section class="auth-brand">
        <div class="brand-mark">▣</div>
        <h1>Inforcred</h1>
        <p>Controle suas contas, cartoes, renda e despesas em uma rotina simples de acompanhar.</p>
        <div class="trust-row">
          <span>✓ Dados locais</span>
          <span>✦ Pronto para evoluir</span>
        </div>
      </section>
      <section class="auth-panel" aria-label="Acesso">
        <div class="segmented">
          <button class="active" data-auth-mode="cadastro">Cadastro</button>
          <button data-auth-mode="login">Login</button>
        </div>
        <form id="auth-form" class="form-stack" data-mode="cadastro">
          <label data-name-field>Nome<input name="name" placeholder="Seu nome" /></label>
          <label>E-mail<input name="email" type="email" placeholder="voce@email.com" required /></label>
          <label>Senha<input name="password" type="password" placeholder="Digite uma senha" required minlength="4" /></label>
          <button class="primary-button" type="submit">${icons.user} <span>Criar conta</span></button>
          <button class="google-button" type="button" id="google-demo"><span>G</span> Continuar com Google</button>
        </form>
      </section>
    </main>
  `;
}

function shellTemplate() {
  const nav = [
    ["Resumo", icons.dashboard],
    ["Contas", icons.account],
    ["Cartoes", icons.card],
    ["Rendas", icons.income],
    ["Movimentos", icons.movement],
  ];

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="logo"><span class="logo-icon">▣</span><strong>Inforcred</strong></div>
        <nav>
          ${nav.map(([label, icon]) => `<button data-view="${label}" class="${state.view === label ? "active" : ""}" title="${label}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join("")}
        </nav>
        <button class="logout" id="logout">${icons.logout} <span>Sair</span></button>
      </aside>
      <main class="workspace">
        <header class="topbar">
          <div><span class="eyebrow">Controle financeiro</span><h2>${state.view}</h2></div>
          <div class="user-chip">${icons.user} <span>${escapeHtml(state.user.name)}</span></div>
        </header>
        ${viewTemplate()}
      </main>
    </div>
  `;
}

function viewTemplate() {
  if (state.view === "Contas") return accountsTemplate();
  if (state.view === "Cartoes") return cardsTemplate();
  if (state.view === "Rendas") return incomesTemplate();
  if (state.view === "Movimentos") return transactionsTemplate();
  return summaryTemplate();
}

function summaryTemplate() {
  const data = state.data;
  const accountBalance = data.accounts.reduce((sum, item) => sum + Number(item.balance), 0);
  const creditAvailable = data.cards.reduce((sum, item) => sum + Math.max(Number(item.limit) - Number(item.used), 0), 0);
  const income = data.incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = data.transactions.filter((item) => item.type === "saida").reduce((sum, item) => sum + Number(item.amount), 0);

  return `
    <section class="content-grid">
      ${metric("Saldo em contas", money(accountBalance), icons.account, "green")}
      ${metric("Limite disponivel", money(creditAvailable), icons.card, "blue")}
      ${metric("Renda mensal", money(income), icons.income, "teal")}
      ${metric("Saidas recentes", money(expenses), "↑", "rose")}
      <section class="wide-panel">
        <div class="panel-title"><h3>Ultimas movimentacoes</h3></div>
        <div class="table-list">
          ${data.transactions.map(transactionRow).join("")}
        </div>
      </section>
    </section>
  `;
}

function metric(title, value, icon, tone) {
  return `<article class="metric ${tone}"><div class="metric-icon">${icon}</div><span>${title}</span><strong>${value}</strong></article>`;
}

function transactionRow(item) {
  const sign = item.type === "entrada" ? "+" : "-";
  const tone = item.type === "entrada" ? "positive" : "negative";
  return `
    <div class="table-row">
      <div><strong>${escapeHtml(item.description)}</strong><span>${escapeHtml(item.category)} - ${formatDate(item.date)}</span></div>
      <b class="${tone}">${sign} ${money(item.amount)}</b>
    </div>
  `;
}

function accountsTemplate() {
  return twoColumnTemplate("account-form", "Nova conta", `
    ${input("name", "Nome", "text")}
    ${input("bank", "Banco", "text")}
    ${input("balance", "Saldo atual", "number")}
    ${input("limit", "Limite/cheque especial", "number")}
  `, "Contas cadastradas", state.data.accounts.map((item) =>
    itemCard(item.name, item.bank, money(item.balance), `Limite: ${money(item.limit)}`)
  ).join(""));
}

function cardsTemplate() {
  return twoColumnTemplate("card-form", "Novo cartao", `
    ${input("name", "Nome", "text")}
    ${input("brand", "Bandeira", "text")}
    ${input("limit", "Limite total", "number")}
    ${input("used", "Valor usado", "number")}
    ${input("closingDay", "Fechamento", "number", "8")}
    ${input("dueDay", "Vencimento", "number", "15")}
  `, "Cartoes cadastrados", state.data.cards.map((item) =>
    itemCard(item.name, `${item.brand} - fecha dia ${item.closingDay}`, money(item.limit - item.used), `Usado: ${money(item.used)} | Vence dia ${item.dueDay}`)
  ).join(""));
}

function incomesTemplate() {
  return twoColumnTemplate("income-form", "Nova renda", `
    ${input("source", "Origem", "text")}
    ${input("amount", "Valor mensal", "number")}
    ${input("day", "Dia de recebimento", "number", "5")}
  `, "Rendas cadastradas", state.data.incomes.map((item) =>
    itemCard(item.source, `Recebe dia ${item.day}`, money(item.amount), "Entrada recorrente")
  ).join(""));
}

function transactionsTemplate() {
  return twoColumnTemplate("transaction-form", "Nova movimentacao", `
    ${input("description", "Descricao", "text")}
    <label>Tipo<select name="type"><option value="saida">Saida</option><option value="entrada">Entrada</option></select></label>
    ${input("amount", "Valor", "number")}
    ${input("category", "Categoria", "text")}
    ${input("date", "Data", "date", today)}
  `, "Historico", state.data.transactions.map((item) =>
    itemCard(item.description, `${item.category} - ${formatDate(item.date)}`, `${item.type === "entrada" ? "+" : "-"} ${money(item.amount)}`, item.type === "entrada" ? "Entrada" : "Saida")
  ).join(""));
}

function twoColumnTemplate(formId, formTitle, fields, listTitle, listContent) {
  return `
    <section class="two-column">
      <form class="entry-panel" id="${formId}">
        <div class="panel-title"><h3>${formTitle}</h3></div>
        ${fields}
        <button class="primary-button" type="submit">${icons.plus} <span>Adicionar</span></button>
      </form>
      <section class="list-panel">
        <div class="panel-title"><h3>${listTitle}</h3></div>
        <div class="card-list">${listContent || `<p class="empty-state">Nenhum item cadastrado ainda.</p>`}</div>
      </section>
    </section>
  `;
}

function input(name, label, type, value = "") {
  const step = type === "number" ? ' min="0" step="0.01"' : "";
  return `<label>${label}<input name="${name}" type="${type}" value="${value}"${step} required /></label>`;
}

function itemCard(title, meta, value, detail) {
  return `
    <article class="item-card">
      <div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(meta)}</span></div>
      <div class="item-value"><b>${escapeHtml(value)}</b><span>${escapeHtml(detail)}</span></div>
    </article>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
  });

  document.getElementById("auth-form")?.addEventListener("submit", handleAuth);
  document.getElementById("google-demo")?.addEventListener("click", () => {
    setUser({ name: "Conta Google", email: "google.demo@inforcred.local" });
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
    });
  });

  document.getElementById("logout")?.addEventListener("click", logout);
  document.getElementById("account-form")?.addEventListener("submit", addAccount);
  document.getElementById("card-form")?.addEventListener("submit", addCard);
  document.getElementById("income-form")?.addEventListener("submit", addIncome);
  document.getElementById("transaction-form")?.addEventListener("submit", addTransaction);
}

function setAuthMode(mode) {
  const form = document.getElementById("auth-form");
  const nameField = document.querySelector("[data-name-field]");
  document.querySelectorAll("[data-auth-mode]").forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
  form.dataset.mode = mode;
  form.querySelector(".primary-button span").textContent = mode === "cadastro" ? "Criar conta" : "Entrar";
  nameField.hidden = mode === "login";
}

function handleAuth(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = String(form.get("email") || "").trim().toLowerCase();
  const name = String(form.get("name") || "").trim() || email.split("@")[0] || "Usuario";
  setUser({ name, email });
}

function addAccount(event) {
  event.preventDefault();
  const form = formValues(event.currentTarget);
  saveData({
    ...state.data,
    accounts: [...state.data.accounts, { id: id(), name: form.name, bank: form.bank, balance: Number(form.balance), limit: Number(form.limit) }],
  });
}

function addCard(event) {
  event.preventDefault();
  const form = formValues(event.currentTarget);
  saveData({
    ...state.data,
    cards: [...state.data.cards, { id: id(), name: form.name, brand: form.brand, limit: Number(form.limit), used: Number(form.used), closingDay: Number(form.closingDay), dueDay: Number(form.dueDay) }],
  });
}

function addIncome(event) {
  event.preventDefault();
  const form = formValues(event.currentTarget);
  saveData({
    ...state.data,
    incomes: [...state.data.incomes, { id: id(), source: form.source, amount: Number(form.amount), day: Number(form.day) }],
  });
}

function addTransaction(event) {
  event.preventDefault();
  const form = formValues(event.currentTarget);
  saveData({
    ...state.data,
    transactions: [{ id: id(), description: form.description, type: form.type, amount: Number(form.amount), category: form.category, date: form.date }, ...state.data.transactions],
  });
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
