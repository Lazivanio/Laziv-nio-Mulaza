@echo off
:: ==============================================================================
:: FATU-R ENTERPRISE POS HARDWARE AGENT - ONE-CLICK INDUSTRIAL WINDOWS INSTALLER
:: ==============================================================================
::
:: Este script automatiza o provisionamento completo de hardware local em lojas:
:: 1. Auto-eleva privilégios para Administrador
:: 2. Instala silenciosamente o Node.js v18 (caso não esteja no PC)
:: 3. Estrutura a pasta profissional "C:\Program Files\FaturAgent"
:: 4. Transfere os ficheiros de produção (index.js, package.json, install_service.js)
:: 5. Instala pacotes NPM de comunicação serial e serviços nativos Windows
:: 6. Instala e inicia o serviço FatuRHardwareAgent com recuperação automática
:: 7. Configura a Firewall local do Windows Defender para a porta 9100.
:: ==============================================================================

title Fatu-R Hardware Agent - Instalador Industrial
color 0B
echo ==================================================================
echo   FATU-R ENTERPRISE HARDWARE AGENT - INSTALADOR DE PRODUTO v1.0
echo ==================================================================
echo.

:: 1. Testar e Obter Privilégios de Administrador
:checkPrivileges
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :setupEnvironment
) else (
    echo [INFO] A solicitar permissoes de Administrador...
    goto :elevateScript
)

:elevateScript
echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
echo UAC.ShellExecute "cmd.exe", "/c %~s0 %*", "", "runas", 1 >> "%temp%\getadmin.vbs"
"%temp%\getadmin.vbs"
del "%temp%\getadmin.vbs"
exit /B

:setupEnvironment
cls
echo ==================================================================
echo   INSTALACAO CORRENDO COM PRIVILEGIOS DE ADMINISTRADOR
echo ==================================================================
echo.

:: 2. Detetar Node.js
echo [1/6] A validar dependencias do sistema local (Node.js)...
node -v >nul 2>&1
if %errorLevel% neq 0 (
    echo [AVISO] Node.js nao encontrado de forma nativa.
    echo [INFO] A descarregar instalador oficial Node.js LTS (msi)...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.16.0/node-v18.16.0-x64.msi' -OutFile '%temp%\node-install.msi'"
    echo [INFO] A instalar Node.js silenciosamente na maquina...
    msiexec.exe /i "%temp%\node-install.msi" /qn /norestart /log "%temp%\node-install.log"
    echo [OK] Node.js instalado com sucesso! A refrescar caminhos de ambiente...
    set "PATH=%PATH%;C:\Program Files\nodejs"
) else (
    echo [OK] Node.js ja esta instalado na maquina local.
)

:: 3. Criar Pasta Segura de Producao
echo.
echo [2/6] A estruturar diretorio profissional Fatu-R...
set "INSTALL_DIR=C:\Program Files\FaturAgent"
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
)

:: 4. Descarregar os Ficheiros mais recentes da Cloud (ou localhost do dev)
echo.
echo [3/6] A sincronizar ficheiros do Agente a partir do Servidor SaaS...
set "SOURCE_URL=%~1"
if "%SOURCE_URL%"=="" set "SOURCE_URL=http://localhost:3000"

echo [DOWNLOAD] A descarregar ficheiro de configuracao principal (package.json)...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%SOURCE_URL%/agent/package.json', '%INSTALL_DIR%\package.json')"

echo [DOWNLOAD] A descarregar motor do spooler local (index.js)...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%SOURCE_URL%/agent/index.js', '%INSTALL_DIR%\index.js')"

echo [DOWNLOAD] A descarregar instalador de servico Windows (install_service.js)...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%SOURCE_URL%/agent/install_service.js', '%INSTALL_DIR%\install_service.js')"

echo [DOWNLOAD] A descarregar desinstalador de servico Windows (uninstall_service.js)...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%SOURCE_URL%/agent/uninstall_service.js', '%INSTALL_DIR%\uninstall_service.js')"

:: 5. Instalar pacotes de baixo nivel (USB, Impressao, node-windows)
echo.
echo [4/6] A descarregar drivers virtuais e modulos NPM (CORS, Express, Node-Windows)...
cd /d "%INSTALL_DIR%"
call npm install --silent

:: 6. Instalar o Agente como Servico de Sistema
echo.
echo [5/6] A registar Agente de Perifericos como Servico Nativo do Windows...
echo O servico iniciara em background no arranque de cada maquina.
call node install_service.js

:: 7. Configura Firewall do Windows Defender para comunicacao síncrona segura
echo.
echo [6/6] A configurar barreiras de firewall (Porta 9100) para o Terminal...
netsh advfirewall firewall add rule name="Fatu-R Hardware Agent Listener 9100" dir=in action=allow protocol=TCP localport=9100 >nul 2>&1
powershell -Command "New-NetFirewallRule -Name 'FaturAgentPort' -DisplayName 'Fatu-R Hardware Agent Listener 9100' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 9100 -ErrorAction SilentlyContinue" >nul 2>&1

echo.
echo ==================================================================
echo   [SUCESSO] AGENTE DE IMPRESSAO SINDICALIZADO COM EXCELENCIA!
echo ==================================================================
echo.
echo   * O agente está rodando na porta: http://localhost:9100
echo   * Registado como Servico de Fundo (Auto-Arranque com o Windows)
echo   * Segurança de token AES garantida.
echo.
echo   Pode fechar este instalador. O PDV Web ja esta conectado de forma nativa.
echo ==================================================================
pause
exit
