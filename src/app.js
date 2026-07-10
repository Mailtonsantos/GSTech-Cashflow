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
  editing: {},
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
  state.repository.setSnapshot(state.data);
  state.loading = false;

  if (persistSession) {
    AuthService.saveSession(user);
  }

  render();
}

async function refreshData() {
  state.data = await state.repository.getSnapshot();
  state.repository.setSnapshot(state.data);
  render();
}

function logout() {
  AuthService.clearSession();
  state.user = null;
  state.repository = null;
  state.data = null;
  state.view = "Resumo";
  state.editing = {};
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
      <img class="brand-logo-mark" src="./assets/gstech-logo.png" alt="GSTec Consultoria e Informatica" />
      <h1>GSTec Cashflow</h1>
      <p>Preparando seu banco local...</p>
    </main>
  `;
}

function authTemplate() {
  return `
    <main class="auth-page">
      <section class="auth-brand">
        <img class="brand-logo-mark" src="./assets/gstech-logo.png" alt="GSTec Consultoria e Informatica" />
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
    ["Categorias", icons.movement],
    ["Movimentos", icons.movement],
  ];

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="logo"><img class="logo-image" src="./assets/gstech-logo.png" alt="GSTec" /><strong>GSTec Cashflow</strong></div>
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
  if (state.view === "Categorias") return categoriesTemplate();
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
  const editing = editingItem("accounts");
  return twoColumnTemplate("account-form", editing ? "Editar conta" : "Nova conta", `
    ${hiddenId(editing)}
    ${input("name", "Nome", "text", editing?.name)}
    ${input("bank", "Banco", "text", editing?.bank)}
    <div class="form-grid">
      ${input("agency", "Agencia", "text", editing?.agency)}
      ${input("accountNumber", "Conta", "text", editing?.accountNumber)}
      ${input("accountDigit", "Digito", "text", editing?.accountDigit)}
    </div>
    <label>Tipo
      <select name="type">
        ${option("carteira", "Carteira", editing?.type)}
        ${option("corrente", "C/C", editing?.type)}
        ${option("poupanca", "Poupanca", editing?.type)}
        ${option("investimento", "Investimentos", editing?.type)}
        ${option("outros", "Outros", editing?.type)}
      </select>
    </label>
    ${input("balance", "Saldo atual", "number", editing?.balance)}
    ${input("limit", "Limite/cheque especial", "number", editing?.limit)}
    ${textarea("note", "Observacoes", editing?.note)}
  `, "Contas cadastradas", state.data.accounts.map((item) =>
    itemCard("accounts", item.id, item.name, `${accountTypeLabel(item.type)} | ${item.bank || "Sem banco"}`, money(item.balance), `Ag ${item.agency || "-"} | Conta ${item.accountNumber || "-"} | Limite: ${money(item.limit)}`, item.note)
  ).join(""), editing);
}

function cardsTemplate() {
  const editing = editingItem("cards");
  return twoColumnTemplate("card-form", editing ? "Editar cartao" : "Novo cartao", `
    ${hiddenId(editing)}
    ${input("name", "Nome", "text", editing?.name)}
    <label>Bandeira
      <select name="brand">
        ${state.data.brands.map((brand) => option(brand.nome, brand.nome, editing?.brand)).join("")}
      </select>
    </label>
    <div class="form-grid">
      <label>Tipo do cartao
        <select name="cardType">
          ${option("credito", "Credito", editing?.cardType)}
          ${option("debito", "Debito", editing?.cardType)}
          ${option("credito_debito", "Credito/Debito", editing?.cardType)}
        </select>
      </label>
      <label>Status
        <select name="status">
          ${option("ativo", "Ativo", editing?.status)}
          ${option("bloqueado", "Bloqueado", editing?.status)}
        </select>
      </label>
    </div>
    ${input("number", "Numero do cartao", "text", editing?.number)}
    ${input("validity", "Validade", "text", editing?.validity)}
    ${input("limit", "Limite total", "number", editing?.limit)}
    <div class="form-grid">
      ${input("closingDay", "Fechamento", "number", editing?.closingDay || "8")}
      ${input("dueDay", "Vencimento", "number", editing?.dueDay || "15")}
    </div>
    ${textarea("note", "Observacoes", editing?.note)}
  `, "Cartoes cadastrados", state.data.cards.map((item) =>
    itemCard("cards", item.id, item.name, `${item.brand || "Sem bandeira"} | ${cardTypeLabel(item.cardType)} | ${statusLabel(item.status)}`, money(item.limit - item.used), `Numero: ${item.number || "-"} | Val: ${item.validity || "-"} | Vence dia ${item.dueDay}`, item.note)
  ).join(""), editing);
}

function incomesTemplate() {
  const editing = editingItem("incomes");
  return twoColumnTemplate("income-form", editing ? "Editar renda" : "Nova renda", `
    ${hiddenId(editing)}
    ${input("source", "Origem/descricao", "text", editing?.source)}
    <label>Tipo de renda
      <select name="incomeType">
        ${option("clt", "CLT", editing?.incomeType)}
        ${option("pf", "PF", editing?.incomeType)}
        ${option("informal", "Informal", editing?.incomeType)}
        ${option("outros", "Outros", editing?.incomeType)}
      </select>
    </label>
    ${input("company", "Empresa de origem", "text", editing?.company)}
    ${input("amount", "Valor mensal", "number", editing?.amount)}
    ${input("date", "Data de recebimento", "date", editing?.date || today)}
    <label class="checkbox-row"><input name="recurrent" type="checkbox" value="1" ${editing?.recurrent === false ? "" : "checked"} /> Renda recorrente</label>
    ${textarea("note", "Observacoes", editing?.note)}
  `, "Rendas cadastradas", state.data.incomes.map((item) =>
    itemCard("incomes", item.id, item.source, `${incomeTypeLabel(item.incomeType)} | ${item.company || "Sem empresa"}`, money(item.amount), item.recurrent ? "Entrada recorrente" : "Entrada eventual", item.note)
  ).join(""), editing);
}

function categoriesTemplate() {
  const editingCategory = editingItem("categories");
  const editingBrand = editingItem("brands");

  return `
    <section class="two-column">
      <form class="entry-panel" id="category-form">
        <div class="panel-title"><h3>${editingCategory ? "Editar categoria" : "Nova categoria"}</h3></div>
        ${hiddenId(editingCategory)}
        ${input("name", "Nome", "text", editingCategory?.nome)}
        <label>Tipo
          <select name="type">
            ${option("saida", "Saida", editingCategory?.tipo)}
            ${option("entrada", "Entrada", editingCategory?.tipo)}
            ${option("ambos", "Ambos", editingCategory?.tipo)}
          </select>
        </label>
        ${textarea("note", "Observacoes", editingCategory?.observacao)}
        <div class="button-row">
          <button class="primary-button" type="submit">${icons.plus} <span>${editingCategory ? "Salvar categoria" : "Adicionar categoria"}</span></button>
          ${editingCategory ? `<button class="ghost-button" type="button" data-action="cancel-edit">Cancelar</button>` : ""}
        </div>
      </form>
      <form class="entry-panel" id="brand-form">
        <div class="panel-title"><h3>${editingBrand ? "Editar bandeira" : "Nova bandeira"}</h3></div>
        ${hiddenId(editingBrand)}
        ${input("name", "Nome", "text", editingBrand?.nome)}
        ${textarea("note", "Observacoes", editingBrand?.observacao)}
        <div class="button-row">
          <button class="primary-button" type="submit">${icons.plus} <span>${editingBrand ? "Salvar bandeira" : "Adicionar bandeira"}</span></button>
          ${editingBrand ? `<button class="ghost-button" type="button" data-action="cancel-edit">Cancelar</button>` : ""}
        </div>
      </form>
      <section class="list-panel">
        <div class="panel-title"><h3>Categorias cadastradas</h3></div>
        <div class="card-list">
          ${state.data.categories.map((item) => catalogCard("categories", item.id, item.nome, categoryTypeLabel(item.tipo), item.observacao, Boolean(item.user_id))).join("")}
        </div>
      </section>
      <section class="list-panel">
        <div class="panel-title"><h3>Bandeiras cadastradas</h3></div>
        <div class="card-list">
          ${state.data.brands.map((item) => catalogCard("brands", item.id, item.nome, item.user_id ? "Personalizada" : "Padrao do sistema", item.observacao, Boolean(item.user_id))).join("")}
        </div>
      </section>
    </section>
  `;
}

function transactionsTemplate() {
  const editing = editingItem("transactions");
  return twoColumnTemplate("transaction-form", editing ? "Editar movimentacao" : "Nova movimentacao", `
    ${hiddenId(editing)}
    ${input("description", "Descricao", "text", editing?.description)}
    <label>Tipo<select name="type">${option("saida", "Saida", editing?.type)}${option("entrada", "Entrada", editing?.type)}</select></label>
    ${input("amount", "Valor", "number", editing?.amount)}
    <label>Categoria
      <select name="categoryId">
        <option value="">Selecione</option>
        ${state.data.categories.map((category) => option(category.id, `${category.nome} (${categoryTypeLabel(category.tipo)})`, editing?.categoryId)).join("")}
      </select>
    </label>
    <label>Forma/Destino
      <select name="paymentTarget">
        ${option("conta", "Conta/Debito", editing?.paymentTarget)}
        ${option("cartao", "Cartao de credito", editing?.paymentTarget)}
      </select>
    </label>
    <label>Cartao
      <select name="cardId">
        <option value="">Sem cartao</option>
        ${state.data.cards.map((card) => option(card.id, card.name, editing?.cardId)).join("")}
      </select>
    </label>
    ${input("date", "Data", "date", editing?.date || today)}
    ${textarea("note", "Observacoes", editing?.note)}
  `, "Historico", state.data.transactions.map((item) =>
    itemCard("transactions", item.id, item.description, `${item.category || "Sem categoria"} - ${formatDate(item.date)}`, `${item.type === "entrada" ? "+" : "-"} ${money(item.amount)}`, item.type === "entrada" ? "Entrada" : "Saida", item.note)
  ).join(""), editing);
}

function twoColumnTemplate(formId, formTitle, fields, listTitle, listContent, editing = null) {
  return `
    <section class="two-column">
      <form class="entry-panel" id="${formId}">
        <div class="panel-title"><h3>${formTitle}</h3></div>
        ${fields}
        <div class="button-row">
          <button class="primary-button" type="submit">${icons.plus} <span>${editing ? "Salvar alteracoes" : "Adicionar"}</span></button>
          ${editing ? `<button class="ghost-button" type="button" data-action="cancel-edit">Cancelar</button>` : ""}
        </div>
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
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeAttribute(value ?? "")}"${step} ${type === "text" ? "" : "required"} /></label>`;
}

function textarea(name, label, value = "") {
  return `<label>${label}<textarea name="${name}" rows="3">${escapeHtml(value ?? "")}</textarea></label>`;
}

function hiddenId(item) {
  return item ? `<input name="id" type="hidden" value="${escapeAttribute(item.id)}" />` : "";
}

function option(value, label, selectedValue = "") {
  return `<option value="${escapeAttribute(value)}" ${String(value) === String(selectedValue || "") ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function editingItem(kind) {
  const id = state.editing[kind];
  return id ? state.data[kind].find((item) => item.id === id) : null;
}

function itemCard(kind, id, title, meta, value, detail, note = "") {
  return `
    <article class="item-card">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(meta)}</span>
        ${note ? `<small>${escapeHtml(note)}</small>` : ""}
      </div>
      <div class="item-value">
        <b>${escapeHtml(value)}</b>
        <span>${escapeHtml(detail)}</span>
        ${actionButtons(kind, id)}
      </div>
    </article>
  `;
}

function catalogCard(kind, id, title, meta, note = "", isCustom = false) {
  return `
    <article class="item-card">
      <div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(meta)}</span>${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>
      <div class="item-value">
        <b>${isCustom ? "Personalizado" : "Padrao"}</b>
        ${actionButtons(kind, id)}
      </div>
    </article>
  `;
}

function actionButtons(kind, id) {
  return `
    <div class="card-actions flex flex-row items-center gap-2" aria-label="Acoes do cadastro">
      <button class="icon-action" type="button" data-action="edit" data-kind="${kind}" data-id="${escapeAttribute(id)}" title="Editar" aria-label="Editar">
        <span aria-hidden="true">✎</span>
      </button>
      <button class="icon-action danger" type="button" data-action="delete" data-kind="${kind}" data-id="${escapeAttribute(id)}" title="Excluir" aria-label="Excluir">
        <span aria-hidden="true">🗑</span>
      </button>
    </div>
  `;
}

function accountTypeLabel(type) {
  return {
    carteira: "Carteira",
    corrente: "C/C",
    poupanca: "Poupanca",
    investimento: "Investimentos",
    outros: "Outros",
  }[type] || "C/C";
}

function cardTypeLabel(type) {
  return {
    credito: "Credito",
    debito: "Debito",
    credito_debito: "Credito/Debito",
  }[type] || "Credito";
}

function statusLabel(status) {
  return status === "bloqueado" ? "Bloqueado" : "Ativo";
}

function incomeTypeLabel(type) {
  return {
    clt: "CLT",
    pf: "PF",
    informal: "Informal",
    outros: "Outros",
  }[type] || "Outros";
}

function categoryTypeLabel(type) {
  return {
    entrada: "Entrada",
    saida: "Saida",
    ambos: "Ambos",
  }[type] || "Ambos";
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
      state.editing = {};
      render();
    });
  });

  document.getElementById("logout")?.addEventListener("click", logout);
  document.querySelector("[data-action='cancel-edit']")?.addEventListener("click", () => {
    state.editing = {};
    render();
  });
  document.querySelectorAll("[data-action='edit']").forEach((button) => {
    button.addEventListener("click", () => {
      state.editing = { [button.dataset.kind]: button.dataset.id };
      render();
    });
  });
  document.querySelectorAll("[data-action='delete']").forEach((button) => {
    button.addEventListener("click", () => deleteItem(button.dataset.kind, button.dataset.id));
  });
  document.getElementById("account-form")?.addEventListener("submit", addAccount);
  document.getElementById("card-form")?.addEventListener("submit", addCard);
  document.getElementById("income-form")?.addEventListener("submit", addIncome);
  document.getElementById("category-form")?.addEventListener("submit", addCategory);
  document.getElementById("brand-form")?.addEventListener("submit", addBrand);
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
  const values = formValues(event.currentTarget);
  if (values.id) {
    await state.repository.updateBankAccount(values.id, values);
  } else {
    await state.repository.addBankAccount(values);
  }
  state.editing = {};
  await refreshData();
}

async function addCard(event) {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  if (values.id) {
    await state.repository.updateCreditCard(values.id, values);
  } else {
    await state.repository.addCreditCard(values);
  }
  state.editing = {};
  await refreshData();
}

async function addIncome(event) {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  if (values.id) {
    await state.repository.updateIncome(values.id, values);
  } else {
    await state.repository.addIncome(values);
  }
  state.editing = {};
  await refreshData();
}

async function addTransaction(event) {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  if (values.id) {
    await state.repository.updateTransaction(values.id, values);
  } else {
    await state.repository.addTransaction(values);
  }
  state.editing = {};
  await refreshData();
}

async function addCategory(event) {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  if (values.id) {
    await state.repository.updateCategory(values.id, values);
  } else {
    await state.repository.addCategory(values);
  }
  state.editing = {};
  await refreshData();
}

async function addBrand(event) {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  if (values.id) {
    await state.repository.updateBrand(values.id, values);
  } else {
    await state.repository.addBrand(values);
  }
  state.editing = {};
  await refreshData();
}

async function deleteItem(kind, id) {
  if (!id) return;
  const actions = {
    accounts: () => state.repository.deleteBankAccount(id),
    cards: () => state.repository.deleteCreditCard(id),
    incomes: () => state.repository.deleteIncome(id),
    transactions: () => state.repository.deleteTransaction(id),
    categories: () => state.repository.deleteCategory(id),
    brands: () => state.repository.deleteBrand(id),
  };

  await actions[kind]?.();
  state.editing = {};
  await refreshData();
}

function formValues(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  form.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    values[checkbox.name] = checkbox.checked ? "1" : "";
  });
  return values;
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

function escapeAttribute(value) {
  return escapeHtml(value);
}
