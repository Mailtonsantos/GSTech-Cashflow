CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  foto_url TEXT,
  provedor_auth TEXT NOT NULL,
  ultimo_login_em TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

CREATE TABLE usuarios_dados_complementares (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  telefone TEXT,
  documento TEXT,
  data_nascimento TEXT,
  observacao TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

CREATE TABLE bandeiras_cartao (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  nome TEXT NOT NULL,
  ativa INTEGER NOT NULL DEFAULT 1,
  observacao TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  UNIQUE (user_id, nome)
);

CREATE TABLE categorias_movimentacao (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ambos')),
  ativa INTEGER NOT NULL DEFAULT 1,
  observacao TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  UNIQUE (user_id, nome, tipo)
);

CREATE TABLE contas_bancarias (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  banco TEXT,
  agencia TEXT,
  numero_conta TEXT,
  digito_conta TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('carteira', 'corrente', 'poupanca', 'investimento', 'outros')),
  saldo_inicial REAL NOT NULL DEFAULT 0,
  saldo_atual REAL NOT NULL DEFAULT 0,
  limite REAL NOT NULL DEFAULT 0,
  ativa INTEGER NOT NULL DEFAULT 1,
  observacao TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

CREATE TABLE cartoes_credito (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  bandeira_id TEXT,
  bandeira TEXT,
  tipo_cartao TEXT NOT NULL DEFAULT 'credito' CHECK (tipo_cartao IN ('credito', 'debito', 'credito_debito')),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'bloqueado')),
  numero_mascarado TEXT,
  validade TEXT,
  limite_total REAL NOT NULL DEFAULT 0,
  dia_fechamento INTEGER NOT NULL,
  dia_vencimento INTEGER NOT NULL,
  conta_pagamento_id TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  observacao TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  FOREIGN KEY (bandeira_id) REFERENCES bandeiras_cartao(id),
  FOREIGN KEY (conta_pagamento_id) REFERENCES contas_bancarias(id)
);

CREATE TABLE rendas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo_renda TEXT NOT NULL CHECK (tipo_renda IN ('clt', 'pf', 'informal', 'outros')),
  empresa_origem TEXT,
  valor REAL NOT NULL DEFAULT 0,
  data_recebimento TEXT,
  recorrente INTEGER NOT NULL DEFAULT 1,
  ativa INTEGER NOT NULL DEFAULT 1,
  observacao TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

CREATE TABLE faturas_cartao (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  cartao_id TEXT NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  status_pago INTEGER NOT NULL DEFAULT 0,
  valor_total REAL NOT NULL DEFAULT 0,
  observacao TEXT,
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
  categoria_id TEXT,
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
  excluida INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id),
  FOREIGN KEY (cartao_id) REFERENCES cartoes_credito(id),
  FOREIGN KEY (fatura_id) REFERENCES faturas_cartao(id),
  FOREIGN KEY (categoria_id) REFERENCES categorias_movimentacao(id),
  CHECK (parcela_atual >= 1),
  CHECK (total_parcelas >= 1),
  CHECK (parcela_atual <= total_parcelas)
);

CREATE INDEX idx_contas_bancarias_user_id
  ON contas_bancarias (user_id);

CREATE INDEX idx_cartoes_credito_user_id
  ON cartoes_credito (user_id);

CREATE INDEX idx_rendas_user_id
  ON rendas (user_id);

CREATE INDEX idx_categorias_movimentacao_user_id
  ON categorias_movimentacao (user_id, ativa);

CREATE INDEX idx_bandeiras_cartao_user_id
  ON bandeiras_cartao (user_id, ativa);

CREATE INDEX idx_faturas_cartao_user_cartao
  ON faturas_cartao (user_id, cartao_id, ano, mes);

CREATE INDEX idx_movimentacoes_user_data
  ON movimentacoes (user_id, data_movimento);

CREATE INDEX idx_movimentacoes_categoria_id
  ON movimentacoes (categoria_id);

CREATE INDEX idx_movimentacoes_fatura_id
  ON movimentacoes (fatura_id);

CREATE INDEX idx_movimentacoes_agrupador_parcela
  ON movimentacoes (id_agrupador_parcela);
