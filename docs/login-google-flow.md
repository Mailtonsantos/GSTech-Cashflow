# Fluxo de Login Google

1. Usuario clica em "Continuar com Google".
2. O provedor de autenticacao retorna `uid`, nome, e-mail e foto.
3. O app monta o objeto de usuario usando o `uid` como identificador principal.
4. O `LocalDatabaseService` abre/cria um banco local exclusivo para esse usuario.
5. O `FinanceRepository` executa a criacao logica da estrutura inicial:
   - registro em `usuarios`;
   - conta bancaria inicial;
   - cartao inicial;
   - renda inicial;
   - movimentacoes demonstrativas.
6. A sessao local e gravada.
7. O dashboard carrega consultando apenas dados vinculados ao `user_id`.

No app atual, o botao do Google usa um fluxo demonstrativo em `AuthService.signInWithGoogleDemo()`. Quando integrarmos Firebase Authentication, esse metodo sera substituido pelo retorno real do Google, mantendo o restante do fluxo.
