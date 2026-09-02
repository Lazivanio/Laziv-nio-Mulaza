import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  RefreshCw, 
  Coins, 
  Cpu, 
  Activity, 
  Check, 
  Download, 
  ShieldCheck, 
  Info, 
  HardDrive, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Copy
} from 'lucide-react';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export interface HardwarePrintConfig {
  autoPrintPos: boolean;
  autoPrintBackoffice: boolean;
  defaultFormat: 'ticket' | 'a4';
  ticketSize: '58mm' | '80mm';
  showPreview: boolean;
  printSecondCopy: boolean;
  defaultPrinter: string;
  printerPreset: string;
  openDrawerOnCashPay: boolean;
  drawerInterface: 'printer' | 'webusb' | 'webserial';
  printerDrawerPin: 'pin2' | 'pin5';
  usbVendorId: string;
  serialBaudRate: number;
  useLocalAgent: boolean;
  localAgentUrl: string;
  terminalToken: string;
}

export const DEFAULT_PRINT_CONFIG: HardwarePrintConfig = {
  autoPrintPos: true,
  autoPrintBackoffice: false,
  defaultFormat: 'ticket',
  ticketSize: '80mm',
  showPreview: true,
  printSecondCopy: false,
  defaultPrinter: '',
  printerPreset: 'Generic 80mm',
  openDrawerOnCashPay: true,
  drawerInterface: 'printer',
  printerDrawerPin: 'pin2',
  usbVendorId: '0x154f',
  serialBaudRate: 9600,
  useLocalAgent: true,
  localAgentUrl: 'http://localhost:9100',
  terminalToken: 'FATUR-TERM-7389-9A2E'
};

export function getStoredPrintConfig(): HardwarePrintConfig {
  try {
    const raw = localStorage.getItem('fatur_hardware_print_config');
    if (raw) {
      return { ...DEFAULT_PRINT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_PRINT_CONFIG;
}

export function saveStoredPrintConfig(cfg: HardwarePrintConfig) {
  try {
    localStorage.setItem('fatur_hardware_print_config', JSON.stringify(cfg));
    window.dispatchEvent(new Event('fatur_print_config_change'));
  } catch {}
}

interface HardwareSettingsProps {
  user?: any;
  establishmentInfo?: any;
  onConfigChange?: (config: HardwarePrintConfig) => void;
  isModal?: boolean;
}

export const HardwareTerminalSettingsView: React.FC<HardwareSettingsProps> = ({
  user = {},
  establishmentInfo = {},
  onConfigChange,
  isModal = false
}) => {
  const [printConfig, setPrintConfig] = useState<HardwarePrintConfig>(getStoredPrintConfig());
  const [activeTab, setActiveTab] = useState<'devices' | 'agent' | 'logs'>('devices');
  const [detectedPrinters, setDetectedPrinters] = useState<any[]>([]);
  const [detectedComPorts, setDetectedComPorts] = useState<string[]>([]);
  const [isDetectingPrinters, setIsDetectingPrinters] = useState(false);
  const [agentHealthStatus, setAgentHealthStatus] = useState<'checking' | 'connected' | 'disconnected'>('disconnected');
  const [isPrintingTest, setIsPrintingTest] = useState(false);
  const [isKickingDrawer, setIsKickingDrawer] = useState(false);
  const [localAgentJobs, setLocalAgentJobs] = useState<any[]>([]);
  const [localAgentLogs, setLocalAgentLogs] = useState<any[]>([]);
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [isPairingDevice, setIsPairingDevice] = useState(false);
  const [pairedDeviceInfo, setPairedDeviceInfo] = useState<any>(null);
  const [agentDiagnostics, setAgentDiagnostics] = useState<any>(null);
  const [isCheckingDiagnostics, setIsCheckingDiagnostics] = useState(false);
  const [isUpdatingAgent, setIsUpdatingAgent] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const updateConfig = (newCfg: Partial<HardwarePrintConfig>) => {
    const updated = { ...printConfig, ...newCfg };
    setPrintConfig(updated);
    saveStoredPrintConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  const checkAgentHealth = async (customUrl?: string) => {
    setAgentHealthStatus('checking');
    const url = customUrl || printConfig.localAgentUrl || 'http://localhost:9100';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${url}/api/status`, {
        headers: { 'X-Terminal-Token': printConfig.terminalToken || 'FATUR-TERM-7389-9A2E' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setAgentHealthStatus('connected');
        if (data.device_id) {
          setPairedDeviceInfo(data);
        }
        return true;
      }
    } catch {
      // offline
    }
    setAgentHealthStatus('disconnected');
    return false;
  };

  const fetchDetectedPrinters = async () => {
    setIsDetectingPrinters(true);
    const url = printConfig.localAgentUrl || 'http://localhost:9100';
    try {
      const res = await fetch(`${url}/api/printers`);
      if (res.ok) {
        const data = await res.json();
        const printers = data.printers || [];
        setDetectedPrinters(printers);
        setDetectedComPorts(data.com_ports || []);
        
        if (data.default_printer && !printConfig.defaultPrinter) {
          const defaultName = typeof data.default_printer === 'string' ? data.default_printer : (data.default_printer.name || '');
          if (defaultName) {
            updateConfig({ defaultPrinter: defaultName });
          }
        }
        showToast(`🔍 ${printers.length} impressoras detectadas no Windows Spooler com sucesso!`);
      } else {
        showToast("⚠️ Agente de Hardware respondeu com erro ao listar impressoras.", "error");
      }
    } catch (e: any) {
      showToast(`⚠️ Não foi possível comunicar com o Agente em ${url}. Verifique se o serviço está ativo.`, "error");
    } finally {
      setIsDetectingPrinters(false);
    }
  };

  const handlePrintTestReceipt = async () => {
    setIsPrintingTest(true);
    const url = printConfig.localAgentUrl || 'http://localhost:9100';
    try {
      const isTcp = printConfig.defaultPrinter?.includes(':') || /^\d+\.\d+\.\d+\.\d+/.test(printConfig.defaultPrinter);
      let ip = '';
      let port = 9100;
      if (isTcp) {
        const parts = printConfig.defaultPrinter.split(':');
        ip = parts[0];
        port = parts[1] ? parseInt(parts[1], 10) : 9100;
      }

      const res = await fetch(`${url}/api/print/test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Terminal-Token': printConfig.terminalToken || 'FATUR-TERM-7389-9A2E'
        },
        body: JSON.stringify({
          printer: printConfig.defaultPrinter || 'EPSON TM-T20',
          interface: isTcp ? 'tcp' : 'spooler',
          ip: isTcp ? ip : undefined,
          port: isTcp ? port : undefined,
          ticketSize: printConfig.ticketSize || '80mm',
          codepage: printConfig.printerPreset?.includes('Epson') ? 'CP860' : 'CP850'
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast("🖨️ Página de Teste ESC/POS enviada para o Spooler físico com sucesso!");
        fetchAgentLogsAndJobs();
      } else {
        showToast(`Erro na impressão de teste: Status ${res.status}`, "error");
      }
    } catch (err: any) {
      alert(`⚠️ Não foi possível comunicar com o Agente de Hardware na porta 9100.\n\nCertifique-se de que o FatuRHardwareAgent está em execução no Windows ou execute o Instalador Automático.\n\nDetalhes: ${err.message}`);
    } finally {
      setIsPrintingTest(false);
    }
  };

  const triggerCashDrawerOpen = async () => {
    setIsKickingDrawer(true);
    const url = printConfig.localAgentUrl || 'http://localhost:9100';
    try {
      const isTcp = printConfig.defaultPrinter?.includes(':') || /^\d+\.\d+\.\d+\.\d+/.test(printConfig.defaultPrinter);
      let ip = '';
      let port = 9100;
      if (isTcp) {
        const parts = printConfig.defaultPrinter.split(':');
        ip = parts[0];
        port = parts[1] ? parseInt(parts[1], 10) : 9100;
      }

      const res = await fetch(`${url}/api/drawer/open`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Terminal-Token': printConfig.terminalToken || 'FATUR-TERM-7389-9A2E'
        },
        body: JSON.stringify({
          printer: printConfig.defaultPrinter || 'EPSON TM-T20',
          interface: isTcp ? 'tcp' : 'spooler',
          ip: isTcp ? ip : undefined,
          port: isTcp ? port : undefined,
          pin: printConfig.printerDrawerPin || 'pin2'
        })
      });

      if (res.ok) {
        showToast("⚡ Pulso solenóide enviado para a porta RJ11 da impressora!");
      } else {
        showToast("Falha ao emitir pulso de abertura de gaveta.", "error");
      }
    } catch (err: any) {
      showToast(`Não foi possível enviar pulso para a gaveta: ${err.message}`, "error");
    } finally {
      setIsKickingDrawer(false);
    }
  };

  const handlePairWithAgent = async () => {
    if (!pairingCodeInput.trim()) {
      alert("Por favor insira o código de emparelhamento de 6 caracteres gerado pelo Agente.");
      return;
    }
    setIsPairingDevice(true);
    try {
      const res = await fetch('/api/hardware/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairing_code: pairingCodeInput.trim().toUpperCase(),
          establishment_id: (establishmentInfo as any)?.id || (user as any)?.establishment_id || 1,
          owner_id: (user as any)?.owner_id || (user as any)?.id,
          pos_id: (user as any)?.cash_register_name || 'POS-01',
          name: `Terminal ${(user as any)?.cash_register_name || 'Principal'}`
        })
      });
      const data = await res.json();
      if (data.success) {
        try {
          await fetch(`${printConfig.localAgentUrl || 'http://localhost:9100'}/api/pairing/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: data.access_token,
              device_id: data.device_id,
              establishment_id: (establishmentInfo as any)?.id || (user as any)?.establishment_id,
              establishment_name: (establishmentInfo as any)?.name || (establishmentInfo as any)?.company_name,
              cloud_url: window.location.origin
            })
          });
        } catch {
          // background sync
        }
        setPairedDeviceInfo(data);
        setPairingCodeInput('');
        checkAgentHealth();
        showToast("🎉 Terminal e Agente de Hardware emparelhados com sucesso!");
      } else {
        alert(`Erro no emparelhamento: ${data.error || 'Código inválido ou expirado.'}`);
      }
    } catch (err: any) {
      alert(`Falha no emparelhamento: ${err.message}`);
    } finally {
      setIsPairingDevice(false);
    }
  };

  const fetchAgentLogsAndJobs = async () => {
    const url = printConfig.localAgentUrl || 'http://localhost:9100';
    try {
      const [logsRes, jobsRes] = await Promise.all([
        fetch(`${url}/api/logs`, { headers: { 'X-Terminal-Token': printConfig.terminalToken || 'FATUR-TERM-7389-9A2E' } }),
        fetch(`${url}/api/jobs`, { headers: { 'X-Terminal-Token': printConfig.terminalToken || 'FATUR-TERM-7389-9A2E' } })
      ]);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLocalAgentLogs(logsData.logs || []);
      }
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setLocalAgentJobs(jobsData.jobs || []);
      }
    } catch {}
  };

  const runAgentDiagnostics = async () => {
    setIsCheckingDiagnostics(true);
    const url = printConfig.localAgentUrl || 'http://localhost:9100';
    try {
      const res = await fetch(`${url}/api/diagnostics/run`, {
        method: 'POST',
        headers: { 'X-Terminal-Token': printConfig.terminalToken || 'FATUR-TERM-7389-9A2E' }
      });
      if (res.ok) {
        const data = await res.json();
        setAgentDiagnostics(data);
        showToast("Diagnóstico completo do barramento de hardware finalizado!");
      }
    } catch {
      showToast("Falha ao executar scanner de diagnóstico.", "error");
    } finally {
      setIsCheckingDiagnostics(false);
    }
  };

  useEffect(() => {
    checkAgentHealth();
    fetchDetectedPrinters();
    fetchAgentLogsAndJobs();
  }, []);

  return (
    <div className={cn("space-y-6 text-zinc-900", isModal ? "max-h-[85vh] overflow-y-auto pr-1" : "")}>
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={cn(
          "p-4 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-lg transition-all animate-in fade-in slide-in-from-top-2",
          toastMessage.type === 'success' ? "bg-emerald-500 text-white" :
          toastMessage.type === 'error' ? "bg-rose-500 text-white" : "bg-zinc-900 text-white"
        )}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER DE ESTADO & AÇÕES RÁPIDAS */}
      <div className="p-4 bg-gradient-to-r from-zinc-900 via-zinc-950 to-black text-white rounded-2xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shrink-0">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Central de Hardware & Impressoras</h3>
              <p className="text-[11px] text-zinc-400">Windows Spooler RAW, TCP 9100, Portas COM e Gaveta RJ11</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border",
              agentHealthStatus === 'connected' 
                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-400"
                : agentHealthStatus === 'checking'
                ? "bg-amber-950/80 border-amber-500/40 text-amber-400"
                : "bg-rose-950/80 border-rose-500/40 text-rose-400"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full shrink-0",
                agentHealthStatus === 'connected' ? "bg-emerald-400 animate-pulse" :
                agentHealthStatus === 'checking' ? "bg-amber-400 animate-spin" : "bg-rose-400"
              )} />
              <span>
                {agentHealthStatus === 'connected' ? 'Agente Windows Online (:9100)' :
                 agentHealthStatus === 'checking' ? 'A verificar conexão...' : 'Agente Offline'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => checkAgentHealth()}
              className="p-1.5 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
              title="Testar Conexão com o Agente"
            >
              <RefreshCw size={11} className={agentHealthStatus === 'checking' ? 'animate-spin' : ''} />
              <span>Verificar</span>
            </button>
          </div>
        </div>

        {/* BARRA DE AÇÕES RÁPIDAS EM 1-CLIQUE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={handlePrintTestReceipt}
            disabled={isPrintingTest}
            className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 active:scale-98 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer size={15} />
            <span>{isPrintingTest ? "Imprimindo..." : "Imprimir Página de Teste ESC/POS"}</span>
          </button>

          <button
            type="button"
            onClick={triggerCashDrawerOpen}
            disabled={isKickingDrawer}
            className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-100 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Coins size={15} className="text-amber-400" />
            <span>{isKickingDrawer ? "Enviando Pulso..." : "Testar Pulso Gaveta RJ11"}</span>
          </button>

          <button
            type="button"
            onClick={fetchDetectedPrinters}
            disabled={isDetectingPrinters}
            className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-100 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={isDetectingPrinters ? "animate-spin text-amber-400" : "text-amber-400"} />
            <span>{isDetectingPrinters ? "Detectando..." : "Atualizar Impressoras"}</span>
          </button>
        </div>
      </div>

      {/* TABS DE SELEÇÃO */}
      <div className="flex border-b border-zinc-200 p-1 bg-zinc-100 rounded-xl">
        <button
          onClick={() => setActiveTab('devices')}
          type="button"
          className={cn(
            "flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
            activeTab === 'devices' 
              ? "bg-white text-black shadow-sm" 
              : "text-zinc-500 hover:text-zinc-800"
          )}
        >
          <Printer size={14} /> Periféricos & Impressoras
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          type="button"
          className={cn(
            "flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
            activeTab === 'agent' 
              ? "bg-white text-black shadow-sm" 
              : "text-zinc-500 hover:text-zinc-800"
          )}
        >
          <Cpu size={14} /> Agente & Instalador Windows
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          type="button"
          className={cn(
            "flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
            activeTab === 'logs' 
              ? "bg-white text-black shadow-sm" 
              : "text-zinc-500 hover:text-zinc-800"
          )}
        >
          <Activity size={14} /> Fila SQLite & Logs
        </button>
      </div>

      {/* ABA 1: PERIFÉRICOS & IMPRESSORAS */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          
          {/* Cartão de Seleção da Impressora */}
          <div className="p-5 bg-white border border-zinc-200 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="text-zinc-700" size={18} />
                <h4 className="font-bold text-sm text-zinc-900">Dispositivo de Impressão Térmica</h4>
              </div>
              <button
                type="button"
                onClick={fetchDetectedPrinters}
                disabled={isDetectingPrinters}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={isDetectingPrinters ? "animate-spin" : ""} />
                {isDetectingPrinters ? "A listar..." : "Atualizar Lista de Impressoras"}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Impressora do Windows Spooler ou Endereço IP
                </label>
                {detectedPrinters.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={printConfig.defaultPrinter}
                      onChange={e => updateConfig({ defaultPrinter: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-bold cursor-pointer"
                    >
                      <option value="">Selecione a impressora física detectada...</option>
                      {detectedPrinters.map((p, idx) => {
                        const pName = typeof p === 'string' ? p : (p.name || p.printerName);
                        const isDef = p.isDefault ? ' ⭐ (Padrão Windows)' : '';
                        return (
                          <option key={idx} value={pName}>
                            🖨️ {pName}{isDef}
                          </option>
                        );
                      })}
                    </select>
                    <input 
                      type="text"
                      placeholder="Ou digite IP:Porta para TCP RAW (ex: 192.168.1.200:9100) ou Porta COM (ex: COM1)"
                      value={printConfig.defaultPrinter}
                      onChange={e => updateConfig({ defaultPrinter: e.target.value })}
                      className="w-full px-4 py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-xl outline-none text-xs font-mono font-medium focus:border-black"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input 
                      type="text"
                      placeholder="Nome exato no Windows (ex: EPSON TM-T20) ou IP (ex: 192.168.1.200:9100)"
                      value={printConfig.defaultPrinter}
                      onChange={e => updateConfig({ defaultPrinter: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-bold"
                    />
                    <p className="text-[10px] text-zinc-500">
                      💡 Dica: Clique em "Atualizar Impressoras" para detectar automaticamente todas as impressoras USB e de rede configuradas no Windows.
                    </p>
                  </div>
                )}
              </div>

              {/* Preset e Calibração */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    Preset de Fabricante & Codepage
                  </label>
                  <select
                    value={printConfig.printerPreset || 'Generic 80mm'}
                    onChange={e => {
                      const val = e.target.value;
                      const size = val.includes('58mm') ? '58mm' : '80mm';
                      updateConfig({
                        printerPreset: val,
                        defaultFormat: 'ticket',
                        ticketSize: size
                      });
                    }}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-bold cursor-pointer"
                  >
                    <option value="Epson TM-T20">Epson TM-T20 / TM-T88 (Oficial Português CP860)</option>
                    <option value="XPrinter XP-80">XPrinter XP-80 / XP-N160 (Oficial CP850)</option>
                    <option value="Elgin I9">Elgin i9 / i7 (Oficial CP850)</option>
                    <option value="Bematech MP-4200">Bematech MP-4200 TH (Oficial CP850)</option>
                    <option value="Generic 80mm">Bobina Térmica Genérica de 80mm (ESC/POS)</option>
                    <option value="Generic 58mm">Bobina Térmica Genérica de 58mm (Compacta)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    Largura do Papel de Saída
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '58mm', label: 'Ticket 58mm' },
                      { id: '80mm', label: 'Ticket 80mm' },
                      { id: 'a4', label: 'Folha A4' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (opt.id === 'a4') {
                            updateConfig({ defaultFormat: 'a4' });
                          } else {
                            updateConfig({ defaultFormat: 'ticket', ticketSize: opt.id as '58mm' | '80mm' });
                          }
                        }}
                        className={cn(
                          "py-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer",
                          (printConfig.defaultFormat === 'a4' && opt.id === 'a4') || 
                          (printConfig.defaultFormat === 'ticket' && printConfig.ticketSize === opt.id)
                            ? "bg-black text-white border-black"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Opções de Impressão */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-100 transition-colors">
                  <input 
                    type="checkbox"
                    checked={printConfig.autoPrintPos}
                    onChange={e => updateConfig({ autoPrintPos: e.target.checked })}
                    className="w-4 h-4 rounded accent-black"
                  />
                  <div>
                    <p className="text-xs font-bold text-zinc-900 leading-none">Impressão Automática no PDV</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Imprime o ticket fiscal logo após fechar a venda.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-100 transition-colors">
                  <input 
                    type="checkbox"
                    checked={printConfig.printSecondCopy}
                    onChange={e => updateConfig({ printSecondCopy: e.target.checked })}
                    className="w-4 h-4 rounded accent-black"
                  />
                  <div>
                    <p className="text-xs font-bold text-zinc-900 leading-none">Via Duplicada de Arquivo</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Gera uma 2ª cópia para controle interno e backoffice.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Cartão da Gaveta de Dinheiro RJ11 */}
          <div className="p-5 bg-white border border-zinc-200 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="text-zinc-700" size={18} />
                <h4 className="font-bold text-sm text-zinc-900">Gaveta de Dinheiro (RJ11 / Solenóide)</h4>
              </div>
              <button
                type="button"
                onClick={triggerCashDrawerOpen}
                disabled={isKickingDrawer}
                className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <Zap size={12} />
                {isKickingDrawer ? "Disparando..." : "Testar Abertura"}
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-100 transition-colors">
                <input 
                  type="checkbox"
                  checked={printConfig.openDrawerOnCashPay}
                  onChange={e => updateConfig({ openDrawerOnCashPay: e.target.checked })}
                  className="w-4 h-4 rounded accent-black"
                />
                <div>
                  <p className="text-xs font-bold text-zinc-900 leading-none">Abertura Automática em Pagamento a Dinheiro (Cash)</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Dispara o pulso elétrico para destravar a gaveta ao liquidar em numerário.</p>
                </div>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    Interface de Conexão
                  </label>
                  <select 
                    value={printConfig.drawerInterface}
                    onChange={e => updateConfig({ drawerInterface: e.target.value as any })}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-xs font-bold"
                  >
                    <option value="printer">Via Porta Traseira RJ11 da Impressora Térmica (24V)</option>
                    <option value="webusb">Via Cabo USB Direto</option>
                    <option value="webserial">Via Porta Série COM</option>
                  </select>
                </div>

                {printConfig.drawerInterface === 'printer' && (
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                      Pino Tracionador RJ11
                    </label>
                    <select 
                      value={printConfig.printerDrawerPin}
                      onChange={e => updateConfig({ printerDrawerPin: e.target.value as any })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-xs font-bold"
                    >
                      <option value="pin2">Pino 2 (EPSON, XPrinter, Elgin, Padrão Retalho)</option>
                      <option value="pin5">Pino 5 (Star Micronics, Citizen)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: AGENTE & INSTALADOR WINDOWS */}
      {activeTab === 'agent' && (
        <div className="space-y-6">
          
          {/* Configuração do Agente Local */}
          <div className="p-5 bg-white border border-zinc-200 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="text-zinc-700" size={18} />
                <h4 className="font-bold text-sm text-zinc-900">Serviço Local Fatu-R Hardware Agent</h4>
              </div>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                agentHealthStatus === 'connected' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
              )}>
                {agentHealthStatus === 'connected' ? 'Serviço Ativo' : 'Serviço Desconectado'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  URL do Agente Local no Computador
                </label>
                <input 
                  type="text"
                  value={printConfig.localAgentUrl}
                  onChange={e => updateConfig({ localAgentUrl: e.target.value })}
                  placeholder="http://localhost:9100"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Token de Segurança do Terminal
                </label>
                <input 
                  type="text"
                  value={printConfig.terminalToken}
                  onChange={e => updateConfig({ terminalToken: e.target.value })}
                  placeholder="FATUR-TERM-XXXX"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Emparelhamento */}
            <div className="pt-3 border-t border-zinc-100 space-y-3">
              <h5 className="text-xs font-black uppercase tracking-wider text-zinc-600">Emparelhamento de Terminal</h5>
              <div className="flex gap-2">
                <input 
                  type="text"
                  maxLength={6}
                  placeholder="Insira código de 6 dígitos (ex: A8B9C2)"
                  value={pairingCodeInput}
                  onChange={e => setPairingCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-center font-mono font-black text-base uppercase tracking-widest outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={handlePairWithAgent}
                  disabled={isPairingDevice}
                  className="px-6 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPairingDevice ? "Emparelhando..." : "Emparelhar"}
                </button>
              </div>

              {pairedDeviceInfo && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-medium flex items-center gap-2">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>Dispositivo {pairedDeviceInfo.device_id || 'FATUR-DEV'} emparelhado e autenticado!</span>
                </div>
              )}
            </div>
          </div>

          {/* Instalador Automático do Windows */}
          <div className="p-6 bg-zinc-950 text-white rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <h4 className="font-bold text-sm text-amber-400 uppercase tracking-wider">Instalador Automático (Windows Service)</h4>
              </div>
              <span className="text-[10px] bg-zinc-800 px-2.5 py-1 rounded-full font-mono text-zinc-300">v2.0.0 Oficial</span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              O instalador configura o <strong>Fatu-R Hardware Agent</strong> como um serviço nativo do Windows (inicia automaticamente com o boot do PC e roda em segundo plano na porta 9100).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a
                href={`${window.location.origin}/agent/fatur_installer.bat`}
                download="fatur_installer.bat"
                className="py-3.5 px-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-zinc-950 font-black uppercase text-xs tracking-wider rounded-xl text-center flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Download size={16} />
                <span>Descarregar Instalador .BAT (1-Clique)</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  const cmd = `Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('${window.location.origin}/agent/fatur_setup.ps1'))`;
                  navigator.clipboard.writeText(cmd);
                  showToast("Comando PowerShell copiado! Cole no PowerShell como Administrador.");
                }}
                className="py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-black uppercase text-xs tracking-wider rounded-xl text-center flex items-center justify-center gap-2 border border-zinc-700 shadow transition-all cursor-pointer"
              >
                <Copy size={16} />
                <span>Copiar Comando PowerShell</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: FILA & LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          
          {/* Fila de Impressão SQLite */}
          <div className="p-5 bg-white border border-zinc-200 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="text-zinc-700" size={18} />
                <h4 className="font-bold text-sm text-zinc-900">Fila Persistente de Impressão (SQLite WAL)</h4>
              </div>
              <button
                type="button"
                onClick={fetchAgentLogsAndJobs}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} /> Atualizar Fila
              </button>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
              {localAgentJobs.length === 0 ? (
                <div className="p-6 text-center text-zinc-400 text-xs">
                  Nenhum trabalho de impressão na fila no momento.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 max-h-[200px] overflow-y-auto">
                  {localAgentJobs.map((job) => (
                    <div key={job.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-zinc-900">{job.id}</span>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {job.doc_type || 'Documento'} • Impressora: "{job.printer_id || job.printer_name}"
                        </div>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                        job.status === 'COMPLETED' || job.status === 'success' ? "bg-emerald-100 text-emerald-800" :
                        job.status === 'QUEUED' || job.status === 'pending' ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                      )}>
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Logs de Telemetria */}
          <div className="p-5 bg-zinc-950 text-zinc-300 rounded-2xl space-y-3 shadow-xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-amber-400" />
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">Telemetria em Tempo Real</span>
              </div>
              <button
                type="button"
                onClick={fetchAgentLogsAndJobs}
                className="text-zinc-400 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={10} /> Atualizar
              </button>
            </div>

            <div className="max-h-[180px] overflow-y-auto space-y-1 text-[11px] leading-relaxed">
              {localAgentLogs.length === 0 ? (
                <div className="text-zinc-500 text-center py-4">Sem registos recentes de telemetria.</div>
              ) : (
                localAgentLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="text-zinc-500">[{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'LOG'}]</span>
                    <span className="text-amber-400 font-bold">[{log.level || 'INFO'}]</span>
                    <span className="text-zinc-200">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
