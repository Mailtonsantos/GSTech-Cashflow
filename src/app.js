import { FinanceRepository } from "./repositories/financeRepository.js";
import { AuthService } from "./services/authService.js";
import { LocalDatabaseService } from "./services/localDatabase.js";

const today = new Date().toISOString().slice(0, 10);
const root = document.getElementById("root");

const icons = {
  dashboard: "D",
  account: "B",
  card: "C",
  income: "$",
  movement: "M",
  logout: "S",
  user: "U",
  plus: "+",
};

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

const state = {
  user: AuthService.getSession(),
  repository: null,
  data: null,
  view: "Resumo",
  loading: true,
};

bootstrap();

async function bootstrap() {
  if (state.user) {
    await startUserSession(state.user, false);
    return;
  }

  state.loading = false;
  render();
}

async function startUserSession(user, persistSession = true) {
  state.loading = true;
  render();

  const db = await LocalDatabaseService.openForUser(user.id);
  state.repository = new FinanceRepository(db, user);
  await state.repository.ensureUserStructure();

  state.user = user;
  state.data = await state.repository.getSnapshot();
  state.loading = false;

  if (persistSession) {
    AuthService.saveSession(user);
  }

  render();
}

async function refreshData() {
  state.data = await state.repository.getSnapshot();
  render();
}

function logout() {
  AuthService.clearSession();
  state.user = null;
  state.repository = null;
  state.data = null;
  state.view = "Resumo";
  render();
}

function render() {
  if (state.loading) {
    root.innerHTML = loadingTemplate();
    return;
  }

  root.innerHTML = state.user ? shellTemplate() : authTemplate();
  bindEvents();
}

function loadingTemplate() {
  return `
    <main class="loading-page">
      <div class="brand-mark">G</div>
      <h1>GSTec Cashflow</h1>
      <p>Preparando seu banco local...</p>
    </main>
  `;
}

function authTemplate() {
  return `
    <main class="auth-page">
      <section class="auth-brand">
        <div class="brand-mark">G</div>
        <h1>GSTec Cashflow</h1>
        <p>Controle suas contas, cartoes, renda e despesas em uma rotina simples de acompanhar.</p>
        <div class="trust-row">
          <span>OK Dados locais por usuario</span>
          <span>OK Pronto para Google Login</span>
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
        <div class="logo"><span class="logo-icon">G</span><strong>GSTec Cashflow</strong></div>
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
      ${metric("Saidas recentes", money(expenses), "-", "rose")}
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
  document.getElementById("google-demo")?.addEventListener("click", handleGoogleDemo);

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

async function handleAuth(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await startUserSession(AuthService.signInWithEmail({
    name: form.get("name"),
    email: form.get("email"),
  }));
}

async function handleGoogleDemo() {
  await startUserSession(AuthService.signInWithGoogleDemo());
}

async function addAccount(event) {
  event.preventDefault();
  await state.repository.addBankAccount(formValues(event.currentTarget));
  await refreshData();
}

async function addCard(event) {
  event.preventDefault();
  await state.repository.addCreditCard(formValues(event.currentTarget));
  await refreshData();
}

async function addIncome(event) {
  event.preventDefault();
  await state.repository.addIncome(formValues(event.currentTarget));
  await refreshData();
}

async function addTransaction(event) {
  event.preventDefault();
  await state.repository.addTransaction(formValues(event.currentTarget));
  await refreshData();
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
