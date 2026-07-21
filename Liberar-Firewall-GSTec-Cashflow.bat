@echo off
setlocal

set "PORT=5173"
set "RULE_NAME=GSTec Cashflow 5173"

net session >nul 2>nul
if errorlevel 1 (
  echo Este arquivo precisa ser executado como administrador.
  echo Clique com o botao direito e escolha "Executar como administrador".
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$rule=Get-NetFirewallRule -DisplayName '%RULE_NAME%' -ErrorAction SilentlyContinue; if ($rule) { Set-NetFirewallRule -DisplayName '%RULE_NAME%' -Enabled True -Direction Inbound -Action Allow -Profile Private } else { New-NetFirewallRule -DisplayName '%RULE_NAME%' -Direction Inbound -Action Allow -Protocol TCP -LocalPort %PORT% -Profile Private | Out-Null }"

if errorlevel 1 (
  echo Nao foi possivel liberar a porta %PORT%.
  pause
  exit /b 1
)

echo Porta %PORT% liberada no Firewall do Windows para rede privada.
pause
endlocal
