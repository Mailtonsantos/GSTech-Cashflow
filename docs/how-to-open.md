# Como abrir o GSTec Cashflow

Nao abra `index.html` ou `frontend.html` diretamente por `file://` para testar a aplicacao. O navegador pode bloquear modulos JavaScript, e o React em TypeScript precisa ser transformado pelo Vite.

## Prototipo atual

```powershell
.\scripts\start-prototype.ps1
```

Abre:

```text
http://127.0.0.1:5173
```

## Frontend React

```powershell
.\scripts\start-frontend-preview.ps1
```

Esse script roda TypeScript, gera o build Vite e abre:

```text
http://127.0.0.1:5173/dist/frontend.html
```

O arquivo `frontend.html` da raiz e a entrada de desenvolvimento usada pelo Vite. O arquivo visual pronto para testar fica em `dist/frontend.html` depois do build.
