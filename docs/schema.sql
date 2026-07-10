CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  foto_url TEXT,
  provedor_auth TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

CREATE TABLE contas_bancarias (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  banco TEXT,
  tipo TEXT NOT NULL,
  saldo_inicial REAL NOT NULL DEFAULT 0,
  saldo_atual REAL NOT NULL DEFAULT 0,
  limite REAL NOT NULL DEFAULT 0,
  ativa INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

CREATE TABLE cartoes_credito (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  bandeira TEXT,
  limite_total REAL NOT NULL DEFAULT 0,
  dia_fechamento INTEGER NOT NULL,
  dia_vencimento INTEGER NOT NULL,
  conta_pagamento_id TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  FOREIGN KEY (conta_pagamento_id) REFERENCES contas_bancarias(id)
);

CREATE TABLE faturas_cartao (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  cartao_id TEXT NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  status_pago INTEGER NOT NULL DEFAULT 0,
  valor_total REAL NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  FOREIGN KEY (cartao_id) REFERENCES cartoes_credito(id),
  UNIQUE (cartao_id, mes, ano)
);

CREATE TABLE movimentacoes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conta_id TEXT,
  cartao_id TEXT,
  fatura_id TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor REAL NOT NULL,
  data_movimento TEXT NOT NULL,
  forma_pagamento TEXT,
  parcela_atual INTEGER NOT NULL DEFAULT 1,
  total_parcelas INTEGER NOT NULL DEFAULT 1,
  id_agrupador_parcela TEXT,
  observacao TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id),
  FOREIGN KEY (cartao_id) REFERENCES cartoes_credito(id),
  FOREIGN KEY (fatura_id) REFERENCES faturas_cartao(id),
  CHECK (parcela_atual >= 1),
  CHECK (total_parcelas >= 1),
  CHECK (parcela_atual <= total_parcelas)
);

CREATE INDEX idx_contas_bancarias_user_id
  ON contas_bancarias (user_id);

CREATE INDEX idx_cartoes_credito_user_id
  ON cartoes_credito (user_id);

CREATE INDEX idx_faturas_cartao_user_cartao
  ON faturas_cartao (user_id, cartao_id, ano, mes);

CREATE INDEX idx_movimentacoes_user_data
  ON movimentacoes (user_id, data_movimento);

CREATE INDEX idx_movimentacoes_fatura_id
  ON movimentacoes (fatura_id);

CREATE INDEX idx_movimentacoes_agrupador_parcela
  ON movimentacoes (id_agrupador_parcela);
