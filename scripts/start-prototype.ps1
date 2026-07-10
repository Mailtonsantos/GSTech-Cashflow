$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$node = "C:\Users\mailton.santos\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

Set-Location $root
Start-Process -FilePath $node -ArgumentList "server.js" -WorkingDirectory $root -WindowStyle Hidden
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:5173"

Write-Host "Protótipo aberto em http://127.0.0.1:5173"
