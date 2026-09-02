@echo off
:: ==============================================================================
:: FATU-R ENTERPRISE POS HARDWARE AGENT - 1-CLICK INDUSTRIAL WINDOWS INSTALLER
:: ==============================================================================
title Fatu-R Hardware Agent - Instalador Industrial v2.0
color 0B
echo ==================================================================
echo   FATU-R ENTERPRISE HARDWARE AGENT - INSTALADOR DE PRODUCAO v2.0
echo ==================================================================
echo.

:: 1. Testar e Obter Privilegios de Administrador
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
echo   INSTALACAO INICIADA COM PRIVILEGIOS DE ADMINISTRADOR
echo ==================================================================
echo.

set "SOURCE_URL=%~1"
if "%SOURCE_URL%"=="" set "SOURCE_URL=http://localhost:3000"

echo [1/4] A executar instalador avancado via PowerShell...
powershell -ExecutionPolicy Bypass -NoProfile -Command "iex ((New-Object System.Net.WebClient).DownloadString('%SOURCE_URL%/agent/fatur_setup.ps1')) '%SOURCE_URL%'"

echo.
echo ==================================================================
echo   INSTALACAO CONCLUIDA!
echo ==================================================================
echo   * O servico FatuRHardwareAgent esta em execucao no Windows.
echo   * Fila persistente em SQLite e Spooler Win32 Raw activos.
echo   * Porta local: http://localhost:9100
echo.
pause
exit
