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
  limite_usado REAL NOT NULL DEFAULT 0,
  dia_fechamento INTEGER NOT NULL,
  dia_vencimento INTEGER NOT NULL,
  conta_pagamento_id TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  FOREIGN KEY (conta_pagamento_id) REFERENCES contas_bancarias(id)
);

CREATE TABLE movimentacoes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conta_id TEXT,
  cartao_id TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor REAL NOT NULL,
  data_movimento TEXT NOT NULL,
  forma_pagamento TEXT,
  observacao TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id),
  FOREIGN KEY (cartao_id) REFERENCES cartoes_credito(id)
);
