@echo off
setlocal

set "APP_DIR=%~dp0"
set "PORT=5173"
set "HOST=0.0.0.0"
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
  "$port=%PORT%; $active=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; $lan=$active | Where-Object { $_.LocalAddress -eq '0.0.0.0' -or $_.LocalAddress -eq '::' }; if ($lan) { exit 0 } elseif ($active) { exit 3 } else { exit 2 }"

if errorlevel 3 (
  echo A porta %PORT% ja esta em uso, mas nao esta liberada para a rede local.
  echo Feche a janela antiga do servidor GSTec Cashflow e execute este BAT novamente.
  pause
  exit /b 1
)

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
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip=(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notlike 'vEthernet*' } | Select-Object -First 1 -ExpandProperty IPAddress); if ($ip) { $ip }"`) do set "LAN_IP=%%I"
if defined LAN_IP (
  echo.
  echo Acesso pelo computador: %URL%
  echo Acesso pelo celular na mesma rede: http://%LAN_IP%:%PORT%/index.html
  echo.
  echo Se o celular nao abrir, libere a porta %PORT% no Firewall do Windows para rede privada.
)
echo Servidor ativo. Pode fechar esta janela.
endlocal
