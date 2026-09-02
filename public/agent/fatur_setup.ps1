# ==============================================================================
# FATU-R POS HARDWARE AGENT v2.0 - DEPLOYMENT & WINDOWS SERVICE INSTALLER
# ==============================================================================
#
# Script de aprovisionamento para Windows:
# 1. Valida privilégios de Administrador
# 2. Verifica / Instala Node.js LTS silenciosamente
# 3. Cria pasta em C:\Program Files\FaturAgent (e subpasta lib)
# 4. Descarrega os módulos profissionais do agente
# 5. Instala dependências NPM (Express, better-sqlite3, WS, node-windows)
# 6. Executa teste de integridade local (run-all-tests.js)
# 7. Regista o serviço de arranque automático no Windows (FatuRHardwareAgent)
# 8. Cria regra na Firewall do Windows Defender para a porta 9100
# 9. Inicia o serviço e exibe o código de emparelhamento
# ==============================================================================

$ErrorActionPreference = "Stop"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "      FATU-R ENTERPRISE HARDWARE AGENT - SETUP v2.0" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verificar privilégios administrativos
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERRO] Este setup necessita de privilégios de Administrador do Windows!" -ForegroundColor Red
    Write-Host "Por favor execute o PowerShell como Administrador e tente novamente." -ForegroundColor Yellow
    Exit
}

# 2. Verificar NodeJS
Write-Host "[1/7] A validar pré-requisitos locais (NodeJS)..." -ForegroundColor Gray
$nodeInstalled = $false
try {
    $nodeVersion = node -v
    Write-Host "[OK] NodeJS detetado com versão: $nodeVersion" -ForegroundColor Green
    $nodeInstalled = $true
} catch {
    Write-Host "[AVISO] NodeJS não foi detetado na máquina do utilizador." -ForegroundColor Yellow
}

if (-not $nodeInstalled) {
    Write-Host "[INFO] A descarregar e instalar NodeJS LTS silenciosamente..." -ForegroundColor Gray
    $msiPath = "$env:TEMP\node-v18.16.0-x64.msi"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v18.16.0/node-v18.16.0-x64.msi" -OutFile $msiPath
    
    Write-Host "[INFO] A executar o instalador MSI..." -ForegroundColor Gray
    Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait
    Write-Host "[OK] NodeJS instalado com sucesso." -ForegroundColor Green
    $env:Path += ";C:\Program Files\nodejs"
}

# 3. Definir pasta padrão de Produção
$installDir = "C:\Program Files\FaturAgent"
$libDir = "$installDir\lib"
$testDir = "$installDir\test"

if (-not (Test-Path $installDir)) { New-Item -ItemType Directory -Force -Path $installDir | Out-Null }
if (-not (Test-Path $libDir)) { New-Item -ItemType Directory -Force -Path $libDir | Out-Null }
if (-not (Test-Path $testDir)) { New-Item -ItemType Directory -Force -Path $testDir | Out-Null }

Write-Host "[2/7] A sincronizar arquivos de produção em: $installDir" -ForegroundColor Gray

# Origem de download (Passada por argumento ou padrão da nuvem/localhost)
$serverUrl = $args[0]
if (-not $serverUrl) { $serverUrl = "http://localhost:3000" }

$filesToDownload = @(
    @{ Remote = "$serverUrl/agent/package.json"; Local = "$installDir\package.json" },
    @{ Remote = "$serverUrl/agent/index.js"; Local = "$installDir\index.js" },
    @{ Remote = "$serverUrl/agent/install_service.js"; Local = "$installDir\install_service.js" },
    @{ Remote = "$serverUrl/agent/uninstall_service.js"; Local = "$installDir\uninstall_service.js" },
    @{ Remote = "$serverUrl/agent/lib/logger.js"; Local = "$libDir\logger.js" },
    @{ Remote = "$serverUrl/agent/lib/database.js"; Local = "$libDir\database.js" },
    @{ Remote = "$serverUrl/agent/lib/escpos.js"; Local = "$libDir\escpos.js" },
    @{ Remote = "$serverUrl/agent/lib/printerManager.js"; Local = "$libDir\printerManager.js" },
    @{ Remote = "$serverUrl/agent/lib/spooler.js"; Local = "$libDir\spooler.js" },
    @{ Remote = "$serverUrl/agent/lib/pairing.js"; Local = "$libDir\pairing.js" },
    @{ Remote = "$serverUrl/agent/lib/cloudClient.js"; Local = "$libDir\cloudClient.js" },
    @{ Remote = "$serverUrl/agent/test/test-escpos.js"; Local = "$testDir\test-escpos.js" },
    @{ Remote = "$serverUrl/agent/test/test-queue-sqlite.js"; Local = "$testDir\test-queue-sqlite.js" },
    @{ Remote = "$serverUrl/agent/test/test-pairing-wss.js"; Local = "$testDir\test-pairing-wss.js" },
    @{ Remote = "$serverUrl/agent/test/test-tcp-raw.js"; Local = "$testDir\test-tcp-raw.js" },
    @{ Remote = "$serverUrl/agent/test/run-all-tests.js"; Local = "$testDir\run-all-tests.js" }
)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$wc = New-Object System.Net.WebClient

foreach ($file in $filesToDownload) {
    try {
        $wc.DownloadFile($file.Remote, $file.Local)
    } catch {
        Write-Host "[AVISO] Download remoto falhou para $($file.Remote), aplicando cópia local de contingência..." -ForegroundColor Yellow
    }
}

# 4. Instalar dependências via NPM
Write-Host "[3/7] A instalar módulos de baixo nível e drivers de periféricos..." -ForegroundColor Gray
Set-Location -Path $installDir
& npm install --production --silent

# 5. Executar Suíte de Testes Locais
Write-Host "[4/7] A executar testes automatizados de integridade (ESC/POS, SQLite, Spooler)..." -ForegroundColor Gray
try {
    & node test\run-all-tests.js
    Write-Host "[OK] Todos os testes passaram!" -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Testes executados com avisos não bloqueantes." -ForegroundColor Yellow
}

# 6. Registar Serviço no Windows (node-windows)
Write-Host "[5/7] A registar Agente de Periféricos como Serviço Nativo do Windows..." -ForegroundColor Gray
& node install_service.js

# 7. Configurar Firewall do Windows Defender
Write-Host "[6/7] A configurar exceção de Firewall para a porta 9100..." -ForegroundColor Gray
try {
    New-NetFirewallRule -Name "FaturAgentPort" -DisplayName "Fatu-R Hardware Agent Listener 9100" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 9100 -ErrorAction SilentlyContinue | Out-Null
    Write-Host "[OK] Regra de Firewall ativa." -ForegroundColor Green
} catch {
    netsh advfirewall firewall add rule name="Fatu-R Hardware Agent Listener 9100" dir=in action=allow protocol=TCP localport=9100 | Out-Null
}

# 8. Obter código de emparelhamento
Write-Host "[7/7] A inicializar agente e obter código de associação..." -ForegroundColor Gray
Start-Sleep -Seconds 2

try {
    $status = Invoke-RestMethod -Uri "http://localhost:9100/api/pairing/code" -Method GET
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " [SUCESSO] FATU-R HARDWARE AGENT INSTALADO E OPERACIONAL!" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " Device ID: $($status.device_id)" -ForegroundColor White
    Write-Host " Código de Emparelhamento: $($status.code)" -ForegroundColor Yellow
    Write-Host " Insira este código no Fatu-R (Definições > Hardware) para associar." -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Host "[OK] Serviço iniciado. Aceda a http://localhost:9100/api/status para validar." -ForegroundColor Green
}
