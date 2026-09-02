/**
 * PRINTER MANAGER - FATU-R HARDWARE AGENT
 * 
 * Gerenciador multi-interface de periféricos físicos reais:
 * 1. Windows Spooler (Impressoras USB, virtuais e instaladas no SO via Win32 Spooler)
 * 2. Ethernet / TCP RAW :9100 (Impressoras de rede térmicas via sockets TCP)
 * 3. Serial / COM (Portas físicas COM1..COM9 via stream serial / PowerShell)
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, execFile } = require('child_process');
const logger = require('./logger');

/**
 * Envia bytes brutos para o Spooler do Windows usando o wrapper Win32 Raw Print
 */
async function printToWindowsSpooler(printerName, buffer, docTitle = 'Fatu-R Print Job') {
  return new Promise((resolve, reject) => {
    if (os.platform() !== 'win32') {
      // Se estiver em ambiente de desenvolvimento Linux/Mac, simula escrita de spool de teste
      logger.info('PRINTER_SPOOLER', `[Dev Env Non-Win32] Simulando envio Spooler para '${printerName}' (${buffer.length} bytes)`);
      return resolve({ success: true, bytesWritten: buffer.length, message: 'Enviado ao spooler (Dev Mode)' });
    }

    // Criar arquivo temporário para os bytes brutos
    const tempFile = path.join(os.tmpdir(), `fatur_raw_${Date.now()}_${Math.random().toString(36).substring(7)}.bin`);
    
    try {
      fs.writeFileSync(tempFile, buffer);
    } catch (err) {
      logger.error('PRINTER_SPOOLER', `Falha ao gravar arquivo temporário de impressão: ${err.message}`);
      return reject(new Error(`Falha de I/O local: ${err.message}`));
    }

    // Script PowerShell avançado que invoca a API nativa winspool.drv (RawPrinterHelper)
    // Permite enviar ESC/POS puro sem que o driver modifique os bytes
    const psScript = `
$ErrorActionPreference = "Stop"
$printerName = "${printerName.replace(/"/g, '`"')}"
$filePath = "${tempFile.replace(/\\/g, '\\\\')}"

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] pBytes, string docName) {
        IntPtr hPrinter = new IntPtr(0);
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;
        di.pDocName = docName;
        di.pDataType = "RAW";

        if (OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pBytes.Length);
                    Marshal.Copy(pBytes, 0, pUnmanagedBytes, pBytes.Length);
                    Int32 dwWritten = 0;
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, pBytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return bSuccess;
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp
$bytes = [System.IO.File]::ReadAllBytes($filePath)
$success = [RawPrinterHelper]::SendBytesToPrinter($printerName, $bytes, "${docTitle.replace(/"/g, '`"')}")

if ($success) {
    Write-Output "SUCCESS"
} else {
    Write-Error "Falha ao enviar documento RAW para a impressora '$printerName'. Verifique se o nome está correto e a impressora está ligada."
}
`;

    exec(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, ' ')}"`, { timeout: 15000 }, (err, stdout, stderr) => {
      // Limpar arquivo temporário
      try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) {}

      if (err) {
        logger.error('PRINTER_SPOOLER', `Erro no Spooler Windows [${printerName}]: ${stderr || err.message}`);
        return reject(new Error(`Erro de Spooler: ${stderr || err.message}`));
      }

      if (stdout.includes('SUCCESS')) {
        logger.info('PRINTER_SPOOLER', `Documento de ${buffer.length} bytes enviado com sucesso para '${printerName}' via Spooler.`);
        return resolve({ success: true, printer: printerName, bytesWritten: buffer.length });
      } else {
        logger.error('PRINTER_SPOOLER', `Spooler Windows retornou erro inesperado: ${stdout}`);
        return reject(new Error(`Falha de impressão no Spooler: ${stdout.trim()}`));
      }
    });
  });
}

/**
 * Envia bytes brutos via TCP RAW (IP:Porta, ex: 192.168.1.100:9100)
 */
async function printToTcpRaw(host, port = 9100, buffer, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    logger.info('PRINTER_TCP', `Conectando à impressora Ethernet TCP em ${host}:${port}...`);
    
    const socket = new net.Socket();
    let isFinished = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      logger.info('PRINTER_TCP', `Conexão TCP estabelecida com ${host}:${port}. Enviando ${buffer.length} bytes...`);
      socket.write(buffer, () => {
        logger.info('PRINTER_TCP', `Bytes transmitidos com sucesso para ${host}:${port}. Fechando socket.`);
        isFinished = true;
        socket.end();
        resolve({ success: true, interface: 'TCP_RAW', host, port, bytesWritten: buffer.length });
      });
    });

    socket.on('timeout', () => {
      if (!isFinished) {
        logger.error('PRINTER_TCP', `Timeout (${timeoutMs}ms) ao comunicar com impressora Ethernet ${host}:${port}`);
        socket.destroy();
        reject(new Error(`TIMEOUT: Impressora Ethernet em ${host}:${port} não respondeu no prazo limite.`));
      }
    });

    socket.on('error', (err) => {
      if (!isFinished) {
        logger.error('PRINTER_TCP', `Erro de conexão TCP (${host}:${port}): ${err.message}`);
        reject(new Error(`Falha de conexão com impressora de rede (${host}:${port}): ${err.code || err.message}`));
      }
    });

    socket.connect(port, host);
  });
}

/**
 * Envia bytes brutos via Porta Serial / COM (ex: COM1, COM2, COM3)
 */
async function printToSerialCom(comPort, buffer, options = {}) {
  const baudRate = options.baudRate || 9600;
  const dataBits = options.dataBits || 8;
  const stopBits = options.stopBits || 'One';
  const parity = options.parity || 'None';

  return new Promise((resolve, reject) => {
    logger.info('PRINTER_SERIAL', `A enviar dados para a porta Serial ${comPort} (${baudRate} baud)...`);

    if (os.platform() !== 'win32') {
      logger.info('PRINTER_SERIAL', `[Dev Env Non-Win32] Simulando envio Serial COM para '${comPort}'`);
      return resolve({ success: true, interface: 'SERIAL', port: comPort, bytesWritten: buffer.length });
    }

    const tempFile = path.join(os.tmpdir(), `fatur_com_${Date.now()}.bin`);
    fs.writeFileSync(tempFile, buffer);

    const psScript = `
$ErrorActionPreference = "Stop"
$portName = "${comPort}"
$baudRate = ${baudRate}
$filePath = "${tempFile.replace(/\\/g, '\\\\')}"

try {
    $port = New-Object System.IO.Ports.SerialPort $portName, $baudRate, [System.IO.Ports.Parity]::${parity}, ${dataBits}, [System.IO.Ports.StopBits]::${stopBits}
    $port.WriteTimeout = 5000
    $port.Open()
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $port.Write($bytes, 0, $bytes.Length)
    Start-Sleep -Milliseconds 200
    $port.Close()
    Write-Output "SUCCESS"
} catch {
    Write-Error $_.Exception.Message
}
`;

    exec(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, ' ')}"`, { timeout: 10000 }, (err, stdout, stderr) => {
      try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) {}

      if (err || stderr) {
        logger.error('PRINTER_SERIAL', `Erro na porta ${comPort}: ${stderr || err.message}`);
        return reject(new Error(`Falha na porta serial ${comPort}: ${stderr || err.message}`));
      }

      if (stdout.includes('SUCCESS')) {
        logger.info('PRINTER_SERIAL', `Envio serial concluído na porta ${comPort}`);
        return resolve({ success: true, interface: 'SERIAL', port: comPort, bytesWritten: buffer.length });
      } else {
        return reject(new Error(`Falha ao escrever na porta serial ${comPort}`));
      }
    });
  });
}

/**
 * Lista impressoras instaladas no sistema operacional
 */
async function getInstalledPrinters() {
  return new Promise((resolve) => {
    if (os.platform() !== 'win32') {
      return resolve([
        { name: 'EPSON TM-T20III', interface: 'Windows Spooler', status: 'Online', isDefault: true },
        { name: 'XPrinter XP-80', interface: 'Windows Spooler', status: 'Online', isDefault: false },
        { name: 'Generic / Text Only', interface: 'Windows Spooler', status: 'Online', isDefault: false }
      ]);
    }

    const psScript = `
Get-CimInstance Win32_Printer | Select-Object Name, Default, PrinterStatus, PortName, DriverName | ConvertTo-Json -Compress
`;

    exec(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psScript.trim()}"`, { timeout: 8000 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve([
          { name: 'Impressora Padrão do Windows', interface: 'Windows Spooler', status: 'Online', isDefault: true }
        ]);
      }

      try {
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const printers = list.map(p => ({
          name: p.Name,
          interface: 'Windows Spooler',
          isDefault: Boolean(p.Default),
          portName: p.PortName,
          driverName: p.DriverName,
          status: p.PrinterStatus === 3 ? 'Idle / Pronto' : 'Online'
        }));
        resolve(printers);
      } catch (e) {
        resolve([{ name: 'Impressora Padrão do Windows', interface: 'Windows Spooler', status: 'Online', isDefault: true }]);
      }
    });
  });
}

/**
 * Lista portas COM disponíveis
 */
async function getAvailableComPorts() {
  return new Promise((resolve) => {
    if (os.platform() !== 'win32') {
      return resolve(['COM1', 'COM2', 'COM3']);
    }

    const psScript = `[System.IO.Ports.SerialPort]::GetPortNames() | ConvertTo-Json -Compress`;
    exec(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psScript.trim()}"`, { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      try {
        const parsed = JSON.parse(stdout);
        const ports = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        resolve(ports);
      } catch (e) {
        resolve([]);
      }
    });
  });
}

/**
 * Roteia o envio físico para o canal correto
 */
async function dispatchPrint(targetConfig, buffer, title = 'Fatu-R Print') {
  const iface = (targetConfig.interface || 'spooler').toLowerCase();

  if (iface === 'tcp' || iface === 'ethernet' || targetConfig.ip || targetConfig.host) {
    const host = targetConfig.ip || targetConfig.host || '127.0.0.1';
    const port = parseInt(targetConfig.port || 9100, 10);
    return await printToTcpRaw(host, port, buffer);
  } else if (iface === 'serial' || iface === 'com' || (targetConfig.port && targetConfig.port.startsWith('COM'))) {
    const comPort = targetConfig.port || targetConfig.comPort || 'COM1';
    return await printToSerialCom(comPort, buffer, targetConfig);
  } else {
    // Windows Spooler padrão
    const printerName = targetConfig.printerName || targetConfig.name || targetConfig.printer || 'EPSON TM-T20';
    return await printToWindowsSpooler(printerName, buffer, title);
  }
}

module.exports = {
  printToWindowsSpooler,
  printToTcpRaw,
  printToSerialCom,
  getInstalledPrinters,
  getAvailableComPorts,
  dispatchPrint
};
