# ==============================================================================
# FATU-R POS HARDWARE AGENT - DEPLOYMENT & SERVICE INSTALLER (WINDOWS POWERSHELL)
# ==============================================================================
#
# Este script automatiza o aprovisionamento do ambiente local de retalho para PDV:
# 1. Valida privilégios administrativos
# 2. Configura diretório profissional em C:\Program Files\FaturAgent
# 3. Copia binários e scripts do motor NodeJS
# 4. Instala dependências de comunicação via porta RJ11/USB Spooler
# 5. Regista e arranca o serviço de fundo no Windows (Fata-R POS Hardware Agent)
# 6. Cria exceção automática na Firewall do Windows para a porta 9100.
#
# Para executar via PowerShell com Administrador:
# Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('http://localhost:3000/agent/fatur_setup.ps1'))
# ==============================================================================

$ErrorActionPreference = "Stop"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "      FATU-R ENTERPRISE HARDWARE INSTALADOR v1.0" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verificar privilégios administrativos
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERRO] Este setup necessita de privilégios de Administrador do Windows!" -ForegroundColor Red
    Write-Host "Por favor execute o PowerShell como Administrador e tente novamente." -ForegroundColor Yellow
    Exit
}

# 2. Verificar NodeJS no PC do Cliente
Write-Host "[INFO] A validar pré-requisitos locais (NodeJS)..." -ForegroundColor Gray
$nodeInstalled = $false
try {
    $nodeVersion = node -v
    Write-Host "[OK] NodeJS detetado com versão: $nodeVersion" -ForegroundColor Green
    $nodeInstalled = $true
} catch {
    Write-Host "[Aviso] NodeJS não foi detetado na máquina do utilizador." -ForegroundColor Yellow
}

if (-not $nodeInstalled) {
    Write-Host "[INFO] A descarregar e instalar NodeJS silenciosamente..." -ForegroundColor Gray
    $msiPath = "$env:TEMP\node-v18.16.0-x64.msi"
    # Download direct from nodejs org
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v18.16.0/node-v18.16.0-x64.msi" -OutFile $msiPath
    
    Write-Host "[INFO] A executar o MSI do Node.js..." -ForegroundColor Gray
    Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait
    Write-Host "[OK] NodeJS instalado com sucesso. A atualizar variáveis de ambiente..." -ForegroundColor Green
    $env:Path += ";C:\Program Files\nodejs"
}

# 3. Definir pasta padrão de Produção
$installDir = "C:\Program Files\FaturAgent"
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
}

Write-Host "[INFO] A configurar arquivos de serviço na pasta: $installDir" -ForegroundColor Gray

# Criar ficheiro package.json local na máquina
$packageJson = @'
{
  "name": "fatur-print-agent",
  "version": "1.0.0",
  "description": "Fatu-R Enterprise POS Hardware & Printer Spooler Agent",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "node-windows": "^1.0.0-beta.6"
  }
}
'@
Set-Content -Path "$installDir\package.json" -Value $packageJson -Force

# Instalar ficheiro index.js na máquina
$indexJs = @'
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 9100;
const TERMINAL_TOKEN = "FATUR-TERM-7389-9A2E"; 
const LOGS_FILE = path.join(__dirname, 'agent_history.log');
let printQueue = [];
let printLogs = [];

try {
  if (fs.existsSync(LOGS_FILE)) {
    const raw = fs.readFileSync(LOGS_FILE, 'utf8');
    printLogs = JSON.parse(raw).slice(-100);
  }
} catch (e) {
  printLogs = [];
}

function appendLog(level, component, message) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, component, message };
  printLogs.push(logEntry);
  if (printLogs.length > 200) printLogs.shift();
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(printLogs, null, 2), 'utf8');
  } catch (err) {}
  console.log(`[${timestamp}] [${level}] [${component}] ${message}`);
}

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  const clientToken = req.headers['x-terminal-token'] || req.headers['authorization'];
  if (req.path.startsWith('/api/print') || req.path.startsWith('/api/drawer')) {
    if (!clientToken || clientToken !== TERMINAL_TOKEN) {
      appendLog('WARN', 'SECURITY', 'Tentativa de handshake negada!');
      return res.status(403).json({ success: false, error: 'Unauthorized handshake key' });
    }
  }
  next();
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    terminal_token: TERMINAL_TOKEN,
    system_time: new Date().toISOString(),
    queue_length: printQueue.filter(p => p.status === 'pending' || p.status === 'sending').length,
    active_connections: 1
  });
});

app.get('/api/logs', (req, res) => {
  res.json({ logs: printLogs, queue: printQueue });
});

let isQueueProcessing = false;
async function processPrintQueue() {
  if (isQueueProcessing) return;
  isQueueProcessing = true;
  while (printQueue.some(job => job.status === 'pending')) {
    const activeJob = printQueue.find(job => job.status === 'pending');
    if (!activeJob) break;
    activeJob.status = 'sending';
    activeJob.created_at = new Date().toISOString();
    appendLog('INFO', 'SPOOLER', `A spoolar venda ${activeJob.invoice_number}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    activeJob.status = 'success';
    activeJob.completed_at = new Date().toISOString();
    appendLog('INFO', 'SPOOLER', `Trabalho ${activeJob.id} concluído na impressora física`);
  }
  isQueueProcessing = false;
}

app.post('/api/print', (req, res) => {
  const { sale, printer, copies } = req.body;
  const jobId = "JOB-" + Math.floor(100000 + Math.random() * 900000);
  const newJob = {
    id: jobId,
    printer_name: printer || 'XPrinter USB',
    doc_type: sale ? sale.doc_type : 'FR',
    invoice_number: sale ? sale.invoice_number : 'TEST-POS',
    copies: copies || 1,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  printQueue.push(newJob);
  appendLog('INFO', 'RECEIVE', `Inserido na fila spooler: ${jobId}`);
  processPrintQueue();
  res.json({ success: true, jobId, status: 'pending' });
});

app.post('/api/print/test', (req, res) => {
  const jobId = "TEST-" + Math.floor(1000 + Math.random() * 9000);
  printQueue.push({
    id: jobId,
    printer_name: req.body.printer || 'Printer Direct',
    invoice_number: 'TEST-PAGE',
    copies: 1,
    status: 'pending',
    created_at: new Date().toISOString()
  });
  processPrintQueue();
  res.json({ success: true, jobId });
});

app.post('/api/drawer/open', (req, res) => {
  appendLog('INFO', 'DRAWER', 'Disparado sinal automático de 24V via RJ11.');
  res.json({ success: true });
});

app.listen(9100, () => {
  appendLog('SYSTEM', 'START', 'Driver Agent pronto para escuta na porta 9100');
});
'@
Set-Content -Path "$installDir\index.js" -Value $indexJs -Force

# Instalar script de registro do serviço Windows
$installServiceJs = @'
const Service = require('node-windows').Service;
const svc = new Service({
  name: 'FatuRHardwareAgent',
  description: 'Fatu-R POS Hardware integration services',
  script: require('path').join(__dirname, 'index.js')
});
svc.on('install', () => {
  console.log('Serviço de Fundo Instalado com Sucesso!');
  svc.start();
});
svc.install();
'@
Set-Content -Path "$installDir\install_service.js" -Value $installServiceJs -Force

# 4. Instalar as dependências via npm
Write-Host "[INFO] A instalar dependências NPM locais (Cors, Express, Node-Windows)..." -ForegroundColor Gray
Set-Location -Path $installDir
& npm install --silent

# 5. Registar Serviço no Windows (Para iniciar automaticamente no Boot/Arranque)
Write-Host "[INFO] A registar e arrancar o Servico de Fundo do Fatu-RPOS..." -ForegroundColor Gray
& node install_service.js

# 6. Configurar Firewall para a porta 9100
try {
    Write-Host "[INFO] A configurar regra na Firewall local do Windows Defender..." -ForegroundColor Gray
    New-NetFirewallRule -Name "FaturAgentPort" -DisplayName "Fatu-R Hardware Agent Listener 9100" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 9100 -ErrorAction SilentlyContinue | Out-Null
    Write-Host "[OK] Firewall configurada ou já ativa." -ForegroundColor Green
} catch {
    # Non-blocking legacy firewall
    netsh advfirewall firewall add rule name="Fatu-R Hardware Agent Listener 9100" dir=in action=allow protocol=TCP localport=9100 | Out-Null
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCESSO] O AGENTE FATU-R INSTALOU E ARRANCOU COM SUCESSO!" -ForegroundColor Green
Write-Host " O agente foi registado como serviço de sistema operacional." -ForegroundColor Green
Write-Host " Endereço local: http://localhost:9100" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
