@echo off
setlocal

set "APP_DIR=%~dp0"
set "PORT=5173"
set "URL=http://127.0.0.1:%PORT%/index.html"
set "NODE_EXE=C:\Users\mailton.santos\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%APP_DIR%server.js" (
  echo Nao encontrei o arquivo server.js em:
  echo %APP_DIR%
  pause
  exit /b 1
)

where node >nul 2>nul
if exist "%NODE_EXE%" (
  set "NODE_CMD=%NODE_EXE%"
) else if not errorlevel 1 (
  set "NODE_CMD=node"
) else (
  echo Node.js nao foi encontrado.
  echo Instale o Node.js ou ajuste o caminho NODE_EXE neste arquivo BAT.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port=%PORT%; $active=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if ($active) { exit 0 } else { exit 2 }"

if errorlevel 2 (
  echo Iniciando GSTec Cashflow em %URL% ...
  start "GSTec Cashflow Server" /min "%NODE_CMD%" "%APP_DIR%server.js"
  timeout /t 2 /nobreak >nul
) else (
  echo GSTec Cashflow ja esta ativo em %URL%.
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $r=Invoke-WebRequest -UseBasicParsing '%URL%' -TimeoutSec 5; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"

if errorlevel 1 (
  echo Nao foi possivel confirmar o acesso em %URL%.
  echo Verifique se a porta %PORT% esta livre e tente novamente.
  pause
  exit /b 1
)

echo Abrindo %URL% ...
start "" "%URL%"
echo Servidor ativo. Pode fechar esta janela.
endlocal
