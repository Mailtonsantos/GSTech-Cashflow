import { FinanceRepository } from "./repositories/financeRepository.js";
import { AuthService } from "./services/authService.js";
import { BackupService } from "./services/backupService.js";
import { LocalDatabaseService } from "./services/localDatabase.js";

const today = new Date().toISOString().slice(0, 10);
const root = document.getElementById("root");

const icons = {
  dashboard: "D",
  account: "B",
  card: "C",
  income: "$",
  movement: "M",
  settings: "&#9881;",
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
  settingsTab: "categories",
  summaryMonth: today.slice(0, 7),
  summaryCardId: "",
  transactionSearch: "",
  transactionSort: "parcel",
  backups: [],
  backupMessage: "",
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
  state.backups = await BackupService.listBackups(user.id);
  if (!state.backups.length) {
    try {
      await createBackup("inicial");
    } catch (error) {
      state.backupMessage = `Nao foi possivel criar backup inicial: ${error.message || error}`;
    }
  }
  state.loading = false;

  if (persistSession) {
    AuthService.saveSession(user);
  }

  render();
}

async function refreshData() {
  state.data = await state.repository.getSnapshot();
  state.repository.setSnapshot(state.data);
  state.backups = await BackupService.listBackups(state.user.id);
  render();
}

async function createBackup(reason = "manual") {
  const snapshot = await state.repository.exportRawSnapshot();
  const backup = await BackupService.createBackup({ user: state.user, snapshot, reason });
  state.backups = await BackupService.listBackups(state.user.id);
  state.backupMessage = `Backup criado em ${formatDateTime(backup.criado_em)}.`;
  return backup;
}

async function refreshDataWithBackup(reason) {
  try {
    await createBackup(reason);
  } catch (error) {
    state.backupMessage = `Nao foi possivel criar backup automatico: ${error.message || error}`;
  }
  await refreshData();
}

function logout() {
  AuthService.clearSession();
  state.user = null;
  state.repository = null;
  state.data = null;
  state.view = "Resumo";
  state.summaryMonth = today.slice(0, 7);
  state.summaryCardId = "";
  state.transactionSearch = "";
  state.transactionSort = "parcel";
  state.backups = [];
  state.backupMessage = "";
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
    ["Resumo", "Resumo", icons.dashboard],
    ["Contas", "Contas", icons.account],
    ["Cartoes", "Cartoes", icons.card],
    ["Rendas", "Rendas", icons.income],
    ["Configuracoes", "Configura&ccedil;&otilde;es", icons.settings],
    ["Movimentos", "Movimentos", icons.movement],
  ];
  const eyebrow = state.view === "Configuracoes" ? "Configura&ccedil;&otilde;es do controle financeiro" : "Controle financeiro";
  const pageTitle = state.view === "Configuracoes" ? "Configura&ccedil;&otilde;es" : state.view;

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="logo"><img class="logo-image" src="./assets/gstech-logo.png" alt="GSTec" /><strong>GSTec Cashflow</strong></div>
        <nav>
          ${nav.map(([view, label, icon]) => `<button data-view="${view}" class="${state.view === view ? "active" : ""}" title="${label}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join("")}
        </nav>
        <button class="logout" id="logout">${icons.logout} <span>Sair</span></button>
      </aside>
      <main class="workspace">
        <header class="topbar">
          <div><span class="eyebrow">${eyebrow}</span><h2>${pageTitle}</h2></div>
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
  if (state.view === "Configuracoes") return categoriesTemplate();
  if (state.view === "Movimentos") return transactionsTemplate();
  return summaryTemplate();
}

function summaryTemplate() {
  const data = state.data;
  const selectedMonth = state.summaryMonth || today.slice(0, 7);
  const selectedCardId = state.summaryCardId || "";
  const monthlyTransactions = data.transactions.filter(
    (item) => monthKey(item.date) === selectedMonth && (!selectedCardId || item.cardId === selectedCardId),
  );
  const selectedCard = data.cards.find((card) => card.id === selectedCardId);
  const accountBalance = data.accounts.reduce((sum, item) => sum + Number(item.balance), 0);
  const creditAvailable = data.cards.reduce((sum, item) => sum + Math.max(Number(item.limit) - Number(item.used), 0), 0);
  const income = data.incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = monthlyTransactions.filter((item) => item.type === "saida").reduce((sum, item) => sum + Number(item.amount), 0);

  return `
    <section class="content-grid">
      ${metric("Saldo em contas", money(accountBalance), icons.account, "green")}
      ${metric("Limite disponivel", money(creditAvailable), icons.card, "blue")}
      ${metric("Renda mensal", money(income), icons.income, "teal")}
      ${metric("Saidas do mes", money(expenses), "-", "rose")}
      <section class="wide-panel">
        <div class="panel-title summary-title">
          <div>
            <h3>Movimentacoes do mes</h3>
            <span>${escapeHtml(monthLabel(selectedMonth))}${selectedCard ? ` | ${escapeHtml(selectedCard.name)}` : " | Todos"}</span>
          </div>
          <div class="summary-filters">
            <label class="month-filter">Mes/Ano
              <input name="summaryMonth" type="month" value="${escapeAttribute(selectedMonth)}" />
            </label>
            <label class="card-filter">Cartao
              <select name="summaryCardId">
                <option value="">Todos</option>
                ${data.cards.map((card) => option(card.id, card.name, selectedCardId)).join("")}
              </select>
            </label>
          </div>
        </div>
        <div class="table-list">
          ${monthlyTransactions.length ? monthlyTransactions.map((item) => transactionRow(item, data.cards)).join("") : `<p class="empty-state">Nenhuma movimentacao neste filtro.</p>`}
        </div>
      </section>
    </section>
  `;
}

function metric(title, value, icon, tone) {
  return `<article class="metric ${tone}"><div class="metric-icon">${icon}</div><span>${title}</span><strong>${value}</strong></article>`;
}

function transactionRow(item, cards = []) {
  const sign = item.type === "entrada" ? "+" : "-";
  const tone = item.type === "entrada" ? "positive" : "negative";
  const card = item.cardId ? cards.find((candidate) => candidate.id === item.cardId) : null;
  const meta = [item.category || "Sem categoria", formatDate(item.date), card ? `Cartao: ${card.name}` : ""].filter(Boolean).join(" - ");
  return `
    <div class="table-row">
      <div><strong>${escapeHtml(item.description)}</strong><span>${escapeHtml(meta)}</span></div>
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
  const editingPaymentMethod = editingItem("paymentMethods");
  const activeTab = state.settingsTab;
  const tabs = [
    ["categories", "Categorias"],
    ["brands", "Bandeiras"],
    ["paymentMethods", "Forma de pagamento"],
    ["backup", "Backup"],
  ];

  return `
    <section class="settings-page">
      <div class="settings-tabs" role="tablist" aria-label="Configuracoes do controle financeiro">
        ${tabs.map(([id, label]) => `<button type="button" data-settings-tab="${id}" class="${activeTab === id ? "active" : ""}" aria-selected="${activeTab === id ? "true" : "false"}">${label}</button>`).join("")}
      </div>
      ${activeTab === "categories" ? settingsSectionTemplate(
        "category-form",
        editingCategory ? "Editar categoria" : "Nova categoria",
        `${hiddenId(editingCategory)}
        ${input("name", "Nome", "text", editingCategory?.nome)}
        <label>Tipo
          <select name="type">
            ${option("saida", "Saida", editingCategory?.tipo)}
            ${option("entrada", "Entrada", editingCategory?.tipo)}
            ${option("ambos", "Ambos", editingCategory?.tipo)}
          </select>
        </label>
        ${textarea("note", "Observacoes", editingCategory?.observacao)}`,
        editingCategory ? "Salvar categoria" : "Adicionar categoria",
        Boolean(editingCategory),
        "Categorias cadastradas",
        state.data.categories.map((item) => catalogCard("categories", item.id, item.nome, categoryTypeLabel(item.tipo), item.observacao, Boolean(item.user_id))).join(""),
      ) : ""}
      ${activeTab === "brands" ? settingsSectionTemplate(
        "brand-form",
        editingBrand ? "Editar bandeira" : "Nova bandeira",
        `${hiddenId(editingBrand)}
        ${input("name", "Nome", "text", editingBrand?.nome)}
        ${textarea("note", "Observacoes", editingBrand?.observacao)}`,
        editingBrand ? "Salvar bandeira" : "Adicionar bandeira",
        Boolean(editingBrand),
        "Bandeiras cadastradas",
        state.data.brands.map((item) => catalogCard("brands", item.id, item.nome, item.user_id ? "Personalizada" : "Padrao do sistema", item.observacao, Boolean(item.user_id))).join(""),
      ) : ""}
      ${activeTab === "paymentMethods" ? settingsSectionTemplate(
        "payment-method-form",
        editingPaymentMethod ? "Editar forma de pagamento" : "Nova forma de pagamento",
        `${hiddenId(editingPaymentMethod)}
        ${input("name", "Nome", "text", editingPaymentMethod?.nome)}
        <label>Comportamento
          <select name="behavior">
            ${option("conta", "Conta/Debito", editingPaymentMethod?.comportamento)}
            ${option("cartao", "Cartao de credito", editingPaymentMethod?.comportamento)}
          </select>
        </label>
        ${textarea("note", "Observacoes", editingPaymentMethod?.observacao)}`,
        editingPaymentMethod ? "Salvar forma" : "Adicionar forma",
        Boolean(editingPaymentMethod),
        "Formas de pagamento",
        state.data.paymentMethods.map((item) => catalogCard("paymentMethods", item.id, item.nome, paymentBehaviorLabel(item.comportamento), item.observacao, Boolean(item.user_id))).join(""),
      ) : ""}
      ${activeTab === "backup" ? backupTemplate() : ""}
    </section>
  `;
}

function backupTemplate() {
  const counts = {
    accounts: state.data.accounts.length,
    cards: state.data.cards.length,
    incomes: state.data.incomes.length,
    transactions: state.data.transactions.length,
  };

  return `
    <section class="backup-page">
      <section class="entry-panel backup-panel">
        <div class="panel-title"><h3>Seguranca dos dados</h3></div>
        <p class="backup-note">Os backups ficam em um banco local separado e tambem podem ser exportados em JSON para guardar fora do navegador.</p>
        <div class="backup-counts">
          <span>Contas: <strong>${counts.accounts}</strong></span>
          <span>Cartoes: <strong>${counts.cards}</strong></span>
          <span>Rendas: <strong>${counts.incomes}</strong></span>
          <span>Movimentos: <strong>${counts.transactions}</strong></span>
        </div>
        ${state.backupMessage ? `<p class="backup-message">${escapeHtml(state.backupMessage)}</p>` : ""}
        <button class="primary-button" type="button" data-backup-action="create">${icons.plus} <span>Criar backup agora</span></button>
        <button class="ghost-button" type="button" data-backup-action="export-latest">Exportar ultimo backup</button>
        <label class="file-button">Importar backup JSON
          <input name="backupFile" type="file" accept="application/json,.json" />
        </label>
      </section>
      <section class="list-panel">
        <div class="panel-title"><h3>Backups disponiveis</h3></div>
        <div class="card-list">
          ${state.backups.length ? state.backups.map(backupCard).join("") : `<p class="empty-state">Nenhum backup local criado ainda.</p>`}
        </div>
      </section>
    </section>
  `;
}

function backupCard(item) {
  const counts = item.counts || {};
  return `
    <article class="item-card">
      <div>
        <strong>${escapeHtml(formatDateTime(item.criado_em))}</strong>
        <span>${escapeHtml(item.reason || "manual")} | Movimentos: ${counts.transactions || 0} | Cartoes: ${counts.cards || 0}</span>
      </div>
      <div class="item-value">
        <b>${escapeHtml(item.user_email || state.user.email || "")}</b>
        <div class="card-actions" aria-label="Acoes do backup">
          <button class="icon-action" type="button" data-backup-action="download" data-backup-id="${escapeAttribute(item.id)}" title="Exportar" aria-label="Exportar">&#8681;</button>
          <button class="icon-action" type="button" data-backup-action="restore" data-backup-id="${escapeAttribute(item.id)}" title="Restaurar" aria-label="Restaurar">&#8634;</button>
          <button class="icon-action danger" type="button" data-backup-action="delete" data-backup-id="${escapeAttribute(item.id)}" title="Excluir backup" aria-label="Excluir backup">&#128465;</button>
        </div>
      </div>
    </article>
  `;
}

function settingsSectionTemplate(formId, formTitle, fields, buttonLabel, editing, listTitle, listContent) {
  return `
    <section class="settings-section">
      <form class="entry-panel" id="${formId}">
        <div class="panel-title"><h3>${formTitle}</h3></div>
        ${fields}
        <div class="button-row">
          <button class="primary-button" type="submit">${icons.plus} <span>${buttonLabel}</span></button>
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

function transactionsTemplate() {
  const editing = editingItem("transactions");
  const selectedPaymentMethodId = editing?.paymentMethodId || "";
  const paymentTarget = paymentMethodBehavior(selectedPaymentMethodId);
  const paymentMode = paymentTarget === "cartao" ? (editing?.paymentMode || "") : "";
  const showCreditFields = paymentTarget === "cartao";
  const showInstallments = showCreditFields && paymentMode === "parcelado";
  const historyTransactions = filterAndSortTransactions(state.data.transactions);
  const historyContent = monthlyTransactionHistory(historyTransactions);
  const historyControls = `
    <div class="history-toolbar">
      <label>Localizar
        <input name="transactionSearch" type="search" placeholder="Descricao, valor, categoria..." value="${escapeAttribute(state.transactionSearch)}" />
      </label>
      <label>Ordenar
        <select name="transactionSort">
          ${option("parcel", "Ordem das parcelas", state.transactionSort)}
          ${option("date_desc", "Data: mais recente", state.transactionSort)}
          ${option("date_asc", "Data: mais antiga", state.transactionSort)}
        </select>
      </label>
    </div>
  `;

  return twoColumnTemplate("transaction-form", editing ? "Editar movimentacao" : "Nova movimentacao", `
    ${hiddenId(editing)}
    ${input("description", "Descricao", "text", editing?.description)}
    <div class="form-grid">
      <label>Tipo<select name="type">${option("saida", "Saida", editing?.type)}${option("entrada", "Entrada", editing?.type)}</select></label>
      <label>Categoria
        <select name="categoryId">
          <option value="">Selecione</option>
          ${state.data.categories.map((category) => option(category.id, `${category.nome} (${categoryTypeLabel(category.tipo)})`, editing?.categoryId)).join("")}
        </select>
      </label>
      <label>Forma de pagamento
        <select name="paymentMethodId">
          <option value="">--</option>
          ${state.data.paymentMethods.map((method) => option(method.id, method.nome, selectedPaymentMethodId)).join("")}
        </select>
      </label>
      <label data-credit-field class="${showCreditFields ? "" : "is-hidden"}">Cartao
        <select name="cardId">
          <option value="">--</option>
          ${state.data.cards.map((card) => option(card.id, card.name, editing?.cardId)).join("")}
        </select>
      </label>
      <label data-credit-field class="${showCreditFields ? "" : "is-hidden"}">Condicao
        <select name="paymentMode">
          <option value="">--</option>
          ${option("avista", "A vista", paymentMode)}
          ${option("parcelado", "Parcelado", paymentMode)}
        </select>
      </label>
      ${installmentsInput(editing, showInstallments)}
      ${input("amount", "Valor", "number", editing?.amount)}
      ${input("date", "Data", "date", editing?.date || today)}
    </div>
    ${textarea("note", "Observacoes", editing?.note)}
  `, "Historico", historyContent, editing, "transaction-layout", historyControls);
}

function twoColumnTemplate(formId, formTitle, fields, listTitle, listContent, editing = null, layoutClass = "", listControls = "") {
  return `
    <section class="two-column ${layoutClass}">
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
        ${listControls}
        <div class="card-list" ${layoutClass.includes("transaction-layout") ? "data-transaction-history" : ""}>${listContent || `<p class="empty-state">${layoutClass.includes("transaction-layout") ? "Nenhum lancamento encontrado." : "Nenhum item cadastrado ainda."}</p>`}</div>
      </section>
    </section>
  `;
}

function monthlyTransactionHistory(transactions) {
  if (!transactions.length) {
    return "";
  }

  return groupTransactionsByMonth(transactions)
    .map(({ key, items }) => {
      const subtotal = items.reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
      return `
        <section class="month-group" aria-label="${escapeAttribute(monthLabel(key))}">
          <div class="month-title">
            <strong>${escapeHtml(monthLabel(key))}</strong>
            <span>${items.length} ${items.length === 1 ? "lancamento" : "lancamentos"}</span>
          </div>
          ${items.map((item) =>
            itemCard("transactions", item.id, item.description, `${item.category || "Sem categoria"} - ${formatDate(item.date)}`, `${item.type === "entrada" ? "+" : "-"} ${money(item.amount)}`, transactionDetail(item), item.note)
          ).join("")}
          <div class="month-subtotal">
            <span>Sub. Total:</span>
            <strong>${money(subtotal)}</strong>
          </div>
        </section>
      `;
    })
    .join("");
}

function filterAndSortTransactions(transactions) {
  const query = normalizeSearch(state.transactionSearch);
  const filtered = query
    ? transactions.filter((item) => transactionMatchesSearch(item, query))
    : [...transactions];

  return sortTransactions(filtered, state.transactionSort);
}

function transactionMatchesSearch(item, query) {
  const amount = Number(item.amount || 0);
  const fields = [
    item.description,
    item.category,
    item.note,
    item.paymentMethodName,
    item.type,
    formatDate(item.date),
    money(amount),
    String(amount).replace(".", ","),
    String(amount),
  ];

  return normalizeSearch(fields.join(" ")).includes(query);
}

function sortTransactions(transactions, sortMode) {
  const items = [...transactions];

  if (sortMode === "date_desc") {
    return items.sort((a, b) => compareByDate(b, a) || compareByParcel(a, b));
  }

  if (sortMode === "date_asc") {
    return items.sort((a, b) => compareByDate(a, b) || compareByParcel(a, b));
  }

  return items.sort((a, b) => compareByParcel(a, b) || compareByDate(b, a));
}

function compareByDate(a, b) {
  return String(a.date || "").localeCompare(String(b.date || ""));
}

function compareByParcel(a, b) {
  const groupA = a.installmentGroupId || a.description || a.id;
  const groupB = b.installmentGroupId || b.description || b.id;
  return String(groupA).localeCompare(String(groupB)) || Number(a.currentInstallment || 1) - Number(b.currentInstallment || 1);
}

function groupTransactionsByMonth(transactions) {
  const groups = new Map();

  transactions.forEach((item) => {
    const key = monthKey(item.date);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  });

  return [...groups.entries()]
    .sort(([a], [b]) => state.transactionSort === "date_asc" ? a.localeCompare(b) : b.localeCompare(a))
    .map(([key, items]) => ({ key, items }));
}

function input(name, label, type, value = "") {
  const step = type === "number" ? ' min="0" step="0.01"' : "";
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeAttribute(value ?? "")}"${step} ${type === "text" ? "" : "required"} /></label>`;
}

function installmentsInput(editing = null, visible = false) {
  const mode = editing?.paymentMode || "";
  const value = mode === "parcelado" ? Math.max(2, Number(editing?.totalInstallments || 2)) : 1;
  const min = mode === "parcelado" ? 2 : 1;
  const readonly = mode === "parcelado" ? "" : "readonly";

  return `
    <label data-installments-field class="${visible ? "" : "is-hidden"}">Numero de parcelas
      <div class="input-suffix">
        <input name="installments" type="number" inputmode="numeric" min="${min}" step="1" value="${value}" ${readonly} required />
        <span>x</span>
      </div>
    </label>
  `;
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

function paymentBehaviorLabel(behavior) {
  return behavior === "cartao" ? "Cartao de credito" : "Conta/Debito";
}

function defaultPaymentMethodId(behavior) {
  const method = state.data.paymentMethods.find((item) => item.comportamento === behavior);
  return method?.id || (behavior === "cartao" ? "default-payment-cartao" : "default-payment-conta");
}

function paymentMethodById(id) {
  return state.data.paymentMethods.find((item) => item.id === id) || null;
}

function paymentMethodBehavior(id) {
  return paymentMethodById(id)?.comportamento || "";
}

function transactionDetail(item) {
  if (Number(item.totalInstallments || 1) > 1) {
    return `Parcela ${item.currentInstallment}/${item.totalInstallments}`;
  }

  if (item.paymentMode === "avista") {
    return item.type === "entrada" ? "Entrada a vista" : "Saida a vista";
  }

  if (item.paymentMode === "parcelado") {
    return "Parcelado";
  }

  return item.type === "entrada" ? "Entrada" : "Saida";
}

function bindEvents() {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
  });

  document.getElementById("auth-form")?.addEventListener("submit", handleAuth);
  document.getElementById("google-demo")?.addEventListener("click", handleGoogleDemo);
  document.querySelector("[name='summaryMonth']")?.addEventListener("change", (event) => {
    state.summaryMonth = event.target.value || today.slice(0, 7);
    render();
  });
  document.querySelector("[name='summaryCardId']")?.addEventListener("change", (event) => {
    state.summaryCardId = event.target.value || "";
    render();
  });
  document.querySelector("[name='transactionSearch']")?.addEventListener("input", (event) => {
    state.transactionSearch = event.target.value;
    refreshTransactionHistory();
  });
  document.querySelector("[name='transactionSort']")?.addEventListener("change", (event) => {
    state.transactionSort = event.target.value || "parcel";
    refreshTransactionHistory();
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      state.editing = {};
      render();
    });
  });

  document.querySelectorAll("[data-settings-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.settingsTab = button.dataset.settingsTab;
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
  document.getElementById("payment-method-form")?.addEventListener("submit", addPaymentMethod);
  document.querySelectorAll("[data-backup-action]").forEach((button) => {
    button.addEventListener("click", () => handleBackupAction(button.dataset.backupAction, button.dataset.backupId));
  });
  document.querySelector("[name='backupFile']")?.addEventListener("change", importBackupFile);
  const transactionForm = document.getElementById("transaction-form");
  transactionForm?.addEventListener("submit", addTransaction);
  bindInstallmentControls(transactionForm);
}

async function handleBackupAction(action, backupId = "") {
  if (action === "create") {
    await createBackup("manual");
    render();
    return;
  }

  if (action === "export-latest") {
    const backup = state.backups[0] || await createBackup("manual");
    BackupService.downloadBackup(backup);
    return;
  }

  const backup = backupId ? await BackupService.getBackup(backupId) : null;
  if (!backup) return;

  if (action === "download") {
    BackupService.downloadBackup(backup);
    return;
  }

  if (action === "restore") {
    const ok = confirm("Restaurar este backup vai substituir os dados atuais deste usuario. Deseja continuar?");
    if (!ok) return;
    await createBackup("antes-restauracao");
    await state.repository.restoreRawSnapshot(backup.snapshot);
    state.backupMessage = `Backup restaurado de ${formatDateTime(backup.criado_em)}.`;
    await refreshData();
    return;
  }

  if (action === "delete") {
    await BackupService.deleteBackup(backupId);
    state.backups = await BackupService.listBackups(state.user.id);
    state.backupMessage = "Backup removido.";
    render();
  }
}

async function importBackupFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const backup = await BackupService.readBackupFile(file);
    if (!backup?.snapshot) {
      throw new Error("Arquivo de backup invalido.");
    }

    const ok = confirm("Importar este backup vai substituir os dados atuais deste usuario. Deseja continuar?");
    if (!ok) return;
    await createBackup("antes-importacao");
    await state.repository.restoreRawSnapshot(backup.snapshot);
    await createBackup("importado");
    state.backupMessage = "Backup importado e restaurado.";
    await refreshData();
  } catch (error) {
    state.backupMessage = error.message || "Nao foi possivel importar o backup.";
    render();
  } finally {
    event.target.value = "";
  }
}

function refreshTransactionHistory() {
  const list = document.querySelector("[data-transaction-history]");
  if (!list) return;

  const content = monthlyTransactionHistory(filterAndSortTransactions(state.data.transactions));
  list.innerHTML = content || `<p class="empty-state">Nenhum lancamento encontrado.</p>`;
  bindCatalogActions(list);
}

function bindCatalogActions(scope = document) {
  scope.querySelectorAll("[data-action='edit']").forEach((button) => {
    button.addEventListener("click", () => {
      state.editing = { [button.dataset.kind]: button.dataset.id };
      render();
    });
  });
  scope.querySelectorAll("[data-action='delete']").forEach((button) => {
    button.addEventListener("click", () => deleteItem(button.dataset.kind, button.dataset.id));
  });
}

function bindInstallmentControls(form) {
  if (!form) return;

  const paymentMethodField = form.elements.paymentMethodId;
  const modeField = form.elements.paymentMode;
  const installmentsField = form.elements.installments;
  const installmentsWrapper = form.querySelector("[data-installments-field]");
  const creditWrappers = form.querySelectorAll("[data-credit-field]");
  if (!paymentMethodField || !modeField || !installmentsField) return;

  function syncInstallments() {
    const isCredit = paymentMethodBehavior(paymentMethodField.value) === "cartao";
    const isInstallment = isCredit && modeField.value === "parcelado";

    creditWrappers.forEach((wrapper) => wrapper.classList.toggle("is-hidden", !isCredit));
    installmentsWrapper?.classList.toggle("is-hidden", !isInstallment);

    if (!isCredit) {
      modeField.value = "";
      installmentsField.value = "1";
      installmentsField.min = "1";
      installmentsField.readOnly = true;
      if (form.elements.cardId) form.elements.cardId.value = "";
      return;
    }

    if (modeField.value !== "parcelado") {
      installmentsField.value = "1";
      installmentsField.min = "1";
      installmentsField.readOnly = true;
      return;
    }

    installmentsField.min = "2";
    installmentsField.readOnly = false;
    installmentsField.value = String(Math.max(2, parseInteger(installmentsField.value, 2)));
  }

  paymentMethodField.addEventListener("change", syncInstallments);
  modeField.addEventListener("change", syncInstallments);
  installmentsField.addEventListener("input", () => {
    const minimum = paymentMethodBehavior(paymentMethodField.value) === "cartao" && modeField.value === "parcelado" ? 2 : 1;
    installmentsField.value = String(parseInteger(installmentsField.value, minimum));
  });
  installmentsField.addEventListener("blur", syncInstallments);
  syncInstallments();
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
  await refreshDataWithBackup("conta");
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
  await refreshDataWithBackup("cartao");
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
  await refreshDataWithBackup("renda");
}

async function addTransaction(event) {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  const paymentMethod = paymentMethodById(values.paymentMethodId);
  values.paymentTarget = paymentMethod?.comportamento || "";
  values.paymentMethodName = paymentMethod?.nome || "";
  if (values.paymentTarget !== "cartao") {
    values.cardId = "";
    values.paymentMode = "";
  }
  values.installments = String(normalizeInstallments(values.paymentTarget, values.paymentMode, values.installments));
  if (values.id) {
    await state.repository.updateTransaction(values.id, values);
  } else {
    await state.repository.addTransaction(values);
  }
  state.editing = {};
  await refreshDataWithBackup("movimentacao");
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
  await refreshDataWithBackup("categoria");
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
  await refreshDataWithBackup("bandeira");
}

async function addPaymentMethod(event) {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  if (values.id) {
    await state.repository.updatePaymentMethod(values.id, values);
  } else {
    await state.repository.addPaymentMethod(values);
  }
  state.editing = {};
  await refreshDataWithBackup("forma-pagamento");
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
    paymentMethods: () => state.repository.deletePaymentMethod(id),
  };

  await actions[kind]?.();
  state.editing = {};
  await refreshDataWithBackup(`exclusao-${kind}`);
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

function formatDateTime(value) {
  return new Date(value).toLocaleString("pt-BR");
}

function monthKey(date) {
  return String(date || "").slice(0, 7) || "0000-00";
}

function monthLabel(key) {
  if (!/^\d{4}-\d{2}$/.test(key)) {
    return "Sem data";
  }

  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function parseInteger(value, fallback = 1) {
  const parsed = Number.parseInt(String(value || "").replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeInstallments(paymentTarget, paymentMode, value) {
  if (paymentTarget === "cartao" && paymentMode === "parcelado") {
    return Math.max(2, parseInteger(value, 2));
  }

  return 1;
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
