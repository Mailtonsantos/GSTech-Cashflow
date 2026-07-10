# Estrutura Frontend Sugerida

```text
src/frontend/
  app/
    App.tsx
    main.tsx
  components/
    dashboard/
      MetricCard.tsx
    layout/
      AppShell.tsx
    ui/
      Button.tsx
  hooks/
    useAuth.ts
    useFinanceSummary.ts
  pages/
    DashboardPage.tsx
    LoginPage.tsx
  services/
    authService.ts
    localDatabaseService.ts
  styles/
    index.css
  types/
    finance.ts
```

Durante a migracao, a UI React pode ser aberta por `frontend.html`, enquanto o prototipo atual continua em `index.html`.

Responsabilidades:

- `components`: componentes reutilizaveis e sem regra de negocio pesada.
- `pages`: telas completas que compoem componentes.
- `services`: comunicacao com autenticacao, banco local e futuras APIs.
- `hooks`: estado de UI e orquestracao entre pages/services.
- `types`: contratos TypeScript compartilhados.
