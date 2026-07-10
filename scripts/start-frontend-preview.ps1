$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$node = "C:\Users\mailton.santos\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

Set-Location $root
& $node "node_modules\typescript\bin\tsc" -p "tsconfig.frontend.json"
& $node "node_modules\vite\bin\vite.js" build
Start-Process -FilePath $node -ArgumentList "server.js" -WorkingDirectory $root -WindowStyle Hidden
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:5173/dist/frontend.html"

Write-Host "Frontend React aberto em http://127.0.0.1:5173/dist/frontend.html"
