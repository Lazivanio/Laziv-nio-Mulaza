import React, { useState, useEffect, ReactNode, FormEvent, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import html2canvas from "html2canvas";
import QRCode from 'qrcode';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

import { 
  LayoutGrid,
  Coffee,
  Beer,
  Apple,
  Tag,
  Barcode,
  Home,
  History,
  LayoutDashboard, 
  Store, 
  Users, 
  ShoppingCart, 
  ShoppingBag,
  Package, 
  LogOut, 
  Settings, 
  CreditCard, 
  TrendingUp,
  Sparkles,
  Search,
  Plus,
  Printer,
  Eye,
  Filter,
  ChevronRight,
  Menu,
  X,
  User as UserIcon,
  Briefcase,
  Calendar,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
  Lock,
  Wallet,
  Phone,
  FileText,
  PieChart as PieChartIcon,
  Download,
  Upload,
  Image as ImageIcon,
  Activity,
  BarChart3,
  Settings2,
  AlertTriangle,
  ChevronLeft,
  Trash2,
  Edit2,
  Power,
  Minus,
  Box,
  Layers,
  Split,
  UserPlus,
  Check,
  ArrowRightLeft,
  Shield,
  ShieldCheck,
  LifeBuoy,
  Monitor,
  FilePieChart,
  Lock as LockIcon,
  ShieldAlert,
  HelpCircle,
  Cpu,
  Database,
  Server,
  Clock,
  Zap,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  CheckCircle,
  Receipt,
  ReceiptText,
  BadgeDollarSign,
  CloudUpload,
  Warehouse,
  ClipboardList,
  Loader2,
  RefreshCcw,
  Coins,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { User, Establishment as EstablishmentType, Product, Transaction, BankAccount, CashRegister, Service, ServiceFee } from './types';
import { OwnerRH } from './components/OwnerRH';
import { OwnerPartners } from './components/OwnerPartners';
import { OwnerPurchases } from './components/OwnerPurchases';
import { OwnerServices } from './components/OwnerServices';
import OwnerFiscalDocuments from './components/OwnerFiscalDocuments';
import { OwnerOverview } from './components/OwnerOverview';
import { MyEstablishments } from './components/MyEstablishments';
import { OwnerReports } from './components/OwnerReports';
import { OwnerSettings } from './components/OwnerSettings';
import { OwnerCurrencies } from './components/OwnerCurrencies';
import { OwnerWarehouses } from './components/OwnerWarehouses';
import { OwnerFinance } from './components/OwnerFinance';
import AdminAuditLogs from './components/AdminAuditLogs';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function hasPermission(user: User | null, permissionId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'owner') return true;
  const perms = user.permissions;
  if (!perms || !Array.isArray(perms)) return false;
  return perms.includes(permissionId);
}

// --- Components ---

const AdminReliability = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [healthLogs, setHealthLogs] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const fetchData = async () => {
    try {
      const [alertsRes, logsRes] = await Promise.all([
        fetch('/api/admin/reliability/alerts'),
        fetch('/api/admin/reliability/health-logs')
      ]);
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (logsRes.ok) setHealthLogs(await logsRes.json());
    } catch (e) {}
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runRestoreTest = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/admin/reliability/restore-test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Teste concluído com sucesso! Integridade verificada para ${data.userCount} utilizadores.`);
      } else {
        alert(`Falha no teste: ${data.error}`);
      }
      fetchData();
    } catch (e) {
      alert("Erro ao executar teste.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Centro de Confiabilidade</h1>
          <p className="text-zinc-500">Monitorização de integridade, backups e estabilidade operacional.</p>
        </div>
        <button 
          onClick={runRestoreTest}
          disabled={isTesting}
          className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-50"
        >
          {isTesting ? <RefreshCw className="animate-spin" size={20} /> : <Database size={20} />}
          Executar Teste de Restauração
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Alerts Section */}
        <Card className="p-0 border-zinc-100 flex flex-col h-[600px]">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldAlert className="text-rose-500" size={20} />
              Alertas Críticos
            </h2>
            <span className="bg-rose-100 text-rose-600 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              {alerts.length} Totais
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/30">
            {alerts.length === 0 ? (
              <div className="text-center py-20 text-zinc-400">
                <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500 opacity-20" />
                <p>Nenhum alerta pendente.</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      alert.level === 'critical' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {alert.source === 'database' ? <Database size={20} /> : <Server size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{alert.source}</span>
                        <span className="text-xs text-zinc-400">{new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                      <h4 className="font-bold text-zinc-900">{alert.message}</h4>
                      {alert.details && <p className="text-xs text-zinc-500 mt-2 font-mono bg-zinc-50 p-2 rounded-lg">{alert.details}</p>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Health Logs Section */}
        <Card className="p-0 border-zinc-100 flex flex-col h-[600px]">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="text-indigo-500" size={20} />
              Logs de Saúde
            </h2>
            <button onClick={fetchData} className="text-zinc-400 hover:text-zinc-900 transition-colors">
              <RefreshCw size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/30">
            {healthLogs.length === 0 ? (
              <div className="text-center py-20 text-zinc-400">
                <p>Nenhum log de monitorização disponível.</p>
              </div>
            ) : (
              healthLogs.map(log => (
                <div key={log.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        log.status === 'success' ? "bg-emerald-500" : "bg-rose-500"
                      )} />
                      <span className="text-sm font-bold capitalize">{log.check_type.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs text-zinc-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-zinc-600 mb-2">{log.message}</p>
                  <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                    <span>Duração: {log.duration_ms}ms</span>
                    <span>Status: {log.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, to, onClick }: { icon: any, label: string, to: string, onClick?: () => void }) => {
  const location = useLocation();
  const active = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
        active 
          ? "bg-black text-white shadow-lg shadow-black/20" 
          : "text-zinc-500 hover:bg-zinc-100 hover:text-black"
      )}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

const ReliabilityMonitor = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/admin/reliability/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
        setUnreadCount(data.filter((a: any) => !a.is_read).length);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/admin/reliability/alerts/${id}/read`, { method: 'POST' });
      fetchAlerts();
    } catch (e) {}
  };

  if (unreadCount === 0 && !isModalOpen) return null;

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "fixed top-4 right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl cursor-pointer animate-pulse transition-all",
          unreadCount > 0 ? "bg-rose-600 text-white" : "bg-white text-zinc-900 border border-zinc-200"
        )}
      >
        <ShieldAlert size={20} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Segurança & Confiabilidade</p>
          <p className="text-sm font-bold">{unreadCount} eventos críticos detectados</p>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Monitor de Operações</h2>
                    <p className="text-sm text-zinc-500">Monitorização em tempo real da integridade do sistema</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl text-zinc-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/30">
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500 opacity-20" />
                    <p className="font-medium text-zinc-500">O sistema está operando com 100% de integridade.</p>
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div 
                      key={alert.id}
                      className={cn(
                        "p-4 rounded-2xl border transition-all",
                        alert.is_read ? "bg-white border-zinc-100 opacity-60" : "bg-white border-rose-100 shadow-sm ring-1 ring-rose-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center mt-1 shrink-0",
                            alert.level === 'critical' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {alert.source === 'database' ? <Database size={16} /> : <CloudUpload size={16} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{alert.source}</span>
                              <span className="text-[10px] text-zinc-300">•</span>
                              <span className="text-[10px] text-zinc-400">{new Date(alert.created_at).toLocaleString()}</span>
                            </div>
                            <h4 className="font-bold text-zinc-900 leading-tight">{alert.message}</h4>
                            {alert.details && (
                              <div className="mt-3 bg-zinc-900 rounded-xl p-3">
                                <p className="text-xs text-zinc-400 font-mono break-all leading-relaxed">{alert.details}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {!alert.is_read && (
                          <button 
                            onClick={() => markAsRead(alert.id)}
                            className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap bg-rose-50/50"
                          >
                            Arquivar
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const Card = ({ children, className, ...props }: { children: ReactNode, className?: string, [key: string]: any }) => (
  <div {...props} className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

const StatCard = ({ label, value, icon: Icon, trend, color = "blue" }: { label: string, value: string | number, icon: any, trend?: string, color?: string }) => (
  <Card className="p-4 md:p-6">
    <div className="flex justify-between items-start gap-4">
      <div className="min-w-0">
        <p className="text-[10px] md:text-sm font-medium text-zinc-500 uppercase tracking-wider truncate">{label}</p>
        <h3 className="text-xl md:text-2xl font-bold mt-1 truncate">{value}</h3>
        {trend && (
          <p className={cn("text-[10px] md:text-xs mt-2 flex items-center gap-1", trend.startsWith('+') ? "text-emerald-600" : "text-rose-600")}>
            <TrendingUp size={12} className="shrink-0" />
            <span className="truncate">{trend} em relação ao mês passado</span>
          </p>
        )}
      </div>
      <div className={cn("p-2 md:p-3 rounded-xl shrink-0", {
        "bg-blue-50 text-blue-600": color === "blue",
        "bg-emerald-50 text-emerald-600": color === "emerald",
        "bg-amber-50 text-amber-600": color === "amber",
        "bg-rose-50 text-rose-600": color === "rose",
      })}>
        <Icon size={20} className="md:w-6 md:h-6" />
      </div>
    </div>
  </Card>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: { isOpen: boolean, onClose: () => void, title: string, children: ReactNode, maxWidth?: string }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn("relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden", maxWidth)}
        >
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[85vh]">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger"
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string,
  confirmText?: string,
  cancelText?: string,
  variant?: "danger" | "primary"
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <div className="space-y-6">
      <p className="text-zinc-600">{message}</p>
      <div className="flex justify-end gap-3">
        <button 
          onClick={onClose}
          className="px-4 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
        >
          {cancelText}
        </button>
        <button 
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={cn(
            "px-6 py-2 text-sm font-bold text-white rounded-xl transition-all shadow-lg",
            variant === "danger" ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" : "bg-black hover:bg-zinc-800 shadow-zinc-200"
          )}
        >
          {confirmText}
        </button>
      </div>
    </div>
  </Modal>
);

// --- Admin Panel ---

const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [identifier, setIdentifier] = useState('owner@factu.com');
  const [password, setPassword] = useState('owner');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password })
      });
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        const data = await res.json();
        setError(data.error || 'Credenciais inválidas');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black text-white rounded-2xl mb-4">
            <Zap size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Fatu-R</h1>
          <p className="text-zinc-500 mt-2">Sistema de Faturação Eletrônica</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Utilizador ou Email</label>
              <input 
                type="text" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all"
                placeholder="Nome de utilizador ou email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Palavra-passe</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-zinc-800 transition-colors"
            >
              Entrar no Sistema
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-400">Dica: Use o seu nome de utilizador ou email e a palavra-passe definida pelo administrador.</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

// --- Layout ---

const DashboardLayout = ({ user, onLogout, children }: { user: User, onLogout: () => void, children: ReactNode }) => {
  const [proformaForm, setProformaForm] = useState({
    client_name: '',
    client_nif: '',
    client_address: '',
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const closeSidebar = () => setIsSidebarOpen(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  return (
    <div className="h-screen bg-zinc-50 flex overflow-hidden relative">
      <ReliabilityMonitor />
      
      <Modal isOpen={isLogoutConfirmOpen} onClose={() => setIsLogoutConfirmOpen(false)} title="Terminar Sessão">
        <div className="space-y-6">
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-white text-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/10 border border-rose-200">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-rose-900 tracking-tighter">Terminar Sessão?</h3>
              <p className="text-sm text-rose-600 font-medium mt-1">
                Deseja realmente sair do sistema? Quaisquer alterações não guardadas poderão ser perdidas.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsLogoutConfirmOpen(false)}
              className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
            >
              Sair Agora
            </button>
          </div>
        </div>
      </Modal>
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 transition-transform duration-300 lg:relative lg:translate-x-0 outline-none",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center justify-between lg:justify-start gap-3 px-4 py-6 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
                <Zap size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight">Fatu-R</span>
            </div>
            <button onClick={closeSidebar} className="lg:hidden p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {user.role === 'admin' && (
              <>
                <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/admin" onClick={closeSidebar} />
                <SidebarItem icon={Store} label="Estabelecimentos" to="/admin/establishments" onClick={closeSidebar} />
                <SidebarItem icon={Users} label="Clientes" to="/admin/clients" onClick={closeSidebar} />
                <SidebarItem icon={CreditCard} label="Pagamentos" to="/admin/payments" onClick={closeSidebar} />
                <SidebarItem icon={Activity} label="Confiabilidade" to="/admin/reliability" onClick={closeSidebar} />
                <SidebarItem icon={Settings} label="Configurações" to="/admin/settings" onClick={closeSidebar} />
              </>
            )}
            {user.role === 'owner' && (
              <>
                <SidebarItem icon={LayoutDashboard} label="Visão Geral" to="/owner" onClick={closeSidebar} />
                <SidebarItem icon={Store} label="Meus Estabelecimentos" to="/owner/establishments" onClick={closeSidebar} />
                <SidebarItem icon={Briefcase} label="RH" to="/owner/rh" onClick={closeSidebar} />
                <SidebarItem icon={Users} label="Parceiros" to="/owner/partners" onClick={closeSidebar} />
                <SidebarItem icon={ShoppingCart} label="Compras" to="/owner/purchases" onClick={closeSidebar} />
                <SidebarItem icon={Sparkles} label="Serviços" to="/owner/services" onClick={closeSidebar} />
                <SidebarItem icon={FileText} label="Documentos" to="/owner/documents" onClick={closeSidebar} />
                <SidebarItem icon={Warehouse} label="Armazéns" to="/owner/warehouses" onClick={closeSidebar} />
                <SidebarItem icon={DollarSign} label="Financeiro" to="/owner/finance" onClick={closeSidebar} />
                <SidebarItem icon={TrendingUp} label="Relatórios" to="/owner/reports" onClick={closeSidebar} />
                <SidebarItem icon={Settings} label="Configurações" to="/owner/settings" onClick={closeSidebar} />
              </>
            )}
            {user.role === 'seller' && (
              <>
                <SidebarItem icon={LayoutDashboard} label="Painel e Insights" to="/seller/dashboard" onClick={closeSidebar} />
                {hasPermission(user, 'pos_access') && <SidebarItem icon={ShoppingCart} label="Vendas (PDV)" to="/seller" onClick={closeSidebar} />}
                {hasPermission(user, 'hr_manage') && <SidebarItem icon={Briefcase} label="RH" to="/seller/rh" onClick={closeSidebar} />}
                {hasPermission(user, 'pos_withdraw') && <SidebarItem icon={Wallet} label="Movimentos" to="/seller/movements" onClick={closeSidebar} />}
                {hasPermission(user, 'pos_close_cashier') && <SidebarItem icon={Lock} label="Fechar Caixa" to="/seller/close" onClick={closeSidebar} />}
                <SidebarItem icon={History} label="Histórico" to="/seller/history" onClick={closeSidebar} />
                <SidebarItem icon={Settings} label="Configurações" to="/seller/settings" onClick={closeSidebar} />
              </>
            )}
            {user.role === 'manager' && (
              <>
                <SidebarItem icon={LayoutDashboard} label="Painel Administrativo" to="/manager" onClick={closeSidebar} />
                {user.establishment_id ? (
                  <SidebarItem icon={Store} label="Gerir Unidade" to={`/manager/establishments/${user.establishment_id}`} onClick={closeSidebar} />
                ) : (
                  <SidebarItem icon={Store} label="Gerir Unidades" to="/manager/establishments" onClick={closeSidebar} />
                )}
                {hasPermission(user, 'pos_access') && <SidebarItem icon={ShoppingCart} label="Vendas (PDV)" to="/seller" onClick={closeSidebar} />}
                {hasPermission(user, 'pos_close_cashier') && <SidebarItem icon={Lock} label="Fechar Caixa" to="/seller/close" onClick={closeSidebar} />}
                {hasPermission(user, 'suppliers_manage') && <SidebarItem icon={ShoppingBag} label="Compras" to="/manager/purchases" onClick={closeSidebar} />}
                {hasPermission(user, 'hr_manage') && <SidebarItem icon={Briefcase} label="RH" to="/manager/rh" onClick={closeSidebar} />}
                {(hasPermission(user, 'clients_manage') || hasPermission(user, 'suppliers_manage')) && <SidebarItem icon={Users} label="Parceiros" to="/manager/partners" onClick={closeSidebar} />}
                {hasPermission(user, 'services_manage') && <SidebarItem icon={Sparkles} label="Serviços" to="/manager/services" onClick={closeSidebar} />}
                {hasPermission(user, 'documents_view') && <SidebarItem icon={FileText} label="Documentos" to="/manager/documents" onClick={closeSidebar} />}
                {hasPermission(user, 'warehouses_manage') && <SidebarItem icon={Warehouse} label="Armazéns" to="/manager/warehouses" onClick={closeSidebar} />}
                {hasPermission(user, 'finance_manage') && <SidebarItem icon={DollarSign} label="Financeiro" to="/manager/finance" onClick={closeSidebar} />}
                {hasPermission(user, 'reports_view') && <SidebarItem icon={TrendingUp} label="Relatórios" to="/manager/reports" onClick={closeSidebar} />}
                {hasPermission(user, 'settings_manage') && <SidebarItem icon={Settings} label="Configurações" to="/manager/settings" onClick={closeSidebar} />}
              </>
            )}
          </nav>

          <div className="pt-2">
            <button 
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-rose-500 hover:bg-rose-50"
            >
              <LogOut size={20} />
              <span className="font-bold text-sm">Terminar Sessão</span>
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <div className="flex items-center gap-3 px-4 py-3 mb-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600">
                <UserIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 truncate capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg">
              <Menu size={24} />
            </button>
            <h2 className="font-bold text-lg hidden md:block">
              {location.pathname.includes('admin') ? 'Painel Administrador' : 
               location.pathname.includes('owner') ? 'Painel Proprietário' : 
               'Painel Administrativo'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full text-zinc-600 text-xs font-medium">
              <Clock size={14} />
              {new Date().toLocaleDateString()}
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600">
              <UserIcon size={18} />
            </div>
          </div>
        </header>

        <div className={cn(
          "flex-1",
          (location.pathname === '/seller' || location.pathname.includes('/owner/establishments/')) 
            ? "overflow-hidden flex flex-col" 
            : "overflow-y-auto p-4 md:p-6 pb-24 lg:pb-6"
        )}>
          {children}
        </div>

        {/* Bottom Navigation for Mobile (Seller Only) */}
        {user.role === 'seller' && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-6 py-3 flex items-center justify-between z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
            <Link to="/seller/dashboard" className={cn("flex flex-col items-center gap-1", location.pathname === '/seller/dashboard' ? "text-orange-500" : "text-zinc-400")}>
              <div className={cn("p-2 rounded-xl transition-colors", location.pathname === '/seller/dashboard' ? "bg-orange-100" : "hover:bg-zinc-100")}>
                <LayoutDashboard size={24} />
              </div>
            </Link>
            <Link to="/seller" className={cn("flex flex-col items-center gap-1", location.pathname === '/seller' ? "text-orange-500" : "text-zinc-400")}>
              <div className={cn("p-2 rounded-xl transition-colors", location.pathname === '/seller' ? "bg-orange-100" : "hover:bg-zinc-100")}>
                <ShoppingCart size={24} />
              </div>
            </Link>
            <Link to="/seller/movements" className={cn("flex flex-col items-center gap-1", location.pathname === '/seller/movements' ? "text-orange-500" : "text-zinc-400")}>
              <div className={cn("p-2 rounded-xl transition-colors", location.pathname === '/seller/movements' ? "bg-orange-100" : "hover:bg-zinc-100")}>
                <Wallet size={24} />
              </div>
            </Link>
            <Link to="/seller/close" className={cn("flex flex-col items-center gap-1", location.pathname === '/seller/close' ? "text-orange-500" : "text-zinc-400")}>
              <div className={cn("p-2 rounded-xl transition-colors", location.pathname === '/seller/close' ? "bg-orange-100" : "hover:bg-zinc-100")}>
                <Lock size={24} />
              </div>
            </Link>
            <Link to="/seller/settings" className={cn("flex flex-col items-center gap-1", location.pathname === '/seller/settings' ? "text-orange-500" : "text-zinc-400")}>
              <div className={cn("p-2 rounded-xl transition-colors", location.pathname === '/seller/settings' ? "bg-orange-100" : "hover:bg-zinc-100")}>
                <Settings size={24} />
              </div>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

// --- Admin Module ---

const AdminPanel = ({ user, onLogout }: { user: User, onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [financeSubTab, setFinanceSubTab] = useState<'payments' | 'saas'>('payments');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>({
    stats: { totalClients: 0, activeClients: 0, totalEstablishments: 0, pendingSupport: 0, expiredLicenses: 0, expiringSoon: 0 },
    recentClients: []
  });
  const [clients, setClients] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [monitoring, setMonitoring] = useState<any>({
    stats: { totalTransactions: 0, todayTransactions: 0, activeUsers: 0, totalEstablishments: 0 },
    recentActivity: [],
    systemAlerts: [],
    memory: { rss: 0, heapTotal: 0, heapUsed: 0 },
    uptime: 0
  });
  const [reportsData, setReportsData] = useState<any>({
    revenueByMonth: [],
    clientGrowth: [],
    licensesByPlan: [],
    ticketsByStatus: []
  });
  const [plans, setPlans] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any>({
    payments: [],
    stats: { totalToday: 0, totalMonth: 0, totalYear: 0, count: 0 },
    pendingPayments: [],
    reports: { byMonth: [], byPlan: [], byClient: [] },
    methods: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Support Chat States
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [supportFilter, setSupportFilter] = useState('open');

  // New states for client management
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientDetails, setClientDetails] = useState<any>(null);
  const [isClientDetailsOpen, setIsClientDetailsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isLicenseHistoryModalOpen, setIsLicenseHistoryModalOpen] = useState(false);
  const [licenseHistory, setLicenseHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('ALL');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "primary";
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [licenseSearchQuery, setLicenseSearchQuery] = useState('');
  const [licenseFilterStatus, setLicenseFilterStatus] = useState('all');
  const [licenseFilterPlan, setLicenseFilterPlan] = useState('all');

  const [clientFormData, setClientFormData] = useState({
    name: '',
    company_name: '',
    email: '',
    password: '',
    phone: '',
    nif: '',
    address: ''
  });

  const [licenseFormData, setLicenseFormData] = useState({
    plan_type: '',
    duration_months: 1,
    establishment_id: '',
    user_id: ''
  });

  // Settings States
  const [systemSettings, setSystemSettings] = useState<any>({
    expiration_notice: 'true',
    weekly_reports: 'false',
    system_name: 'Fatu-R'
  });
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    price: 0,
    max_establishments: 1,
    max_products: 100,
    description: '',
    features: { reports: true, multi_establishment: false }
  });

  // System Finance States (SaaS)
  const [systemInvoices, setSystemInvoices] = useState<any[]>([]);
  const [systemAuditLogs, setSystemAuditLogs] = useState<any[]>([]);
  const [isSystemInvoiceModalOpen, setIsSystemInvoiceModalOpen] = useState(false);
  const [systemInvoiceFormData, setSystemInvoiceFormData] = useState<any>({
    doc_type: 'FT',
    owner_id: '',
    total_amount: 0,
    tax_amount: 0,
    tax_percentage: 14,
    items: [{ description: '', amount: 0 }],
    payment_method: 'bank_transfer'
  });
  const [isSystemInvoicePreviewOpen, setIsSystemInvoicePreviewOpen] = useState(false);
  const [selectedSystemInvoice, setSelectedSystemInvoice] = useState<any>(null);
  const [isLiquidating, setIsLiquidating] = useState(false);

  // Integrated Payment States
  const [isSystemPaymentModalOpen, setIsSystemPaymentModalOpen] = useState(false);
  const [systemPaymentFormData, setSystemPaymentFormData] = useState({
    owner_id: '',
    payment_method: 'bank_transfer',
    payments: [] as {ft_id: number, amount: number, invoice_number: string, balance: number}[],
    total_amount: 0
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoints = [
        '/api/admin/dashboard',
        '/api/admin/clients',
        '/api/admin/licenses',
        '/api/admin/support',
        '/api/admin/monitoring',
        '/api/admin/plans',
        '/api/admin/reports',
        '/api/admin/settings',
        '/api/admin/finance',
        '/api/admin/system/invoices',
        '/api/admin/system/audit-logs'
      ];

      const responses = await Promise.all(endpoints.map(url => fetch(url)));
      
      const failed = responses.find(r => !r.ok);
      if (failed) {
        throw new Error(`Failed to fetch ${failed.url}: ${failed.statusText}`);
      }

      const [dashData, clientsData, licensesData, ticketsData, monitoringData, plansData, reportsData, settingsData, financeData, systemInvoicesData, auditLogsData] = await Promise.all(
        responses.map(r => r.json())
      );

      setDashboardData(dashData || { stats: {}, recentClients: [] });
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setLicenses(Array.isArray(licensesData) ? licensesData : []);
      setTickets(Array.isArray(ticketsData) ? ticketsData : []);
      setMonitoring(monitoringData || { stats: {}, recentActivity: [], systemAlerts: [], memory: {}, uptime: 0 });
      setPlans(Array.isArray(plansData) ? plansData : []);
      setReportsData(reportsData || { revenueByMonth: [], clientGrowth: [], licensesByPlan: [], ticketsByStatus: [] });
      setSystemSettings(settingsData || {});
      setFinanceData(financeData || { payments: [], stats: {}, pendingPayments: [], reports: {}, methods: [] });
      setSystemInvoices(Array.isArray(systemInvoicesData) ? systemInvoicesData : []);
      setSystemAuditLogs(Array.isArray(auditLogsData) ? auditLogsData : []);
    } catch (e: any) {
      console.error("Error fetching admin data", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClientDetails = async (clientId: number) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/details`);
      if (!res.ok) throw new Error("Failed to fetch client details");
      const data = await res.json();
      setClientDetails(data);
      setIsClientDetailsOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientFormData)
      });
      if (!res.ok) throw new Error("Failed to create client");
      setIsCreateModalOpen(false);
      setClientFormData({ name: '', company_name: '', email: '', password: '', phone: '', nif: '', address: '' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateClient = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const res = await fetch(`/api/admin/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientFormData)
      });
      if (!res.ok) throw new Error("Failed to update client");
      setIsEditModalOpen(false);
      fetchData();
      if (isClientDetailsOpen) fetchClientDetails(selectedClient.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (clientId: number, newStatus: string) => {
    try {
      const client = clients.find(c => c.id === clientId);
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...client, status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");
      fetchData();
      if (isClientDetailsOpen) fetchClientDetails(clientId);
    } catch (e) {
      console.error(e);
    }
  };

  // Removed handleDeleteClient as clients should stay in history

  const handleManageLicense = async (e: FormEvent) => {
    e.preventDefault();
    const userId = licenseFormData.user_id || selectedClient?.id;
    if (!userId) {
      alert("Por favor, selecione um cliente.");
      return;
    }
    if (!licenseFormData.plan_type) {
      alert("Por favor, selecione um plano.");
      return;
    }

    try {
      const selectedPlan = plans.find(p => p.name === licenseFormData.plan_type);
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + Number(licenseFormData.duration_months));
      
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          establishment_id: licenseFormData.establishment_id || null,
          plan_type: licenseFormData.plan_type,
          start_date: new Date().toISOString().split('T')[0],
          expiry_date: expiry.toISOString().split('T')[0],
          features: { 
            max_establishments: selectedPlan?.max_establishments || 1, 
            max_products: selectedPlan?.max_products || 100 
          }
        })
      });
      if (!res.ok) throw new Error("Failed to manage license");
      setIsLicenseModalOpen(false);
      setLicenseFormData({ plan_type: '', duration_months: 1, establishment_id: '', user_id: '' });
      fetchData();
      if (isClientDetailsOpen && userId === selectedClient?.id) fetchClientDetails(userId);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLicenseHistory = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/licenses/history/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch license history");
      const data = await res.json();
      setLicenseHistory(data);
      setIsLicenseHistoryModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTicketMessages = async (ticketId: number) => {
    try {
      const res = await fetch(`/api/admin/support/${ticketId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setTicketMessages(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          message: newMessage,
          is_admin: true
        })
      });

      if (res.ok) {
        setNewMessage('');
        fetchTicketMessages(selectedTicket.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTicketPriority = async (ticketId: number, priority: string) => {
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      });
      if (res.ok) {
        fetchData();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, priority });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLicenseStatus = async (licenseId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/licenses/${licenseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update license status");
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenewLicense = async (licenseId: number, months: number) => {
    try {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + months);
      const res = await fetch(`/api/admin/licenses/${licenseId}/renew`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiry_date: expiry.toISOString().split('T')[0] })
      });
      if (!res.ok) throw new Error("Failed to renew license");
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSystemInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/system/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemInvoiceFormData)
      });
      if (response.ok) {
        setIsSystemInvoiceModalOpen(false);
        fetchData();
        setSystemInvoiceFormData({
          doc_type: 'FT',
          owner_id: '',
          total_amount: 0,
          tax_amount: 0,
          items: [{ description: '', amount: 0 }],
          payment_method: 'bank_transfer'
        });
      } else {
        const err = await response.json();
        alert(err.error || "Erro ao emitir documento");
      }
    } catch (e) {
      alert("Erro na comunicação com o servidor");
    }
  };

  const handleLiquidateSystemInvoice = async (id: number, paymentMethod: string) => {
    setIsLiquidating(true);
    try {
      const response = await fetch(`/api/admin/system/invoices/${id}/liquidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: paymentMethod })
      });
      if (response.ok) {
        fetchData();
      } else {
        const err = await response.json();
        alert(err.error || "Erro ao liquidar fatura");
      }
    } catch (e) {
      alert("Erro na comunicação com o servidor");
    } finally {
      setIsLiquidating(false);
    }
  };

  const handleLiquidateMultiple = async () => {
    if (!systemPaymentFormData.owner_id || systemPaymentFormData.payments.length === 0) return;
    
    setIsLiquidating(true);
    try {
      const res = await fetch('/api/admin/system/liquidate-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: parseInt(systemPaymentFormData.owner_id),
          payments: systemPaymentFormData.payments.map(p => ({ ft_id: p.ft_id, amount: p.amount })),
          payment_method: systemPaymentFormData.payment_method,
          total_amount: systemPaymentFormData.total_amount
        })
      });
      if (res.ok) {
        setIsSystemPaymentModalOpen(false);
        fetchData();
        setSystemPaymentFormData({
            owner_id: '',
            payment_method: 'bank_transfer',
            payments: [],
            total_amount: 0
        });
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao processar pagamento.");
      }
    } catch (e) {
      alert("Falha na comunicação com o servidor.");
    } finally {
      setIsLiquidating(false);
    }
  };

  const handleSavePlan = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedPlan ? `/api/admin/plans/${selectedPlan.id}` : '/api/admin/plans';
      const method = selectedPlan ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...planFormData,
          max_establishments: planFormData.max_establishments,
          max_products: planFormData.max_products
        })
      });
      if (!res.ok) throw new Error("Failed to save plan");
      setIsPlanModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlan = async (planId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Plano",
      message: "Tem certeza que deseja excluir este plano?",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/plans/${planId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Failed to delete plan");
          fetchData();
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      const newSettings = { ...systemSettings, [key]: value };
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        setSystemSettings(newSettings);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (c.company_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (c.nif || '').includes(searchQuery);
    const matchesPlan = filterPlan === 'all' || c.current_plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const filteredLicenses = licenses.filter(l => {
    const matchesSearch = l.client_name.toLowerCase().includes(licenseSearchQuery.toLowerCase()) || 
                         (l.company_name?.toLowerCase() || '').includes(licenseSearchQuery.toLowerCase());
    const matchesPlan = licenseFilterPlan === 'all' || l.plan_type === licenseFilterPlan;
    const matchesStatus = licenseFilterStatus === 'all' || l.status === licenseFilterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Carregando painel administrativo...</div>;

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl max-w-md mx-auto">
          <AlertTriangle className="text-rose-600 mx-auto mb-4" size={48} />
          <h3 className="text-lg font-bold text-rose-900 mb-2">Erro ao carregar dados</h3>
          <p className="text-sm text-rose-700 mb-6">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-rose-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-rose-700 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="font-black text-lg leading-none">ADMIN</h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Platform Master</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'dashboard' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <LayoutDashboard size={20} />
            <span className="font-bold text-sm">Dashboard</span>
          </button>
          <button 
            onClick={() => { setActiveTab('clients'); setIsSidebarOpen(false); }}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'clients' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <Users size={20} />
            <span className="font-bold text-sm">Clientes</span>
          </button>
          <button 
            onClick={() => { setActiveTab('finance'); setIsSidebarOpen(false); }}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'finance' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <Wallet size={20} />
            <span className="font-bold text-sm">Financeiro</span>
          </button>
          <button 
            onClick={() => { setActiveTab('licenses'); setIsSidebarOpen(false); }}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'licenses' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <CreditCard size={20} />
            <span className="font-bold text-sm">Licenças</span>
          </button>
          <button 
            onClick={() => { setActiveTab('support'); setIsSidebarOpen(false); }}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'support' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <LifeBuoy size={20} />
            <span className="font-bold text-sm">Suporte</span>
          </button>
          <button 
            onClick={() => { setActiveTab('monitoring'); setIsSidebarOpen(false); }}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'monitoring' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <Monitor size={20} />
            <span className="font-bold text-sm">Monitoramento</span>
          </button>
          <button 
            onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'reports' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <FilePieChart size={20} />
            <span className="font-bold text-sm">Relatórios</span>
          </button>
          <button 
            onClick={() => { setActiveTab('audit'); setIsSidebarOpen(false); }}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'audit' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <Shield size={20} />
            <span className="font-bold text-sm">Auditoria</span>
          </button>
          <button 
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'settings' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <Settings2 size={20} />
            <span className="font-bold text-sm">Configurações</span>
          </button>
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-rose-500 hover:bg-rose-50"
          >
            <LogOut size={20} />
            <span className="font-bold text-sm">Terminar Sessão</span>
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} title="Terminar Sessão">
        <div className="space-y-6">
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-white text-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/10 border border-rose-200">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-rose-900 tracking-tighter">Sair do Painel Admin?</h3>
              <p className="text-sm text-rose-600 font-medium mt-1">
                Tem a certeza que deseja encerrar a sua sessão administrativa? Todas as janelas de gestão serão fechadas.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsLogoutModalOpen(false)}
              className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={onLogout}
              className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
            >
              Sair Agora
            </button>
          </div>
        </div>
      </Modal>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <header className="h-20 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg">
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-lg md:text-xl font-black truncate max-w-[180px] sm:max-w-none">
                {activeTab === 'dashboard' && 'Visão Geral'}
                {activeTab === 'clients' && 'Gestão de Clientes'}
                {activeTab === 'finance' && 'Gestão Financeira'}
                {activeTab === 'licenses' && 'Controle de Licenças'}
                {activeTab === 'support' && 'Centro de Suporte'}
                {activeTab === 'monitoring' && 'Monitoramento'}
                {activeTab === 'reports' && 'Relatórios'}
                {activeTab === 'audit' && 'Auditoria e Logs'}
                {activeTab === 'settings' && 'Configurações'}
              </h2>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                {new Date().toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Sistemas Online
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total de Clientes" value={dashboardData.stats.totalClients} icon={Users} color="blue" />
                <StatCard label="Clientes Ativos" value={dashboardData.stats.activeClients} icon={ShieldCheck} color="emerald" />
                <StatCard label="Estabelecimentos no Sistema" value={dashboardData.stats.totalEstablishments} icon={Store} color="amber" />
                <StatCard label="Suporte Pendente" value={dashboardData.stats.pendingSupport} icon={LifeBuoy} color="rose" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2">
                  <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="font-bold">Clientes Recentes</h3>
                    <button onClick={() => setActiveTab('clients')} className="text-xs font-bold text-zinc-400 hover:text-black transition-colors">Ver Todos</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-zinc-50">
                          <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cliente</th>
                          <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">NIF</th>
                          <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data Registro</th>
                          <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {dashboardData.recentClients.map((client: any) => (
                          <tr key={`dash-client-${client.id}`} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-600 font-bold text-xs">
                                  {client.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold">{client.name}</p>
                                  <p className="text-[10px] text-zinc-400">{client.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-zinc-600">{client.nif || '---'}</td>
                            <td className="px-6 py-4 text-sm text-zinc-500">{new Date(client.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-black uppercase",
                                client.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              )}>
                                {client.status === 'active' ? 'Ativo' : 'Suspenso'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card>
                  <div className="p-6 border-b border-zinc-100">
                    <h3 className="font-bold">Alertas de Licença</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="text-rose-600 mt-0.5" size={18} />
                      <div>
                        <p className="text-sm font-bold text-rose-900">{dashboardData.stats.expiredLicenses} Licenças Expiradas</p>
                        <p className="text-xs text-rose-600 mt-1">Clientes sem acesso ao sistema.</p>
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                      <Calendar className="text-amber-600 mt-0.5" size={18} />
                      <div>
                        <p className="text-sm font-bold text-amber-900">{dashboardData.stats.expiringSoon} Expirações Próximas</p>
                        <p className="text-xs text-amber-600 mt-1">Vencimento nos próximos 7 dias.</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('licenses')} className="w-full py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all">
                      Gerenciar Licenças
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8">
              {/* Seletor de Sub-Abas Financeiras */}
              <div className="flex bg-zinc-100 p-1 rounded-2xl w-fit">
                <button
                  onClick={() => setFinanceSubTab('payments')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    financeSubTab === 'payments' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  Pagamentos Clientes
                </button>
                <button
                  onClick={() => setFinanceSubTab('saas')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    financeSubTab === 'saas' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  Faturação SaaS
                </button>
              </div>

              {financeSubTab === 'payments' ? (
                <div className="space-y-8">
                  {/* 1️⃣ Resumo Financeiro Clientes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Total Ganho Hoje" value={`Kz ${(financeData.stats.totalToday || 0).toLocaleString()}`} icon={DollarSign} color="emerald" />
                    <StatCard label="Total Ganho no Mês" value={`Kz ${(financeData.stats.totalMonth || 0).toLocaleString()}`} icon={TrendingUp} color="blue" />
                    <StatCard label="Total Ganho no Ano" value={`Kz ${(financeData.stats.totalYear || 0).toLocaleString()}`} icon={Activity} color="indigo" />
                    <StatCard label="Pagamentos Recebidos" value={financeData.stats.count} icon={CreditCard} color="amber" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 2️⃣ Receitas do Mês */}
                    <Card className="lg:col-span-2">
                      <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-bold">Receitas do Mês</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-zinc-50">
                              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cliente</th>
                              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor</th>
                              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Plano/Licença</th>
                              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50">
                            {financeData.payments.filter((p: any) => p.timestamp.startsWith(new Date().toISOString().substring(0, 7))).map((payment: any) => (
                              <tr key={`fin-rec-pay-${payment.id}`} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="text-sm font-bold">{payment.client_name}</p>
                                </td>
                                <td className="px-6 py-4 text-sm font-black text-emerald-600">Kz {payment.amount.toLocaleString()}</td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-zinc-100 rounded-lg text-[10px] font-bold text-zinc-600 uppercase">
                                    {payment.plan_name}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-zinc-500">{new Date(payment.timestamp).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>

                    {/* 4️⃣ Pagamentos Pendentes & Licenças a Expirar */}
                    <Card>
                      <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-bold">Dívidas Pendentes</h3>
                        <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                          <AlertTriangle size={18} />
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        {financeData.pendingPayments.length === 0 ? (
                          <p className="text-sm text-zinc-400 text-center py-4">Nenhuma dívida pendente.</p>
                        ) : (
                          financeData.pendingPayments.map((pending: any) => (
                            <div key={`fin-pending-${pending.establishment_id}`} className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-sm font-bold text-zinc-900">{pending.client_name}</p>
                                  <p className="text-[10px] text-zinc-400 font-bold uppercase">{pending.invoice_number}</p>
                                </div>
                                <span className="text-sm font-black text-rose-600">Kz {pending.balance.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-zinc-400">
                                <span>Total: Kz {pending.amount.toLocaleString()}</span>
                                <span className={cn("px-2 py-0.5 rounded font-black uppercase", pending.paid > 0 ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-400")}>
                                  {pending.paid > 0 ? 'Parcial' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                        <button 
                          onClick={() => {
                            setSystemPaymentFormData({
                              owner_id: '',
                              payment_method: 'bank_transfer',
                              payments: [],
                              total_amount: 0
                            });
                            setIsSystemPaymentModalOpen(true);
                          }}
                          className="w-full py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10"
                        >
                          <CreditCard size={18} /> Liquidar Dívidas
                        </button>
                      </div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="p-6">
                      <h3 className="font-bold mb-6">Receita por Mês</h3>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={financeData.reports.byMonth.slice().reverse()}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Area type="monotone" dataKey="total" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="font-bold mb-6">Receita por Plano</h3>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={financeData.reports.byPlan}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="total"
                              nameKey="plan_name"
                            >
                              {financeData.reports.byPlan.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b'][index % 3]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="font-bold mb-6">Métodos de Pagamento</h3>
                      <div className="space-y-4">
                        {financeData.methods.map((method: any) => (
                          <div key={method.payment_method} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-zinc-600 shadow-sm">
                                {method.payment_method === 'Dinheiro' && <DollarSign size={16} />}
                                {method.payment_method === 'Transferência' && <ArrowRightLeft size={16} />}
                                {method.payment_method === 'Multicaixa' && <CreditCard size={16} />}
                                {method.payment_method === 'Outros' && <Wallet size={16} />}
                              </div>
                              <div>
                                <p className="text-xs font-bold">{method.payment_method}</p>
                                <p className="text-[10px] text-zinc-400">{method.count} pagamentos</p>
                              </div>
                            </div>
                            <p className="text-sm font-black">Kz {method.total.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Resumo SaaS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Total Faturado (SaaS)" value={`Kz ${systemInvoices.filter(i => i.doc_type !== 'RC').reduce((sum, i) => sum + i.total_amount, 0).toLocaleString()}`} icon={BadgeDollarSign} color="blue" />
                    <StatCard label="Recebido" value={`Kz ${systemInvoices.filter(i => i.status === 'paid' && i.doc_type !== 'RC').reduce((sum, i) => sum + i.total_amount, 0).toLocaleString()}`} icon={CheckCircle2} color="emerald" />
                    <StatCard label="Pendente" value={`Kz ${systemInvoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.total_amount, 0).toLocaleString()}`} icon={Clock} color="amber" />
                    <StatCard label="Logs de Auditoria" value={systemAuditLogs.length} icon={Shield} color="zinc" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2">
                       <div className="p-6 border-b border-zinc-100 flex items-center justify-between font-bold">
                        <h3>Gestão de Faturação SaaS</h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={async () => {
                              const res = await fetch('/api/admin/system/generate-recurring', { method: 'POST' });
                              const data = await res.json();
                              alert(`Processamento concluído: ${data.generated} geradas, ${data.skipped} ignoradas.`);
                              fetchData();
                            }}
                            className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-all flex items-center gap-2"
                          >
                            <RefreshCw size={16} /> Cobranças Recorrentes
                          </button>
                          <button onClick={() => setIsSystemInvoiceModalOpen(true)} className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-2">
                            <Plus size={16} /> Novo Documento
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-zinc-50">
                              <th className="px-6 py-4 font-black text-zinc-400 uppercase tracking-widest">Documento</th>
                              <th className="px-6 py-4 font-black text-zinc-400 uppercase tracking-widest">Cliente</th>
                              <th className="px-6 py-4 font-black text-zinc-400 uppercase tracking-widest text-right">Total</th>
                              <th className="px-6 py-4 font-black text-zinc-400 uppercase tracking-widest text-right">Liquidado</th>
                              <th className="px-6 py-4 font-black text-zinc-400 uppercase tracking-widest">Estado</th>
                              <th className="px-6 py-4 font-black text-zinc-400 uppercase tracking-widest text-right">Acções</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50">
                            {systemInvoices.map((inv) => (
                              <tr key={`sys-inv-fin-${inv.id}`} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="font-bold">{inv.invoice_number}</p>
                                  <p className="text-[10px] text-zinc-400 uppercase font-black">{inv.doc_type}</p>
                                </td>
                                <td className="px-6 py-4 font-bold">{inv.owner_name}</td>
                                <td className="px-6 py-4 font-black text-right text-sm">Kz {inv.total_amount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">
                                  <p className="text-sm font-bold text-emerald-600">Kz {(inv.paid_amount || 0).toLocaleString()}</p>
                                  {inv.total_amount - (inv.paid_amount || 0) > 0 && (
                                    <p className="text-[10px] text-rose-500 font-bold">Falta Kz {(inv.total_amount - (inv.paid_amount || 0)).toLocaleString()}</p>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2 py-1 rounded-full text-[10px] font-black uppercase", 
                                    inv.status === 'paid' ? "bg-emerald-100 text-emerald-700" : 
                                    inv.status === 'partial' ? "bg-amber-100 text-amber-700" :
                                    "bg-zinc-100 text-zinc-700"
                                  )}>
                                    {inv.status === 'paid' ? 'Liquidado' : inv.status === 'partial' ? 'Parcial' : 'Pendente'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => { setSelectedSystemInvoice(inv); setIsSystemInvoicePreviewOpen(true); }} className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg">
                                      <Eye size={16} />
                                    </button>
                                    {inv.status !== 'paid' && inv.doc_type === 'FT' && (
                                      <button 
                                        onClick={() => {
                                          setSystemPaymentFormData({
                                            owner_id: inv.owner_id.toString(),
                                            payment_method: 'bank_transfer',
                                            payments: [{ ft_id: inv.id, amount: inv.total_amount - (inv.paid_amount || 0), invoice_number: inv.invoice_number, balance: inv.total_amount - (inv.paid_amount || 0) }],
                                            total_amount: inv.total_amount - (inv.paid_amount || 0)
                                          });
                                          setIsSystemPaymentModalOpen(true);
                                        }}
                                        className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                        title="Liquidar"
                                      >
                                        <Wallet size={16} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                    <Card className="flex flex-col">
                      <div className="p-6 border-b border-zinc-100 font-bold">
                        <h3>Log de Atividade SaaS</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto max-h-[500px] p-6 space-y-6">
                        {systemAuditLogs.map((log) => (
                          <div key={log.id} className="relative pl-6 border-l-2 border-zinc-100 pb-2">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-zinc-200 rounded-full" />
                            <div className="mb-1 flex items-center justify-between">
                              <p className="text-[10px] font-black text-black uppercase">{log.action}</p>
                              <span className="text-[10px] text-zinc-400 font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">{log.details}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Pesquisar por nome, empresa, NIF..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                  <div className="flex flex-1 md:flex-none gap-4 w-full md:w-auto">
                    <select 
                      value={filterPlan}
                      onChange={(e) => setFilterPlan(e.target.value)}
                      className="flex-1 md:flex-none px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm font-bold"
                    >
                      <option value="all">Todos os Planos</option>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex-1 md:flex-none px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm font-bold"
                    >
                      <option value="all">Todos os Estados</option>
                      <option value="active">Ativos</option>
                      <option value="suspended">Suspensos</option>
                      <option value="blocked">Bloqueados</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full lg:w-auto flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all whitespace-nowrap"
                >
                  <Plus size={20} />
                  Novo Cliente
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-blue-50 border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Clientes</p>
                  <h3 className="text-3xl font-black text-blue-900">{clients.length}</h3>
                </Card>
                <Card className="p-6 bg-emerald-50 border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Clientes Ativos</p>
                  <h3 className="text-3xl font-black text-emerald-900">{clients.filter(c => c.status === 'active').length}</h3>
                </Card>
                <Card className="p-6 bg-rose-50 border-rose-100">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Suspensos/Bloqueados</p>
                  <h3 className="text-3xl font-black text-rose-900">{clients.filter(c => c.status !== 'active').length}</h3>
                </Card>
              </div>

              <Card>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-50">
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Empresa / Proprietário</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Contacto</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Plano Atual</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estabelecimentos</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estado</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Acções</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {filteredClients.map((client: any) => (
                        <tr key={`desktop-${client.id}`} className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => fetchClientDetails(client.id)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600 font-bold">
                                {client.company_name ? client.company_name.charAt(0) : client.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{client.company_name || 'Individual'}</p>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{client.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-zinc-600">{client.email}</p>
                            <p className="text-[10px] text-zinc-400">{client.phone || 'Sem telefone'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-black uppercase",
                              client.current_plan === 'pro' ? "bg-purple-100 text-purple-700" : 
                              client.current_plan === 'enterprise' ? "bg-blue-100 text-blue-700" : 
                              "bg-zinc-100 text-zinc-700"
                            )}>
                              {client.current_plan || 'Sem Plano'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-zinc-600">{client.establishment_count}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-black uppercase",
                              client.status === 'active' ? "bg-emerald-100 text-emerald-700" : 
                              client.status === 'suspended' ? "bg-amber-100 text-amber-700" :
                              "bg-rose-100 text-rose-700"
                            )}>
                              {client.status === 'active' ? 'Ativo' : client.status === 'suspended' ? 'Suspenso' : 'Bloqueado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedClient(client);
                                  setClientFormData({
                                    name: client.name,
                                    company_name: client.company_name || '',
                                    email: client.email,
                                    password: '',
                                    phone: client.phone || '',
                                    nif: client.nif || '',
                                    address: client.address || ''
                                  });
                                  setIsEditModalOpen(true);
                                }}
                                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedClient(client);
                                  setIsLicenseModalOpen(true);
                                }}
                                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-emerald-600 transition-all"
                              >
                                <CreditCard size={16} />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(client.id, client.status === 'active' ? 'suspended' : 'active')}
                                className={cn(
                                  "p-2 hover:bg-zinc-100 rounded-lg transition-all",
                                  client.status === 'active' ? "text-zinc-400 hover:text-rose-500" : "text-emerald-400 hover:text-emerald-600"
                                )}
                              >
                                {client.status === 'active' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-zinc-100">
                  {filteredClients.map((client: any) => (
                    <div key={`mobile-${client.id}`} className="p-4 space-y-4" onClick={() => fetchClientDetails(client.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600 font-bold">
                            {client.company_name ? client.company_name.charAt(0) : client.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{client.company_name || 'Individual'}</p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{client.name}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-black uppercase",
                          client.status === 'active' ? "bg-emerald-100 text-emerald-700" : 
                          client.status === 'suspended' ? "bg-amber-100 text-amber-700" :
                          "bg-rose-100 text-rose-700"
                        )}>
                          {client.status === 'active' ? 'Ativo' : client.status === 'suspended' ? 'Suspenso' : 'Bloqueado'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 py-2 border-y border-zinc-50">
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Contacto</p>
                          <p className="text-xs font-medium text-zinc-600 truncate">{client.email}</p>
                          <p className="text-[10px] text-zinc-400">{client.phone || 'Sem telefone'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Plano / Estabelecimentos</p>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                              client.current_plan === 'pro' ? "bg-purple-100 text-purple-700" : 
                              client.current_plan === 'enterprise' ? "bg-blue-100 text-blue-700" : 
                              "bg-zinc-100 text-zinc-700"
                            )}>
                              {client.current_plan || 'Sem Plano'}
                            </span>
                            <span className="text-xs font-bold text-zinc-600">{client.establishment_count} estabelecimentos</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            setSelectedClient(client);
                            setClientFormData({
                              name: client.name,
                              company_name: client.company_name || '',
                              email: client.email,
                              password: '',
                              phone: client.phone || '',
                              nif: client.nif || '',
                              address: client.address || ''
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-600 text-xs font-bold transition-all"
                        >
                          <Edit2 size={14} /> Editar
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedClient(client);
                            setIsLicenseModalOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-600 text-xs font-bold transition-all"
                        >
                          <CreditCard size={14} /> Licença
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(client.id, client.status === 'active' ? 'suspended' : 'active')}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            client.status === 'active' ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"
                          )}
                        >
                          {client.status === 'active' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'licenses' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar por cliente ou empresa..." 
                      value={licenseSearchQuery}
                      onChange={(e) => setLicenseSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                  <div className="flex flex-1 md:flex-none gap-4 w-full md:w-auto">
                    <select 
                      value={licenseFilterPlan}
                      onChange={(e) => setLicenseFilterPlan(e.target.value)}
                      className="flex-1 md:flex-none px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm font-bold"
                    >
                      <option value="all">Todos os Planos</option>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                    <select 
                      value={licenseFilterStatus}
                      onChange={(e) => setLicenseFilterStatus(e.target.value)}
                      className="flex-1 md:flex-none px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm font-bold"
                    >
                      <option value="all">Todos os Estados</option>
                      <option value="active">Ativas</option>
                      <option value="expired">Expiradas</option>
                      <option value="suspended">Suspensas</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => setIsLicenseModalOpen(true)}
                  className="w-full lg:w-auto flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all whitespace-nowrap"
                >
                  <Plus size={20} />
                  Nova Licença
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-emerald-50 border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Ativas</p>
                  <h3 className="text-3xl font-black text-emerald-900">{licenses.filter(l => l.status === 'active').length}</h3>
                </Card>
                <Card className="p-6 bg-amber-50 border-amber-100">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">A Expirar (7 dias)</p>
                  <h3 className="text-3xl font-black text-amber-900">{dashboardData.stats.expiringSoon}</h3>
                </Card>
                <Card className="p-6 bg-rose-50 border-rose-100">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Expiradas</p>
                  <h3 className="text-3xl font-black text-rose-900">{dashboardData.stats.expiredLicenses}</h3>
                </Card>
              </div>

              <Card>
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="font-bold">Gestão de Licenciamento</h3>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-50">
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cliente / Empresa</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Plano</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Início</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Expiração</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estado</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Acções</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {filteredLicenses.map((license: any) => (
                        <tr key={`lic-desktop-${license.id}`} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold">{license.company_name || license.client_name}</p>
                            <p className="text-[10px] text-zinc-400">{license.establishment_name || 'Licença Global'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 text-[10px] font-black rounded-full uppercase",
                              license.plan_type === 'enterprise' ? "bg-purple-100 text-purple-700" :
                              license.plan_type === 'pro' ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-600"
                            )}>
                              {license.plan_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-500">{new Date(license.start_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm font-bold text-zinc-700">{new Date(license.expiry_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-black uppercase",
                              license.status === 'active' ? "bg-emerald-100 text-emerald-700" : 
                              license.status === 'suspended' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {license.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => fetchLicenseHistory(license.user_id)}
                                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black transition-all"
                                title="Ver Histórico"
                              >
                                <History size={16} />
                              </button>
                              <button 
                                onClick={() => handleRenewLicense(license.id, 1)}
                                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black transition-all"
                                title="Renovar 1 mês"
                              >
                                <Calendar size={16} />
                              </button>
                              <button 
                                onClick={() => handleUpdateLicenseStatus(license.id, license.status === 'active' ? 'suspended' : 'active')}
                                className={cn(
                                  "p-2 rounded-lg transition-all",
                                  license.status === 'active' ? "text-amber-400 hover:bg-amber-50 hover:text-amber-600" : "text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                                )}
                                title={license.status === 'active' ? 'Suspender' : 'Reativar'}
                              >
                                {license.status === 'active' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                              </button>
                              <button 
                                onClick={() => handleUpdateLicenseStatus(license.id, 'expired')}
                                className="p-2 hover:bg-rose-50 rounded-lg text-rose-400 hover:text-rose-600 transition-all"
                                title="Cancelar / Expirar"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-zinc-50">
                  {filteredLicenses.map((license: any) => (
                    <div key={`lic-mobile-${license.id}`} className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold">{license.company_name || license.client_name}</p>
                          <p className="text-[10px] text-zinc-400">{license.establishment_name || 'Licença Global'}</p>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-black uppercase",
                          license.status === 'active' ? "bg-emerald-100 text-emerald-700" : 
                          license.status === 'suspended' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {license.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-2 border-y border-zinc-50">
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Plano</p>
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-black rounded-full uppercase",
                            license.plan_type === 'enterprise' ? "bg-purple-100 text-purple-700" :
                            license.plan_type === 'pro' ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-600"
                          )}>
                            {license.plan_type}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Expiração</p>
                          <p className="text-xs font-bold text-zinc-700">{new Date(license.expiry_date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button 
                          onClick={() => fetchLicenseHistory(license.user_id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-600 text-xs font-bold transition-all"
                        >
                          <History size={14} /> Histórico
                        </button>
                        <button 
                          onClick={() => handleRenewLicense(license.id, 1)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-900 hover:bg-black rounded-lg text-white text-xs font-bold transition-all"
                        >
                          <Calendar size={14} /> Renovar
                        </button>
                        <button 
                          onClick={() => handleUpdateLicenseStatus(license.id, license.status === 'active' ? 'suspended' : 'active')}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            license.status === 'active' ? "bg-amber-50 text-amber-500" : "bg-emerald-50 text-emerald-500"
                          )}
                        >
                          {license.status === 'active' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                        </button>
                        <button 
                          onClick={() => handleUpdateLicenseStatus(license.id, 'expired')}
                          className="p-2 bg-rose-50 rounded-lg text-rose-400 hover:text-rose-600 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto lg:h-[calc(100vh-180px)]">
              <div className={cn(
                "lg:col-span-1 flex flex-col gap-6 overflow-hidden",
                selectedTicket ? "hidden lg:flex" : "flex"
              )}>
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex flex-wrap gap-2">
                    {['open', 'pending', 'closed'].map((status) => (
                      <button 
                        key={status}
                        onClick={() => setSupportFilter(status)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          supportFilter === status 
                            ? "bg-black text-white shadow-lg shadow-black/20" 
                            : "bg-white text-zinc-400 border border-zinc-200 hover:bg-zinc-50"
                        )}
                      >
                        {status === 'open' ? 'Abertos' : status === 'pending' ? 'Pendentes' : 'Fechados'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar min-h-[400px] lg:min-h-0">
                  {tickets.filter(t => t.status === supportFilter).map((ticket: any) => (
                    <Card 
                      key={`ticket-${ticket.id}`} 
                      onClick={() => {
                        setSelectedTicket(ticket);
                        fetchTicketMessages(ticket.id);
                      }}
                      className={cn(
                        "p-4 cursor-pointer transition-all border-l-4",
                        selectedTicket?.id === ticket.id ? "border-black bg-zinc-50" : "border-transparent hover:bg-zinc-50",
                        ticket.priority === 'high' ? "border-l-rose-500" : ticket.priority === 'medium' ? "border-l-amber-500" : "border-l-emerald-500"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-sm truncate flex-1 mr-2">{ticket.subject}</h4>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                          ticket.priority === 'high' ? "bg-rose-100 text-rose-700" : ticket.priority === 'medium' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-1 mb-2">{ticket.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-400">{ticket.client_name}</span>
                        <span className="text-[10px] text-zinc-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </Card>
                  ))}
                  {tickets.filter(t => t.status === supportFilter).length === 0 && (
                    <div className="text-center py-12">
                      <LifeBuoy className="mx-auto text-zinc-200 mb-4" size={48} />
                      <p className="text-zinc-400 font-bold">Sem tickets {supportFilter}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={cn(
                "lg:col-span-2 flex flex-col overflow-hidden",
                !selectedTicket ? "hidden lg:flex" : "flex h-[calc(100vh-200px)] lg:h-auto"
              )}>
                {selectedTicket ? (
                  <Card className="flex-1 flex flex-col">
                    <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-zinc-50 lg:bg-white">
                      <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-2 hover:bg-zinc-200 rounded-lg transition-colors">
                          <ChevronLeft size={20} />
                        </button>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-600">
                          <UserIcon size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base md:text-lg leading-tight truncate">{selectedTicket.subject}</h3>
                          <p className="text-[10px] md:text-xs text-zinc-400 truncate">Cliente: <span className="font-bold text-zinc-900">{selectedTicket.client_name}</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <select 
                          value={selectedTicket.priority}
                          onChange={(e) => handleUpdateTicketPriority(selectedTicket.id, e.target.value)}
                          className="text-[8px] md:text-[10px] font-black uppercase bg-zinc-100 lg:bg-zinc-50 border-none rounded-lg px-2 py-1 outline-none"
                        >
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                        </select>
                        <select 
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                          className="text-[8px] md:text-[10px] font-black uppercase bg-zinc-100 lg:bg-zinc-50 border-none rounded-lg px-2 py-1 outline-none"
                        >
                          <option value="open">Aberto</option>
                          <option value="pending">Pendente</option>
                          <option value="closed">Fechado</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/50 custom-scrollbar">
                      <div className="flex justify-center">
                        <span className="px-3 py-1 bg-white border border-zinc-100 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          Ticket criado em {new Date(selectedTicket.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-8 h-8 bg-zinc-200 rounded-xl flex items-center justify-center shrink-0">
                          <UserIcon size={16} />
                        </div>
                        <div className="max-w-[80%] bg-white p-4 rounded-2xl rounded-tl-none border border-zinc-100 shadow-sm">
                          <p className="text-sm text-zinc-800 leading-relaxed">{selectedTicket.description}</p>
                        </div>
                      </div>

                      {ticketMessages.map((msg) => (
                        <div key={`ticket-msg-${msg.id}`} className={cn("flex gap-4", msg.is_admin ? "flex-row-reverse" : "")}>
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", msg.is_admin ? "bg-black text-white" : "bg-orange-100 text-orange-600")}>
                            {msg.is_admin ? <ShieldCheck size={16} /> : <UserIcon size={16} />}
                          </div>
                          <div className={cn(
                            "max-w-[80%] p-4 rounded-2xl shadow-sm border",
                            msg.is_admin 
                              ? "bg-black text-white border-black rounded-tr-none" 
                              : "bg-orange-500 text-white border-orange-500 rounded-tl-none"
                          )}>
                            <p className="text-sm leading-relaxed">{msg.message}</p>
                            <p className={cn("text-[8px] mt-2 font-bold uppercase tracking-widest opacity-50", msg.is_admin ? "text-right" : "")}>
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 border-t border-zinc-100 bg-white shrink-0">
                      <form onSubmit={handleSendMessage} className="flex gap-4">
                        <input 
                          type="text" 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Escreva sua resposta aqui..."
                          className="flex-1 px-4 py-3 bg-zinc-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                        />
                        <button 
                          type="submit"
                          disabled={!newMessage.trim() || isSendingMessage}
                          className="px-6 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSendingMessage ? 'Enviando...' : 'Enviar'}
                          <ChevronRight size={18} />
                        </button>
                      </form>
                    </div>
                  </Card>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center bg-white border border-zinc-200 rounded-xl border-dashed">
                    <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200 mb-6">
                      <LifeBuoy size={48} />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-400">Seleccione um ticket para visualizar</h3>
                    <p className="text-sm text-zinc-300 mt-2">Escolha uma solicitação na lista à esquerda para iniciar o atendimento.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <Cpu size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estado da API</p>
                      <h4 className="font-bold text-emerald-600">Operacional</h4>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Latência</span>
                      <span className="font-bold">42ms</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[15%]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <Activity size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Uptime</p>
                      <h4 className="font-bold text-blue-600">99.98%</h4>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Tempo de Atividade</span>
                      <span className="font-bold">{Math.floor(monitoring.uptime / 3600)}h {Math.floor((monitoring.uptime % 3600) / 60)}m</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[99%]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <Zap size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Uso de Memória</p>
                      <h4 className="font-bold text-amber-600">{monitoring.memory.heapUsed} MB</h4>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Heap Total</span>
                      <span className="font-bold">{monitoring.memory.heapTotal} MB</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${(monitoring.memory.heapUsed / monitoring.memory.heapTotal) * 100}%` }} />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                      <Database size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Base de Dados</p>
                      <h4 className="font-bold text-rose-600">Saudável</h4>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Transações</span>
                      <span className="font-bold">{monitoring.stats.totalTransactions}</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 w-[40%]" />
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2">
                  <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="font-bold">Actividade Recente da Plataforma</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Live Updates</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      {monitoring.recentActivity.map((activity: any) => (
                        <div key={`monitor-act-${activity.id}`} className="flex items-start gap-4 group">
                          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-black group-hover:text-white transition-all">
                            <ShoppingCart size={18} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <p className="text-sm">
                                <span className="font-bold">Nova {activity.type}</span> processada em <span className="font-bold">{activity.establishment_name}</span>
                              </p>
                              <span className="text-[10px] font-bold text-zinc-400">{new Date(activity.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">Valor: <span className="text-zinc-900 font-bold">Kz {activity.value.toLocaleString()}</span></p>
                          </div>
                        </div>
                      ))}
                      {monitoring.recentActivity.length === 0 && (
                        <div className="text-center py-12">
                          <Clock className="mx-auto text-zinc-200 mb-4" size={48} />
                          <p className="text-zinc-400 font-bold">Nenhuma actividade recente detectada</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <div className="space-y-8">
                  <Card>
                    <div className="p-6 border-b border-zinc-100">
                      <h3 className="font-bold">Alertas do Sistema</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {monitoring.systemAlerts.map((alert: any, idx: number) => (
                        <div key={`system-alert-${idx}`} className={cn(
                          "p-4 rounded-xl border flex gap-3",
                          alert.level === 'danger' ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-amber-50 border-amber-100 text-amber-700"
                        )}>
                          <AlertTriangle size={20} className="shrink-0" />
                          <div>
                            <p className="text-xs font-bold leading-tight">{alert.message}</p>
                            <p className="text-[10px] opacity-60 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                      {monitoring.systemAlerts.length === 0 && (
                        <div className="text-center py-8">
                          <ShieldCheck className="mx-auto text-emerald-100 mb-2" size={32} />
                          <p className="text-xs text-zinc-400 font-bold">Nenhum alerta crítico</p>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6 bg-black text-white">
                    <h4 className="text-xs font-black uppercase tracking-widest opacity-60 mb-4">Recursos Utilizados</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                          <span>CPU Usage</span>
                          <span>12%</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white w-[12%]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                          <span>Disk Space</span>
                          <span>45%</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white w-[45%]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                          <span>Network In/Out</span>
                          <span>2.4 MB/s</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white w-[30%]" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold">Receita Mensal (Kz)</h3>
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase">
                      <TrendingUp size={12} />
                      +14.5% Crescimento
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportsData.revenueByMonth.map((d: any) => ({
                        name: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][parseInt(d.month) - 1],
                        value: d.total
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#000" fill="#000" fillOpacity={0.05} strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold mb-6">Crescimento de Clientes (Owners)</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportsData.clientGrowth.map((d: any) => ({
                        name: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][parseInt(d.month) - 1],
                        value: d.count
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" fill="#000" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold mb-6">Distribuição de Planos Activos</h3>
                  <div className="h-[300px] flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportsData.licensesByPlan}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {reportsData.licensesByPlan.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={['#000', '#3b82f6', '#10b981', '#f59e0b'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold mb-6">Estado dos Tickets de Suporte</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={reportsData.ticketsByStatus}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                        <XAxis type="number" axisLine={false} tickLine={false} hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {reportsData.ticketsByStatus.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.name === 'open' ? '#ef4444' : entry.name === 'in_progress' ? '#3b82f6' : '#10b981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="flex justify-end gap-4">
                <button 
                  onClick={() => window.open('/api/admin/reports/export/csv', '_blank')}
                  className="flex items-center gap-2 px-6 py-3 border border-zinc-200 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all"
                >
                  <FileText size={18} />
                  Exportar CSV
                </button>
                <button 
                  onClick={() => window.open('/api/admin/reports/export/pdf', '_blank')}
                  className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
                >
                  <FilePieChart size={18} />
                  Gerar Relatório PDF
                </button>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <AdminAuditLogs />
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-8">
              <Card>
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="font-bold">Planos de Subscrição</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => window.open('/api/admin/reports/plans/pdf', '_blank')}
                      className="px-4 py-2 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-all flex items-center gap-2"
                    >
                      <FilePieChart size={16} />
                      Gerar Guia de Planos
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedPlan(null);
                        setPlanFormData({ name: '', price: 0, max_establishments: 1, max_products: 100, description: '', features: { reports: true, multi_establishment: false } });
                        setIsPlanModalOpen(true);
                      }}
                      className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Novo Plano
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {plans.map((plan: any) => (
                      <div key={`plan-config-${plan.id}`} className="p-6 border border-zinc-200 rounded-2xl hover:border-black transition-all group relative">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-black text-lg">{plan.name}</h4>
                            <p className="text-2xl font-black mt-1">Kz {plan.price.toLocaleString()}<span className="text-xs text-zinc-400 font-bold">/mês</span></p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setSelectedPlan(plan);
                                setPlanFormData({ 
                                  name: plan.name, 
                                  price: plan.price, 
                                  max_establishments: plan.max_establishments, 
                                  max_products: plan.max_products, 
                                  description: plan.description || '',
                                  features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features 
                                });
                                setIsPlanModalOpen(true);
                              }}
                              className="p-2 text-zinc-400 hover:text-black transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeletePlan(plan.id)}
                              className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <ul className="space-y-3 mb-6">
                          <li className="flex items-center gap-2 text-sm text-zinc-600">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            Até {plan.max_establishments} estabelecimentos
                          </li>
                          <li className="flex items-center gap-2 text-sm text-zinc-600">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            Até {plan.max_products} produtos
                          </li>
                          {plan.description && (
                            <li className="flex items-start gap-2 text-xs text-zinc-400 mt-2 italic font-medium">
                              <span>— {plan.description}</span>
                            </li>
                          )}
                        </ul>
                        <button 
                          onClick={() => {
                            setSelectedPlan(plan);
                            setPlanFormData({ 
                              name: plan.name, 
                              price: plan.price, 
                              max_establishments: plan.max_establishments, 
                              max_products: plan.max_products, 
                              description: plan.description || '',
                              features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features 
                            });
                            setIsPlanModalOpen(true);
                          }}
                          className="w-full py-3 border border-zinc-200 rounded-xl text-sm font-bold group-hover:bg-black group-hover:text-white transition-all"
                        >
                          Editar Plano
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        setSelectedPlan(null);
                        setPlanFormData({ name: '', price: 0, max_establishments: 1, max_products: 100, features: { reports: true, multi_establishment: false } });
                        setIsPlanModalOpen(true);
                      }}
                      className="p-6 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-black hover:border-black transition-all group"
                    >
                      <Plus size={32} className="group-hover:scale-110 transition-transform" />
                      <span className="font-bold">Criar Novo Plano</span>
                    </button>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="font-bold">Configurações do Sistema</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome do Sistema</label>
                      <input 
                        type="text" 
                        value={systemSettings.system_name || ''}
                        onChange={(e) => handleUpdateSetting('system_name', e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Email de Notificação (Tickets)</label>
                      <input 
                        type="email" 
                        value={systemSettings.support_notification_email || ''}
                        onChange={(e) => handleUpdateSetting('support_notification_email', e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                        placeholder="Ex: suporte@fatur.com"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-100">
                    <h4 className="font-bold text-sm mb-4">Notificações Automáticas</h4>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">Avisos de Expiração</p>
                          <p className="text-xs text-zinc-500">Enviar email automático 7 dias antes da licença expirar.</p>
                        </div>
                        <button 
                          onClick={() => handleUpdateSetting('expiration_notice', systemSettings.expiration_notice === 'true' ? 'false' : 'true')}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-all",
                            systemSettings.expiration_notice === 'true' ? "bg-emerald-500" : "bg-zinc-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            systemSettings.expiration_notice === 'true' ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">Relatórios Semanais</p>
                          <p className="text-xs text-zinc-500">Enviar resumo de performance para o administrador.</p>
                        </div>
                        <button 
                          onClick={() => handleUpdateSetting('weekly_reports', systemSettings.weekly_reports === 'true' ? 'false' : 'true')}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-all",
                            systemSettings.weekly_reports === 'true' ? "bg-emerald-500" : "bg-zinc-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            systemSettings.weekly_reports === 'true' ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Plan Modal */}
      <Modal 
        isOpen={isPlanModalOpen} 
        onClose={() => setIsPlanModalOpen(false)} 
        title={selectedPlan ? "Editar Plano" : "Novo Plano"}
      >
        <form onSubmit={handleSavePlan} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome do Plano</label>
              <input 
                type="text" 
                value={planFormData.name}
                onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                placeholder="Ex: Profissional"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Preço Mensal (Kz)</label>
              <input 
                type="number" 
                value={isNaN(Number(planFormData.price)) ? '' : planFormData.price}
                onChange={(e) => setPlanFormData({ ...planFormData, price: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Máx. Estabelecimentos</label>
              <input 
                type="number" 
                value={isNaN(Number(planFormData.max_establishments)) ? '' : planFormData.max_establishments}
                onChange={(e) => setPlanFormData({ ...planFormData, max_establishments: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Máx. Produtos</label>
              <input 
                type="number" 
                value={isNaN(Number(planFormData.max_products)) ? '' : planFormData.max_products}
                onChange={(e) => setPlanFormData({ ...planFormData, max_products: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Descrição</label>
              <textarea 
                value={planFormData.description}
                onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all min-h-[100px]"
                placeholder="Descreva as vantagens deste plano..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <h4 className="font-bold text-sm mb-4">Funcionalidades</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={planFormData.features.reports}
                  onChange={(e) => setPlanFormData({ ...planFormData, features: { ...planFormData.features, reports: e.target.checked } })}
                  className="w-5 h-5 rounded-lg border-zinc-200 text-black focus:ring-black"
                />
                <span className="text-sm font-medium text-zinc-600 group-hover:text-black transition-colors">Relatórios Avançados</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={planFormData.features.multi_establishment}
                  onChange={(e) => setPlanFormData({ ...planFormData, features: { ...planFormData.features, multi_establishment: e.target.checked } })}
                  className="w-5 h-5 rounded-lg border-zinc-200 text-black focus:ring-black"
                />
                <span className="text-sm font-medium text-zinc-600 group-hover:text-black transition-colors">Gestão Multi-Estabelecimento</span>
              </label>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-black/10"
          >
            {selectedPlan ? "Actualizar Plano" : "Criar Plano"}
          </button>
        </form>
      </Modal>

      {/* Client Details Modal */}
      <AnimatePresence>
        {isClientDetailsOpen && clientDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsClientDetailsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center text-xl font-black">
                    {clientDetails.client.company_name ? clientDetails.client.company_name.charAt(0) : clientDetails.client.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black">{clientDetails.client.company_name || 'Individual'}</h3>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{clientDetails.client.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsClientDetailsOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Estabelecimentos</p>
                        <p className="text-2xl font-black">{clientDetails.stats.totalEstablishments}</p>
                      </div>
                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Usuários</p>
                        <p className="text-2xl font-black">{clientDetails.stats.totalUsers}</p>
                      </div>
                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Atividade</p>
                        <p className="text-sm font-bold truncate">{clientDetails.stats.lastActivity ? new Date(clientDetails.stats.lastActivity).toLocaleDateString() : 'Nunca'}</p>
                      </div>
                    </div>

                    {/* Establishments List */}
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-widest text-zinc-400 mb-4">Estabelecimentos do Cliente</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.isArray(clientDetails.establishments) && clientDetails.establishments.map((establishment: any) => (
                          <div key={`client-estab-${establishment.id}`} className="p-4 border border-zinc-100 rounded-2xl flex items-center gap-4 hover:border-black transition-all">
                            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600">
                              <Store size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{establishment.name}</p>
                              <p className="text-[10px] text-zinc-400">{establishment.address}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* History Tabs */}
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-widest text-zinc-400 mb-4">Histórico de Licenças</h4>
                      <div className="space-y-3">
                        {(clientDetails.licenses || []).map((license: any) => (
                          <div key={`detail-lic-${license.id}`} className="p-4 border border-zinc-100 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400">
                                <CreditCard size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-bold">Plano {(license.plan_type || 'N/A').toUpperCase()}</p>
                                <p className="text-[10px] text-zinc-400">{license.establishment_name || 'Global'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold">Expira em {new Date(license.expiry_date).toLocaleDateString()}</p>
                              <span className={cn(
                                "text-[10px] font-black uppercase",
                                license.status === 'active' ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {license.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <Card className="p-6 bg-zinc-50 border-zinc-100">
                      <h4 className="font-black text-sm mb-4">Dados de Contacto</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                            <UserIcon size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Responsável</p>
                            <p className="text-sm font-bold">{clientDetails.client.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                            <Phone size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Telefone</p>
                            <p className="text-sm font-bold">{clientDetails.client.phone || '---'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                            <FileText size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">NIF</p>
                            <p className="text-sm font-bold">{clientDetails.client.nif || '---'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                            <Calendar size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Registrado em</p>
                            <p className="text-sm font-bold">{new Date(clientDetails.client.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <div className="space-y-2">
                      <button 
                        onClick={() => {
                          setSelectedClient(clientDetails.client);
                          setClientFormData({
                            name: clientDetails.client.name,
                            company_name: clientDetails.client.company_name || '',
                            email: clientDetails.client.email,
                            password: '',
                            phone: clientDetails.client.phone || '',
                            nif: clientDetails.client.nif || '',
                            address: clientDetails.client.address || ''
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                      >
                        <Edit2 size={16} />
                        Editar Cliente
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedClient(clientDetails.client);
                          setIsLicenseModalOpen(true);
                        }}
                        className="w-full py-3 border border-zinc-200 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                      >
                        <CreditCard size={16} />
                        Gerenciar Licença
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(clientDetails.client.id, clientDetails.client.status === 'active' ? 'suspended' : 'active')}
                        className={cn(
                          "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                          clientDetails.client.status === 'active' ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        )}
                      >
                        {clientDetails.client.status === 'active' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                        {clientDetails.client.status === 'active' ? 'Desativar Cliente' : 'Ativar Cliente'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Client Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-black">Registrar Novo Cliente</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateClient} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome da Empresa</label>
                    <input 
                      required
                      type="text" 
                      value={clientFormData.company_name}
                      onChange={(e) => setClientFormData({...clientFormData, company_name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Responsável</label>
                    <input 
                      required
                      type="text" 
                      value={clientFormData.name}
                      onChange={(e) => setClientFormData({...clientFormData, name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email</label>
                  <input 
                    required
                    type="email" 
                    value={clientFormData.email}
                    onChange={(e) => setClientFormData({...clientFormData, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Telefone</label>
                    <input 
                      type="text" 
                      value={clientFormData.phone}
                      onChange={(e) => setClientFormData({...clientFormData, phone: e.target.value})}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">NIF</label>
                    <input 
                      type="text" 
                      value={clientFormData.nif}
                      onChange={(e) => setClientFormData({...clientFormData, nif: e.target.value})}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Palavra-passe Inicial</label>
                  <input 
                    required
                    type="password" 
                    value={clientFormData.password}
                    onChange={(e) => setClientFormData({...clientFormData, password: e.target.value})}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                  />
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all">
                    Criar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Client Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-black">Editar Dados do Cliente</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateClient} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome da Empresa</label>
                    <input 
                      required
                      type="text" 
                      value={clientFormData.company_name}
                      onChange={(e) => setClientFormData({...clientFormData, company_name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Responsável</label>
                    <input 
                      required
                      type="text" 
                      value={clientFormData.name}
                      onChange={(e) => setClientFormData({...clientFormData, name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email</label>
                  <input 
                    required
                    type="email" 
                    value={clientFormData.email}
                    onChange={(e) => setClientFormData({...clientFormData, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Telefone</label>
                    <input 
                      type="text" 
                      value={clientFormData.phone}
                      onChange={(e) => setClientFormData({...clientFormData, phone: e.target.value})}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">NIF</label>
                    <input 
                      type="text" 
                      value={clientFormData.nif}
                      onChange={(e) => setClientFormData({...clientFormData, nif: e.target.value})}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all">
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage License Modal */}
      <AnimatePresence>
        {isLicenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsLicenseModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-black">Gerenciar Licença</h3>
                <button onClick={() => setIsLicenseModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleManageLicense} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">1. Selecionar Plano</label>
                  <select 
                    value={licenseFormData.plan_type}
                    onChange={(e) => setLicenseFormData({...licenseFormData, plan_type: e.target.value})}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all font-bold"
                  >
                    <option value="">Selecione um plano</option>
                    {plans.map((plan: any) => (
                      <option key={`plan-opt-${plan.id}`} value={plan.name}>{plan.name} (Kz {plan.price.toLocaleString()}/mês)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">2. Duração (Meses)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="24"
                    value={isNaN(Number(licenseFormData.duration_months)) ? '' : licenseFormData.duration_months}
                    onChange={(e) => setLicenseFormData({...licenseFormData, duration_months: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all font-bold" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">3. Selecionar Cliente</label>
                  <select 
                    value={licenseFormData.user_id || selectedClient?.id || ''}
                    onChange={(e) => setLicenseFormData({...licenseFormData, user_id: e.target.value})}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all font-bold"
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((client: any) => (
                      <option key={client.id} value={client.id}>
                        {client.company_name || client.name} ({client.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={!licenseFormData.plan_type || !(licenseFormData.user_id || selectedClient?.id)}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ativar / Renovar Licença
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create SaaS Invoice Modal */}
      <AnimatePresence>
        {isSystemInvoiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSystemInvoiceModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-black text-white">
                <h3 className="text-xl font-black">Emitir Documento SaaS</h3>
                <button onClick={() => setIsSystemInvoiceModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateSystemInvoice} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tipo de Documento</label>
                    <div className="flex gap-2">
                      {['FT', 'FR'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSystemInvoiceFormData({ ...systemInvoiceFormData, doc_type: type })}
                          className={cn(
                            "flex-1 py-3 rounded-xl font-bold text-xs transition-all border-2",
                            systemInvoiceFormData.doc_type === type ? "bg-black text-white border-black" : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200"
                          )}
                        >
                          {type === 'FT' ? 'Factura' : 'Factura-Recibo'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Taxa de IVA (%)</label>
                    <select
                      value={systemInvoiceFormData.tax_percentage}
                      onChange={(e) => {
                        const taxRate = parseFloat(e.target.value) || 0;
                        const baseAmount = systemInvoiceFormData.items.reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
                        const taxAmount = (baseAmount * taxRate) / 100;
                        setSystemInvoiceFormData({ 
                          ...systemInvoiceFormData, 
                          tax_percentage: taxRate,
                          tax_amount: taxAmount,
                          total_amount: baseAmount + taxAmount
                        });
                      }}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all font-bold"
                    >
                      <option value="0">0% (Isento)</option>
                      <option value="5">5%</option>
                      <option value="14">14% (Padrão)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cliente (Owner)</label>
                  <select
                    required
                    value={systemInvoiceFormData.owner_id}
                    onChange={(e) => setSystemInvoiceFormData({ ...systemInvoiceFormData, owner_id: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all font-bold"
                  >
                    <option value="">Seleccione o destinatário</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name} ({c.nif})</option>)}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Itens do Serviço</label>
                  {systemInvoiceFormData.items.map((item: any, idx: number) => (
                    <div key={`sys-inv-item-${idx}`} className="flex gap-4">
                      <input 
                        type="text"
                        placeholder="Descrição do serviço"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...systemInvoiceFormData.items];
                          newItems[idx].description = e.target.value;
                          setSystemInvoiceFormData({ ...systemInvoiceFormData, items: newItems });
                        }}
                        className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all font-bold"
                      />
                      <input 
                        type="number"
                        placeholder="Valor"
                        value={item.amount || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const newItems = [...systemInvoiceFormData.items];
                          newItems[idx].amount = val;
                          const baseTotal = newItems.reduce((sum, it) => sum + it.amount, 0);
                          const taxRate = systemInvoiceFormData.tax_percentage || 0;
                          const taxAmount = (baseTotal * taxRate) / 100;
                          setSystemInvoiceFormData({ 
                            ...systemInvoiceFormData, 
                            items: newItems, 
                            tax_amount: taxAmount,
                            total_amount: baseTotal + taxAmount 
                          });
                        }}
                        className="w-32 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all font-bold text-right"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Base</p>
                      <p className="text-lg font-bold text-zinc-500">Kz {(systemInvoiceFormData.total_amount - systemInvoiceFormData.tax_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">IVA ({systemInvoiceFormData.tax_percentage}%)</p>
                      <p className="text-lg font-bold text-zinc-500">Kz {systemInvoiceFormData.tax_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total a Pagar</p>
                      <p className="text-2xl font-black">Kz {systemInvoiceFormData.total_amount.toLocaleString()}</p>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={!systemInvoiceFormData.owner_id || systemInvoiceFormData.total_amount <= 0}
                    className="px-8 py-4 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
                  >
                    Confirmar Emissão
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isSystemPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSystemPaymentModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-emerald-600 text-white">
                <div>
                  <h3 className="text-xl font-black text-white">Novo Pagamento de Cliente</h3>
                  <p className="text-xs text-emerald-100 font-medium tracking-wide">Liquidação de faturas pendentes</p>
                </div>
                <button onClick={() => setIsSystemPaymentModalOpen(false)} className="p-2 hover:bg-emerald-700 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-left block">Seleccionar Cliente</label>
                    <select
                      value={systemPaymentFormData.owner_id}
                      onChange={(e) => {
                        const ownerId = e.target.value;
                        const clientInvoices = financeData.pendingPayments.filter((p: any) => p.owner_id.toString() === ownerId);
                        setSystemPaymentFormData({
                          ...systemPaymentFormData,
                          owner_id: ownerId,
                          payments: clientInvoices.map((inv: any) => ({
                            ft_id: inv.id,
                            amount: 0,
                            invoice_number: inv.invoice_number,
                            balance: inv.balance
                          })),
                          total_amount: 0
                        });
                      }}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all font-bold text-sm"
                    >
                      <option value="">Seleccione o cliente</option>
                      {Array.from(new Set(financeData.pendingPayments.map((p: any) => p.owner_id))).map(ownerId => {
                        const client = financeData.pendingPayments.find((p:any) => p.owner_id === ownerId);
                        return <option key={`pay-client-${ownerId}`} value={ownerId.toString()}>{client.client_name}</option>
                      })}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-left block">Método de Pagamento</label>
                    <select
                      value={systemPaymentFormData.payment_method}
                      onChange={(e) => setSystemPaymentFormData({ ...systemPaymentFormData, payment_method: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all font-bold text-sm"
                    >
                      <option value="bank_transfer">Transferência Bancária</option>
                      <option value="cash">Dinheiro</option>
                      <option value="multicaixa">Multicaixa / POS</option>
                    </select>
                  </div>
                </div>

                {systemPaymentFormData.payments.length > 0 && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-left block">Faturas em Aberto</label>
                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                      {systemPaymentFormData.payments.map((pay, idx) => (
                        <div key={`pay-ft-${pay.ft_id}-${idx}`} className="p-4 bg-zinc-50 rounded-2xl flex items-center justify-between border border-zinc-100">
                          <div className="text-left">
                            <p className="text-sm font-bold text-zinc-900">{pay.invoice_number}</p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Dívida: Kz {pay.balance.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                             <button 
                              onClick={() => {
                                const newPayments = [...systemPaymentFormData.payments];
                                newPayments[idx].amount = pay.balance;
                                setSystemPaymentFormData({
                                  ...systemPaymentFormData,
                                  payments: newPayments,
                                  total_amount: newPayments.reduce((sum, p) => sum + p.amount, 0)
                                });
                              }}
                              className="text-[10px] font-black text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition-colors"
                            >
                              Pagar Total
                            </button>
                            <input 
                              type="number"
                              placeholder="Valor"
                              value={pay.amount || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const newPayments = [...systemPaymentFormData.payments];
                                newPayments[idx].amount = val;
                                setSystemPaymentFormData({
                                  ...systemPaymentFormData,
                                  payments: newPayments,
                                  total_amount: newPayments.reduce((sum, p) => sum + p.amount, 0)
                                });
                              }}
                              className="w-32 px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 transition-all font-bold text-right text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total a Receber</p>
                    <p className="text-2xl font-black text-emerald-600 tracking-tight">Kz {systemPaymentFormData.total_amount.toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={handleLiquidateMultiple}
                    disabled={isLiquidating || systemPaymentFormData.total_amount === 0}
                    className="px-10 py-4 bg-black text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                  >
                    {isLiquidating ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    Confirmar Pagamento
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* System Invoice Preview Modal */}
      <AnimatePresence>
        {isSystemInvoicePreviewOpen && selectedSystemInvoice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSystemInvoicePreviewOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-3xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col"
            >
               <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black">Visualização de Documento SaaS</h3>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{selectedSystemInvoice.invoice_number}</p>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => window.print()} className="p-3 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200">
                    <Printer size={20} />
                  </button>
                  <button onClick={() => setIsSystemInvoicePreviewOpen(false)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 bg-zinc-50/50 print:p-0 print:bg-white" id="printable-system-invoice">
                <div className="bg-white p-12 border border-zinc-100 shadow-sm print:border-none print:shadow-none min-h-full max-w-[800px] mx-auto">
                  <div className="flex justify-between items-start mb-16">
                    <div>
                      <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6">
                        <ShieldCheck size={32} />
                      </div>
                      <h1 className="text-2xl font-black tracking-tighter">Fatu-R ERP System</h1>
                      <p className="text-xs text-zinc-400 uppercase font-black tracking-widest">Plataforma SaaS Integrada</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-3xl font-black uppercase tracking-tighter text-zinc-300 mb-2">{selectedSystemInvoice.doc_type === 'FT' ? 'Factura' : selectedSystemInvoice.doc_type === 'FR' ? 'Factura-Recibo' : 'Recibo'}</h2>
                      <p className="text-sm font-bold">{selectedSystemInvoice.invoice_number}</p>
                      <p className="text-xs text-zinc-400">{new Date(selectedSystemInvoice.invoice_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 mb-16">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Entidade Emissora</p>
                      <p className="font-black text-lg">Fatu-R - Gestão de Software, Lda</p>
                      <p className="text-sm text-zinc-500 mt-1">Sede Administrativa - Angola</p>
                      <p className="text-sm text-zinc-500">NIF: 5000000001</p>
                    </div>
                    <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Destinatário</p>
                      <p className="font-black text-lg">{selectedSystemInvoice.owner_name}</p>
                      <p className="text-sm text-zinc-500 mt-1">NIF: {selectedSystemInvoice.owner_nif}</p>
                    </div>
                  </div>

                  <table className="w-full mb-16">
                    <thead>
                      <tr className="border-b-2 border-zinc-900">
                        <th className="py-4 text-left font-black text-xs uppercase tracking-widest">Descrição do Serviço</th>
                        <th className="py-4 text-right font-black text-xs uppercase tracking-widest">Montante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {JSON.parse(selectedSystemInvoice.items).map((item: any, idx: number) => (
                        <tr key={`inv-prev-item-${idx}`}>
                          <td className="py-6 font-bold text-zinc-800">{item.description}</td>
                          <td className="py-6 text-right font-black">Kz {item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="border-t-4 border-zinc-900 pt-8 flex justify-end">
                    <div className="w-64 space-y-4">
                      <div className="flex justify-between items-center text-zinc-400 font-bold uppercase text-[10px]">
                        <span>Subtotal</span>
                        <span>Kz {(selectedSystemInvoice.total_amount - selectedSystemInvoice.tax_amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-400 font-bold uppercase text-[10px]">
                        <span>IVA ({selectedSystemInvoice.tax_percentage || 0}%)</span>
                        <span>Kz {selectedSystemInvoice.tax_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                         <span className="font-black text-xl tracking-tighter uppercase">Total</span>
                         <span className="font-black text-2xl tracking-tighter">Kz {selectedSystemInvoice.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-24 pt-12 border-t border-dashed border-zinc-200">
                    <div className="grid grid-cols-2 gap-8 items-end">
                      <div className="p-4 bg-zinc-50 rounded-xl">
                        <p className="text-[10px] font-black text-zinc-400 uppercase leading-relaxed">
                          Processado por programa certificado nº 0/0F. <br/>
                          Os bens/serviços foram colocados à disposição do adquirente na data do documento.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* License History Modal */}
      <AnimatePresence>
        {isLicenseHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsLicenseHistoryModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-black">Histórico de Licenciamento</h3>
                <button onClick={() => setIsLicenseHistoryModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  {licenseHistory.map((h: any) => (
                    <div key={h.id} className="p-4 border border-zinc-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">Plano {(h.plan_type || 'N/A').toUpperCase()}</p>
                        <p className="text-[10px] text-zinc-400">{h.establishment_name || 'Global'}</p>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          {new Date(h.start_date).toLocaleDateString()} - {new Date(h.expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-black uppercase",
                          h.status === 'active' ? "bg-emerald-100 text-emerald-700" : 
                          h.status === 'suspended' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {h.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {licenseHistory.length === 0 && (
                    <div className="text-center py-10 text-zinc-400">
                      Nenhum histórico encontrado.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
};


const EstablishmentAdmin = ({ user }: { user: User }) => {
  const { establishmentId: paramEstablishmentId } = useParams();
  const establishmentId = paramEstablishmentId || user.establishment_id?.toString();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'services' | 'promotions' | 'stock' | 'staff' | 'reports' | 'settings' | 'support' | 'cash-registers' | 'suppliers' | 'purchases' | 'invoices'>('dashboard');

  useEffect(() => {
    // Basic active tab initialization if needed
  }, [location.pathname, user.role]);
  const [activeSeries, setActiveSeries] = useState<any[]>([]);
  const [establishmentData, setEstablishmentData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceResults, setServiceResults] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [stockReport, setStockReport] = useState<any>(null);
  const [reportsData, setReportsData] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [creditInvoices, setCreditInvoices] = useState<any[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [isCreditInvoiceModalOpen, setIsCreditInvoiceModalOpen] = useState(false);
  const [isInvoiceTypeModalOpen, setIsInvoiceTypeModalOpen] = useState(false);
  const [invoiceModalMode, setInvoiceModalMode] = useState<'invoice' | 'note'>('invoice');
  const [selectedCreditInvoice, setSelectedCreditInvoice] = useState<any>(null);
  const [creditInvoiceForm, setCreditInvoiceForm] = useState({
    client_nif: '',
    client_name: '',
    address: '',
    country: 'Angola',
    doc_type: 'FT',
    series: new Date().getFullYear().toString(),
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    currency: 'AOA',
    items: [] as any[],
    parent_invoice_id: '',
    reason: '',
    note_category: 'return' as 'return' | 'correction',
    adjustment_amount: 0,
    observations: '',
    due_date: new Date().toISOString().split('T')[0],
    service_designation: ''
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    company_name: '',
    nif: '',
    phone: '',
    email: '',
    country: 'Angola',
    city: '',
    address: '',
    responsible_person: '',
    payment_method: 'transfer',
    payment_term: '7',
    observations: '',
    status: 'active'
  });
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [viewingSupplierHistory, setViewingSupplierHistory] = useState<any>(null);
  const [supplierHistory, setSupplierHistory] = useState<any[]>([]);
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<any[]>([]);
  const [activePurchaseTab, setActivePurchaseTab] = useState<'orders' | 'received' | 'returns'>('orders');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    establishment_id: establishmentId || '',
    supplier_id: '',
    invoice_number: '',
    due_date: '',
    items: [] as any[],
    paid_amount: 0,
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'transfer'
  });
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    purchase_id: '',
    reason: '',
    items: [] as any[]
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "primary";
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [productForm, setProductForm] = useState({ 
    name: '', 
    price: '', 
    cost: '', 
    stock: '', 
    category: '', 
    image_url: '', 
    min_stock: '5',
    tax_id: '',
    warehouse_id: ''
  });
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    type: 'principal',
    establishment_id: establishmentId || ''
  });
  const [staffForm, setStaffForm] = useState({ 
    name: '', 
    email: '', 
    username: '', 
    password: '', 
    salary: '', 
    shift_info: '',
    role: 'seller',
    cash_register_id: ''
  });
  const [promoForm, setPromoForm] = useState({ name: '', start_date: '', end_date: '', discount_percent: '', product_ids: [] as number[] });
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '', priority: 'medium' });
  const [stockForm, setStockForm] = useState({ 
    product_id: '', 
    type: 'in', 
    quantity: '', 
    reason: '', 
    to_establishment_id: '',
    supplier_id: '',
    isBulk: false,
    bulkType: 'grade',
    bulkQuantity: '',
    unitsPerBulk: '24'
  });
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [isCashRegisterModalOpen, setIsCashRegisterModalOpen] = useState(false);
  const [editingCashRegister, setEditingCashRegister] = useState<CashRegister | null>(null);
  const [cashRegisterForm, setCashRegisterForm] = useState({ 
    name: '', 
    default_initial_balance: '0', 
    max_limit: '0' 
  });
  const [openingAmounts, setOpeningAmounts] = useState<Record<number, string>>({});
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingSessionId, setClosingSessionId] = useState<number | null>(null);
  const [closingAmount, setClosingAmount] = useState('');
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    nif: '',
    logo_url: '',
    bank_accounts: [] as any[],
    status: 'active'
  });

  useEffect(() => {
    if (establishmentData) {
      setSettingsForm({
        name: establishmentData.name || '',
        address: establishmentData.address || '',
        phone: establishmentData.phone || '',
        email: establishmentData.email || '',
        nif: establishmentData.nif || '',
        logo_url: establishmentData.logo_url || '',
        bank_accounts: typeof establishmentData.bank_accounts === 'string' 
          ? JSON.parse(establishmentData.bank_accounts) 
          : (establishmentData.bank_accounts || []),
        status: establishmentData.status || 'active'
      });
    }
  }, [establishmentData]);

  const navigate = useNavigate();

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = () => {
    setFetchError(null);
    fetch(`/api/owner/establishment-details/${establishmentId}`)
      .then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Erro ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        setEstablishmentData(data);
      }).catch((err) => {
        console.error("Fetch details error:", err);
        setFetchError(err.message);
      });
    fetch(`/api/owner/active-series/${establishmentId}`)
      .then(res => res.json())
      .then(setActiveSeries).catch(() => {});
    fetch(`/api/owner/products/${establishmentId}`)
      .then(res => res.json())
      .then(setProducts).catch(() => {});
    fetch(`/api/owner/staff/${establishmentId}`)
      .then(res => res.json())
      .then(setStaff).catch(() => {});
    fetch(`/api/owner/staff-performance/${establishmentId}`)
      .then(res => res.json())
      .then(setStaffPerformance).catch(() => {});
    fetch(`/api/owner/promotions/${establishmentId}`)
      .then(res => res.json())
      .then(setPromotions).catch(() => {});
    fetch(`/api/owner/stock/movements/${establishmentId}`)
      .then(res => res.json())
      .then(setStockMovements).catch(() => {});
    fetch(`/api/owner/stock/report/${establishmentId}`)
      .then(res => res.json())
      .then(setStockReport).catch(() => {});
    fetch(`/api/owner/reports/${establishmentId}`)
      .then(res => res.json())
      .then(setReportsData).catch(() => {});
    fetch(`/api/owner/clients/${establishmentId}`)
      .then(res => res.json())
      .then(setClients).catch(() => {});
    fetch(`/api/owner/taxes/establishment/${establishmentId}`)
      .then(res => res.json())
      .then(setTaxes).catch(() => {});
    fetch(`/api/owner/warehouses/${user.id}`)
      .then(res => res.json())
      .then(setWarehouses).catch(() => {});
    fetch(`/api/owner/credit-invoices/${establishmentId}`)
      .then(res => res.json())
      .then(setCreditInvoices).catch(() => {});
    fetch(`/api/owner/establishments/${establishmentId}/cash-registers`)
      .then(res => res.json())
      .then(setCashRegisters).catch(() => {});
    fetch('/api/admin/establishments')
      .then(res => res.json())
      .then(setEstablishments).catch(() => {});
    fetch(`/api/owner/support/${user.id}`)
      .then(res => res.json())
      .then(setSupportTickets).catch(() => {});
    fetch(`/api/owner/suppliers/${user.id}`)
      .then(res => res.json())
      .then(setSuppliers).catch(() => {});
    fetch(`/api/owner/purchases/${establishmentId}`)
      .then(res => res.json())
      .then(setPurchases).catch(() => {});
    fetch(`/api/owner/purchase-returns/${establishmentId}`)
      .then(res => res.json())
      .then(setPurchaseReturns).catch(() => {});
    fetch(`/api/seller/services/${establishmentId}?all=true`)
      .then(res => res.json())
      .then(setServices).catch(() => {});
    fetch(`/api/owner/cancellation-requests/${user.id}`)
      .then(res => res.json())
      .then(setCancellationRequests).catch(() => {});
    fetch(`/api/owner/currencies/${user.id}`)
      .then(res => res.json())
      .then(setCurrencies).catch(() => {});
  };

  useEffect(fetchData, [establishmentId]);

  const handleSaveCashRegister = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingCashRegister ? `/api/owner/establishments/cash-registers/${editingCashRegister.id}` : `/api/owner/establishments/${establishmentId}/cash-registers`;
    const method = editingCashRegister ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...cashRegisterForm,
        default_initial_balance: Number(cashRegisterForm.default_initial_balance),
        max_limit: Number(cashRegisterForm.max_limit)
      })
    });

    if (res.ok) {
      setIsCashRegisterModalOpen(false);
      setEditingCashRegister(null);
      setCashRegisterForm({ name: '', default_initial_balance: '0', max_limit: '0' });
      fetchData();
    }
  };

  const handleOpenSession = async (registerId: number, amount: string) => {
    if (!amount || isNaN(parseFloat(amount))) {
      alert('Por favor, insira um valor de abertura válido.');
      return;
    }

    try {
      const res = await fetch('/api/seller/open-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishment_id: Number(establishmentId),
          seller_id: user.id,
          cash_register_id: registerId,
          opening_amount: parseFloat(amount)
        })
      });

      if (res.ok) {
        setOpeningAmounts(prev => ({ ...prev, [registerId]: '' }));
        fetchData();
        alert('Caixa aberto com sucesso!');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao abrir caixa.');
      }
    } catch (error) {
      console.error("Error opening session:", error);
      alert('Erro de conexão ao abrir caixa.');
    }
  };

  const handleCloseSessionDashboard = (sessionId: number) => {
    console.log('Opening close session modal for sessionId:', sessionId);
    setClosingSessionId(sessionId);
    setClosingAmount('');
    setIsClosingModalOpen(true);
  };

  const confirmCloseSession = async () => {
    if (!closingSessionId) return;
    
    const sessionRegister = cashRegisters.find(r => r.current_session_id === closingSessionId);
    if (user.role !== 'owner' && sessionRegister?.seller_id !== user.id) {
      alert('Você não tem permissão para fechar este caixa.');
      return;
    }

    const normalizedAmount = closingAmount.replace(',', '.').trim();
    if (normalizedAmount === '') {
      alert('Por favor, informe um valor.');
      return;
    }

    const physical_amount = parseFloat(normalizedAmount);
    if (isNaN(physical_amount)) {
      alert('Valor inválido. Use apenas números.');
      return;
    }

    console.log('Attempting to close session with physical_amount:', physical_amount);

    try {
      const res = await fetch('/api/seller/close-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: closingSessionId,
          physical_amount,
          closing_amount: 0,
          seller_id: user.id
        })
      });

      if (res.ok) {
        console.log('Session closed successfully');
        setIsClosingModalOpen(false);
        fetchData();
        alert('Caixa fechado com sucesso!');
      } else {
        const data = await res.json();
        console.error('Failed to close session:', data);
        alert(data.error || 'Erro ao fechar caixa.');
      }
    } catch (error) {
      console.error('Error closing session:', error);
      alert('Erro de conexão ao fechar caixa.');
    }
  };

  const handleDeleteCashRegister = async (id: number) => {
    if (!confirm('Tem certeza que deseja eliminar este caixa?')) return;
    const res = await fetch(`/api/owner/establishments/cash-registers/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const parseInputNumber = (val: string | number) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = val.replace(/[^\d.,-]/g, '');
    if (clean.includes('.') && clean.includes(',')) {
      return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    } else if (clean.includes(',')) {
      return parseFloat(clean.replace(',', '.')) || 0;
    }
    return parseFloat(clean) || 0;
  };

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingProduct ? `/api/owner/products/${editingProduct.id}` : '/api/owner/products';
    const method = editingProduct ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...productForm, 
        establishment_id: Number(establishmentId), 
        warehouse_id: productForm.warehouse_id ? Number(productForm.warehouse_id) : null,
        price: parseInputNumber(productForm.price), 
        cost: parseInputNumber(productForm.cost),
        stock: parseInputNumber(productForm.stock),
        min_stock: parseInputNumber(productForm.min_stock)
      })
    });
    if (res.ok) {
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductForm({ 
        name: '', 
        price: '', 
        cost: '',
        stock: '', 
        category: '', 
        image_url: '', 
        min_stock: '5',
        tax_id: '',
        warehouse_id: ''
      });
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || 'Erro ao guardar produto.');
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: (product.price || 0).toString(),
      cost: (product.cost || 0).toString(),
      stock: (product.stock || 0).toString(),
      category: product.category,
      image_url: product.image_url,
      min_stock: (product.min_stock || 5).toString(),
      tax_id: product.tax_id?.toString() || '',
      warehouse_id: product.warehouse_id?.toString() || ''
    });
    setIsProductModalOpen(true);
  };

  const handleAddStaff = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingStaff ? `/api/owner/staff/${editingStaff.id}` : '/api/owner/staff';
    const method = editingStaff ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...staffForm, 
        establishment_id: Number(establishmentId), 
        salary: Number(staffForm.salary),
        cash_register_id: staffForm.cash_register_id ? Number(staffForm.cash_register_id) : null
      })
    });
    if (res.ok) {
      setIsStaffModalOpen(false);
      setEditingStaff(null);
      setStaffForm({ 
        name: '', 
        email: '', 
        username: '', 
        password: '', 
        salary: '', 
        shift_info: '',
        role: 'seller',
        cash_register_id: ''
      });
      fetchData();
    }
  };

  const handleDeleteStaff = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Demitir Colaborador",
      message: "Tem certeza que deseja demitir este colaborador?",
      variant: "danger",
      onConfirm: async () => {
        await fetch(`/api/owner/staff/${id}`, { method: 'DELETE' });
        fetchData();
      }
    });
  };

  const handleToggleStaffStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/owner/staff/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar estado do colaborador.");
    }
  };

  const handleEditStaff = (member: any) => {
    setEditingStaff(member);
    setStaffForm({
      name: member.name,
      email: member.email || '',
      username: member.username || '',
      password: '', // Don't show password
      salary: member.salary.toString(),
      shift_info: member.shift_info,
      role: member.role || 'seller',
      cash_register_id: member.cash_register_id ? member.cash_register_id.toString() : ''
    });
    setIsStaffModalOpen(true);
  };

  const handleDeleteProduct = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Produto",
      message: "Tem certeza que deseja eliminar este produto?",
      variant: "danger",
      onConfirm: async () => {
        await fetch(`/api/owner/products/${id}`, { method: 'DELETE' });
        fetchData();
      }
    });
  };

  const handleAddPromo = async (e: FormEvent) => {
    e.preventDefault();
    if (promoForm.product_ids.length === 0) return alert('Selecione pelo menos um produto');
    
    const res = await fetch('/api/owner/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...promoForm, 
        establishment_id: Number(establishmentId), 
        discount_percent: Number(promoForm.discount_percent) 
      })
    });
    if (res.ok) {
      setIsPromoModalOpen(false);
      setPromoForm({ name: '', start_date: '', end_date: '', discount_percent: '', product_ids: [] });
      fetchData();
    }
  };

  const handleDeletePromo = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Promoção",
      message: "Tem certeza que deseja eliminar esta promoção?",
      variant: "danger",
      onConfirm: async () => {
        await fetch(`/api/owner/promotions/${id}`, { method: 'DELETE' });
        fetchData();
      }
    });
  };

  const handleStockMovement = async (e: FormEvent) => {
    e.preventDefault();
    const isTransfer = stockForm.type === 'transfer';
    const endpoint = isTransfer ? '/api/owner/stock/transfer' : '/api/owner/stock/movement';
    
    let finalQuantity = Number(stockForm.quantity);
    if (stockForm.isBulk) {
      finalQuantity = Number(stockForm.bulkQuantity) * Number(stockForm.unitsPerBulk);
    }

    const body = isTransfer ? {
      from_establishment_id: Number(establishmentId),
      to_establishment_id: Number(stockForm.to_establishment_id),
      product_id: Number(stockForm.product_id),
      user_id: user.id,
      quantity: finalQuantity,
      reason: stockForm.reason
    } : {
      establishment_id: Number(establishmentId),
      product_id: Number(stockForm.product_id),
      user_id: user.id,
      type: stockForm.type,
      quantity: stockForm.type === 'in' ? finalQuantity : -finalQuantity,
      reason: stockForm.reason,
      supplier_id: stockForm.supplier_id ? Number(stockForm.supplier_id) : null
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      setIsStockModalOpen(false);
      setStockForm({ 
        product_id: '', 
        type: 'in', 
        quantity: '', 
        reason: '', 
        to_establishment_id: '',
        supplier_id: '',
        isBulk: false,
        bulkType: 'grade',
        bulkQuantity: '',
        unitsPerBulk: '24'
      });
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || 'Erro ao processar movimento de stock');
    }
  };

  const handleUpdateSettings = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/owner/establishment-settings/${establishmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsForm)
    });
    if (res.ok) {
      alert('Configurações actualizadas com sucesso!');
      fetchData();
    }
  };

  const addBankAccount = () => {
    setSettingsForm({
      ...settingsForm,
      bank_accounts: [...settingsForm.bank_accounts, { bank_name: '', iban: '', holder: '', account_number: '' }]
    });
  };

  const removeBankAccount = (index: number) => {
    setSettingsForm({
      ...settingsForm,
      bank_accounts: settingsForm.bank_accounts.filter((_, i) => i !== index)
    });
  };

  const updateBankAccount = (index: number, field: keyof BankAccount, value: string) => {
    const updated = [...settingsForm.bank_accounts];
    updated[index] = { ...updated[index], [field]: value };
    setSettingsForm({ ...settingsForm, bank_accounts: updated });
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    const res = await fetch(`/api/owner/support/ticket/${selectedTicket.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender_id: user.id, message: newMessage })
    });

    if (res.ok) {
      setNewMessage('');
      fetchMessages(selectedTicket.id);
    }
  };

  const fetchMessages = (ticketId: number) => {
    fetch(`/api/owner/support/ticket/${ticketId}/messages`)
      .then(res => res.json())
      .then(setTicketMessages);
  };

  const handleSelectTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/owner/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ticketForm, user_id: user.id })
    });

    if (res.ok) {
      setIsTicketModalOpen(false);
      setTicketForm({ subject: '', description: '', priority: 'medium' });
      fetchData();
    }
  };



  const addProductToCreditInvoice = (product: Product) => {
    const existing = creditInvoiceForm.items.find(item => item.product_id === product.id);
    if (existing) {
      setCreditInvoiceForm({
        ...creditInvoiceForm,
        items: creditInvoiceForm.items.map(item => 
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      });
    } else {
      setCreditInvoiceForm({
        ...creditInvoiceForm,
        items: [...creditInvoiceForm.items, { 
          product_id: product.id, 
          code: product.barcode || '', 
          name: product.name, 
          price: product.price, 
          quantity: 1,
          tax: product.tax_percentage !== undefined && product.tax_percentage !== null 
            ? product.tax_percentage 
            : (taxes.find(t => t.is_default === 1)?.percentage ?? (user?.fiscal_regime === 'simplificado' ? 7 : (user?.fiscal_regime === 'exclusao' ? 0 : 14))),
          type: 'product'
        }]
      });
    }
  };

  const addServiceToCreditInvoice = (service: any) => {
    const existing = creditInvoiceForm.items.find(item => item.product_id === service.id && item.type === 'service');
    if (existing) {
      setCreditInvoiceForm({
        ...creditInvoiceForm,
        items: creditInvoiceForm.items.map(item => 
          (item.product_id === service.id && item.type === 'service') ? { ...item, quantity: item.quantity + 1 } : item
        )
      });
    } else {
      setCreditInvoiceForm({
        ...creditInvoiceForm,
        items: [...creditInvoiceForm.items, { 
          product_id: service.id, 
          code: service.code || 'SERV', 
          name: service.name, 
          price: service.price, 
          quantity: 1,
          tax: service.tax_percentage !== undefined && service.tax_percentage !== null 
            ? service.tax_percentage 
            : (taxes.find(t => t.is_default === 1)?.percentage ?? (user?.fiscal_regime === 'simplificado' ? 7 : (user?.fiscal_regime === 'exclusao' ? 0 : 14))),
          type: 'service'
        }]
      });
    }
  };

  const removeProductFromCreditInvoice = (productId: number, type: 'product' | 'service') => {
    setCreditInvoiceForm({
      ...creditInvoiceForm,
      items: creditInvoiceForm.items.filter(item => !(item.product_id === productId && item.type === type))
    });
  };

  const updateCreditInvoiceItemField = (productId: number, type: 'product' | 'service', field: string, value: any) => {
    setCreditInvoiceForm({
      ...creditInvoiceForm,
      items: creditInvoiceForm.items.map(item => 
        (item.product_id === productId && item.type === type) ? { ...item, [field]: value } : item
      )
    });
  };

  const updateCreditInvoiceItemQuantity = (productId: number, type: 'product' | 'service', quantity: number) => {
    if (quantity <= 0) return;
    setCreditInvoiceForm({
      ...creditInvoiceForm,
      items: creditInvoiceForm.items.map(item => 
        (item.product_id === productId && item.type === type) ? { ...item, quantity } : item
      )
    });
  };

  const handleCreateCreditInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (creditInvoiceForm.items.length === 0 && !creditInvoiceForm.adjustment_amount) return;

    // Check for active series for this doc_type
    const relevantSeries = activeSeries.find(s => s.type === creditInvoiceForm.doc_type && s.status === 'active');
    
    if (user.billing_mode === 'eletronica') {
      if (!relevantSeries || relevantSeries.prefix !== 'E') {
        alert(`Erro: Não existe uma série de Faturação Eletrónica ("E") ativa para o tipo de documento ${creditInvoiceForm.doc_type}. Por favor, solicite uma série nas configurações.`);
        return;
      }
      if (relevantSeries.agt_status !== 'aprovada') {
        alert(`Faturação Eletrónica: A série para ${creditInvoiceForm.doc_type} ("E") ainda não foi aprovada pela AGT. Aguarde a aprovação antes de faturar.`);
        return;
      }
    } else {
      if (!relevantSeries && user.billing_mode === 'tradicional') {
        // Traditional mode usually auto-creates, but good to have a fallback message
        // Though handleCreateCreditInvoice doesn't auto-create here, the server does.
      }
    }

    const items_total = creditInvoiceForm.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const items_tax = creditInvoiceForm.items.reduce((acc, item) => acc + (item.price * item.quantity * ((item.tax ?? (user?.fiscal_regime === 'exclusao' ? 0 : 14)) / 100)), 0);
    
    // For ND/NC, the total reflected in finance must be the gross total (items + tax + adjustments)
    const total_amount = items_total + items_tax + (creditInvoiceForm.adjustment_amount || 0);
    const tax_amount = items_tax;

    try {
      const res = await fetch('/api/owner/credit-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...creditInvoiceForm, 
        establishment_id: establishmentId,
        total_amount,
        tax_amount,
        seller_id: user?.id,
        cash_register_id: user?.cash_register_id
      })
    });

      if (res.ok) {
        setIsCreditInvoiceModalOpen(false);
        setCreditInvoiceForm({
          client_nif: '',
          client_name: '',
          address: '',
          country: 'Angola',
          doc_type: 'FT',
          series: new Date().getFullYear().toString(),
          invoice_number: '',
          invoice_date: new Date().toISOString().split('T')[0],
          currency: 'AOA',
          items: [] as any[],
          parent_invoice_id: '',
          reason: '',
          note_category: 'return',
          adjustment_amount: 0,
          observations: '',
          due_date: new Date().toISOString().split('T')[0],
          service_designation: ''
        });
        fetchData();
        alert('Documento emitido com sucesso!');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao emitir documento.');
      }
    } catch (error) {
      console.error("Error creating credit invoice:", error);
      alert('Erro de conexão ao emitir documento.');
    }
  };





  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-rose-50 text-rose-500 rounded-full">
          <AlertCircle size={48} />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-black text-zinc-900">Acesso negado ou erro de carregamento</h2>
          <p className="text-zinc-500 mt-2 font-medium">{fetchError}</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all"
        >
          <RefreshCw size={20} />
          Tentar Novamente
        </button>
      </div>
    );
  }
  
  if (!establishmentData) return <div className="p-8 text-center text-zinc-500">Carregando dados do estabelecimento...</div>;
  if (!establishmentData.establishment) return <div className="p-8 text-center text-zinc-500">Estabelecimento não encontrado ou acesso negado.</div>;

  const { establishment, dashboard = { 
    todaySales: 0, 
    todayRevenue: 0, 
    activeSellers: 0, 
    openTills: 0,
    lowStockCount: 0, 
    staffCount: 0,
    financialReminder: {
      enabled: false,
      enoughForSalaries: false,
      monthlyIncome: 0,
      neededForSalaries: 0,
      daysUntilMonthEnd: 0
    }
  } } = establishmentData;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          {(user.role === 'owner' || user.role === 'manager') && (
            <button 
              onClick={() => navigate(`/${user.role}/establishments`)}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-400 hover:text-black"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-black text-white rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
              {establishment.logo_url ? (
                <img src={establishment.logo_url || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Store size={20} className="md:w-6 md:h-6" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight truncate">{establishment.name}</h2>
              <p className="text-zinc-500 text-[10px] md:text-sm flex items-center gap-1 truncate">
                <Activity size={12} className={establishment.status === 'active' ? 'text-emerald-500' : 'text-rose-500'} />
                Painel Administrativo • {establishment.status === 'active' ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-0 w-full lg:w-auto">
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl overflow-x-auto pb-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'invoices', icon: CreditCard, label: 'Faturas', perm: 'documents_view' },
            { id: 'products', icon: Package, label: 'Produtos', perm: 'stock_view' },
            { id: 'services', icon: Tag, label: 'Serviços', perm: 'stock_view' },
            { id: 'promotions', icon: Tag, label: 'Promoções', perm: 'stock_edit' },
            { id: 'stock', icon: Barcode, label: 'Stock', perm: 'stock_view' },
            { id: 'cash-registers', icon: Wallet, label: 'Caixas', perm: 'reports_view' },
            { id: 'reports', icon: BarChart3, label: 'Relatórios', perm: 'reports_view' },
            { id: 'settings', icon: Settings2, label: 'Configurações', perm: 'settings_manage' },
            { id: 'support', icon: LifeBuoy, label: 'Suporte' },
          ].filter(tab => !tab.perm || hasPermission(user, tab.perm)).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-black text-white shadow-lg shadow-black/20" 
                  : "bg-white text-zinc-500 hover:bg-zinc-100"
              )}
            >
              <tab.icon size={14} className="md:w-4 md:h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>

    <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col min-h-0"
        >
          {activeTab === 'dashboard' && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Vendas (Hoje)" value={dashboard.todaySales} icon={ShoppingCart} color="blue" />
                <StatCard label="Faturamento (Hoje)" value={`Kz ${(dashboard.todayRevenue || 0).toLocaleString()}`} icon={DollarSign} color="emerald" />
                <StatCard label="Stock Baixo" value={dashboard.lowStockCount} icon={AlertTriangle} color={dashboard.lowStockCount > 0 ? "rose" : "blue"} />
                <StatCard label="Vendedores Ativos" value={dashboard.activeSellers} icon={Users} color="amber" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                    <h3 className="font-bold">Monitoramento em Tempo Real</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                          <Activity size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-emerald-900">Operação Saudável</p>
                          <p className="text-xs text-emerald-700">Todos os sistemas estão respondendo normalmente.</p>
                        </div>
                      </div>
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border border-zinc-100 rounded-2xl">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Caixas Abertos</p>
                        <p className="text-2xl font-black">{dashboard.openTills}</p>
                      </div>
                      <div className="p-4 border border-zinc-100 rounded-2xl">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Clientes Atendidos</p>
                        <p className="text-2xl font-black">{dashboard.todaySales}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6 border-b border-zinc-100">
                    <h3 className="font-bold">Alertas de Operação</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {dashboard.lowStockCount > 0 && (
                      <div className="p-3 bg-rose-50 text-rose-700 rounded-xl flex items-center gap-3">
                        <AlertTriangle size={18} />
                        <span className="text-xs font-bold">{dashboard.lowStockCount} produtos precisam de reposição</span>
                      </div>
                    )}
                    <div className="p-3 bg-blue-50 text-blue-700 rounded-xl flex items-center gap-3">
                      <LifeBuoy size={18} />
                      <span className="text-xs font-bold">Licença activa até Dezembro 2026</span>
                    </div>

                    {dashboard.financialReminder?.enabled && (
                      <div className={cn(
                        "p-4 rounded-xl border flex flex-col gap-2",
                        dashboard.financialReminder.enoughForSalaries 
                          ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                          : "bg-amber-50 border-amber-100 text-amber-800"
                      )}>
                        <div className="flex items-center gap-3">
                          <Wallet size={20} className={dashboard.financialReminder.enoughForSalaries ? "text-emerald-600" : "text-amber-600"} />
                          <span className="text-sm font-black uppercase">Lembrete Financeiro</span>
                        </div>
                        <p className="text-xs font-medium leading-relaxed">
                          {dashboard.financialReminder.enoughForSalaries 
                            ? `Excelente! O faturamento mensal (Kz ${(dashboard.financialReminder.monthlyIncome || 0).toLocaleString()}) já é suficiente para cobrir os salários (Kz ${(dashboard.financialReminder.neededForSalaries || 0).toLocaleString()}).` 
                            : `Atenção: Ainda restam ${dashboard.financialReminder.daysUntilMonthEnd} dias para o fim do mês. O faturamento actual é de Kz ${(dashboard.financialReminder.monthlyIncome || 0).toLocaleString()}, mas precisa de Kz ${(dashboard.financialReminder.neededForSalaries || 0).toLocaleString()} para os salários.`
                          }
                        </p>
                        {!dashboard.financialReminder.enoughForSalaries && (
                          <div className="w-full bg-amber-200/50 rounded-full h-2 mt-1">
                            <div 
                              className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, (dashboard.financialReminder.monthlyIncome / (dashboard.financialReminder.neededForSalaries || 1)) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="flex-1 flex flex-col min-h-0">
              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
                <h3 className="font-bold">Gestão de Produtos</h3>
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                  <button 
                    onClick={() => setIsPromoModalOpen(true)}
                    className="flex-1 lg:flex-none bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-200 transition-colors"
                  >
                    <Tag size={16} /> Criar Promoção
                  </button>
                  <button 
                    onClick={() => {
                      setCreditInvoiceForm({
                        ...creditInvoiceForm,
                        doc_type: 'PP',
                        invoice_date: new Date().toISOString().split('T')[0],
                        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      });
                      setIsCreditInvoiceModalOpen(true);
                    }}
                    className="flex-1 lg:flex-none bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-200 transition-colors"
                  >
                    <FileText size={16} /> Fatura Proforma
                  </button>
                  <button 
                    onClick={() => setIsProductModalOpen(true)}
                    className="flex-1 lg:flex-none bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Novo Produto
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="hidden md:block">
                    <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Produto</th>
                      <th className="px-6 py-4 font-semibold">Código de Barra</th>
                      <th className="px-6 py-4 font-semibold">Categoria</th>
                      <th className="px-6 py-4 font-semibold">Armazém</th>
                      <th className="px-6 py-4 font-semibold">Preço</th>
                      <th className="px-6 py-4 font-semibold">Custo</th>
                      <th className="px-6 py-4 font-semibold">Lucro</th>
                      <th className="px-6 py-4 font-semibold">Stock</th>
                      <th className="px-6 py-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {products.map(product => (
                      <tr key={`prod-desktop-${product.id}`} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={product.image_url || undefined} alt="" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                            <span className="font-medium text-sm">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded border border-zinc-200">{product.barcode}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500">{product.category}</td>
                        <td className="px-6 py-4 text-sm text-zinc-500">{product.warehouse_name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm font-bold">
                          {product.discount_percent ? (
                            <div className="flex flex-col">
                              <span className="text-zinc-400 line-through text-[10px]">Kz {product.price.toLocaleString()}</span>
                              <span className="text-emerald-600">Kz {(product.price * (1 - product.discount_percent / 100)).toLocaleString()}</span>
                            </div>
                          ) : (
                            <span>Kz {product.price.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-zinc-500">
                          Kz {product.cost?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-sm font-bold",
                            ((product.discount_percent ? product.price * (1 - product.discount_percent / 100) : product.price) - (product.cost || 0)) > 0 ? "text-emerald-600" : "text-rose-600"
                          )}>
                            Kz {((product.discount_percent ? product.price * (1 - product.discount_percent / 100) : product.price) - (product.cost || 0)).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                            product.stock >= 10 ? "bg-emerald-100 text-emerald-700" : 
                            product.stock >= 5 ? "bg-amber-100 text-amber-700" : 
                            "bg-rose-100 text-rose-700"
                          )}>
                            {product.stock} un
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEditProduct(product)}
                              className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-zinc-100">
                {products.map(product => (
                  <div key={`prod-mobile-${product.id}`} className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={product.image_url || undefined} alt="" className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <p className="font-bold text-sm">{product.name}</p>
                          <p className="text-[10px] font-mono text-zinc-400">{product.barcode}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        product.stock >= 10 ? "bg-emerald-100 text-emerald-700" : 
                        product.stock >= 5 ? "bg-amber-100 text-amber-700" : 
                        "bg-rose-100 text-rose-700"
                      )}>
                        {product.stock} un
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-y border-zinc-50">
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Preço</p>
                        {product.discount_percent ? (
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400 line-through text-xs">Kz {product.price.toLocaleString()}</span>
                            <span className="text-emerald-600 font-bold text-sm">Kz {(product.price * (1 - product.discount_percent / 100)).toLocaleString()}</span>
                          </div>
                        ) : (
                          <p className="font-bold text-sm">Kz {product.price.toLocaleString()}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Armazém</p>
                        <p className="text-xs font-bold text-zinc-600">{product.warehouse_name || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Categoria</p>
                        <p className="text-xs font-bold text-zinc-600">{product.category}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-600 text-xs font-bold transition-all"
                      >
                        <Edit2 size={14} /> Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 text-xs font-bold transition-all"
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'services' && (
            <div className="flex-1 flex flex-col min-h-0">
              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
                  <h3 className="font-bold text-lg md:text-xl">Gestão de Serviços</h3>
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <p className="text-xs text-zinc-500 italic bg-zinc-50 px-3 py-2 rounded-xl">Gira os seus serviços no painel de Gestão de Serviços para maior controle.</p>
                  </div>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-500 text-[10px] md:text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-semibold">Serviço</th>
                        <th className="px-6 py-4 font-semibold">Código</th>
                        <th className="px-6 py-4 font-semibold">Visível PDV</th>
                        <th className="px-6 py-4 font-semibold">Preço</th>
                        <th className="px-6 py-4 font-semibold">Taxa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {services.map(service => (
                        <tr key={`serv-desktop-${service.id}`} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-sm text-zinc-800">{service.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded border border-zinc-200 text-zinc-600">{service.code || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                              service.show_in_pos ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                            )}>
                              {service.show_in_pos ? 'SIM' : 'NÃO'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-zinc-900">
                            Kz {service.price?.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-zinc-500 italic">
                            {service.tax_code} ({service.tax_percentage}%)
                          </td>
                        </tr>
                      ))}
                      {services.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-medium">Nenhum serviço disponível neste estabelecimento.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

      {activeTab === 'promotions' && (
            <div className="flex-1 flex flex-col min-h-0">
              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                  <h3 className="font-bold">Promoções Ativas</h3>
                  <button 
                    onClick={() => setIsPromoModalOpen(true)}
                    className="w-full md:w-auto bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Nova Promoção
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="hidden md:block">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Nome</th>
                      <th className="px-6 py-4 font-semibold">Período</th>
                      <th className="px-6 py-4 font-semibold">Desconto</th>
                      <th className="px-6 py-4 font-semibold">Produtos</th>
                      <th className="px-6 py-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {promotions.map(promo => (
                      <tr key={`promo-desk-${promo.id}`} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm">{promo.name}</td>
                        <td className="px-6 py-4 text-xs">
                          {new Date(promo.start_date).toLocaleDateString()} - {new Date(promo.end_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-bold">
                            -{promo.discount_percent}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-500 max-w-xs truncate">
                          {promo.product_names}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeletePromo(promo.id)}
                            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {promotions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">Nenhuma promoção registada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-zinc-100">
                {promotions.map(promo => (
                  <div key={`promo-mob-${promo.id}`} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm">{promo.name}</p>
                        <p className="text-[10px] text-zinc-400">{new Date(promo.start_date).toLocaleDateString()} - {new Date(promo.end_date).toLocaleDateString()}</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-bold">
                        -{promo.discount_percent}%
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 bg-zinc-50 p-2 rounded-lg">
                      <span className="font-bold uppercase tracking-widest text-zinc-400 mr-1">Produtos:</span>
                      {promo.product_names}
                    </p>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => handleDeletePromo(promo.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold transition-all"
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {promotions.length === 0 && (
                  <div className="p-12 text-center text-zinc-400 text-sm">Nenhuma promoção registada.</div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

          {activeTab === 'staff' && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="font-bold">Equipa do Estabelecimento</h3>
                    <button 
                      onClick={() => {
                        setEditingStaff(null);
                        setStaffForm({ name: '', email: '', username: '', password: '', salary: '', shift_info: '' });
                        setIsStaffModalOpen(true);
                      }}
                      className="w-full md:w-auto bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Adicionar Colaborador
                    </button>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {staff.map(member => (
                      <div key={`staff-${member.id}`} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-50 transition-colors gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 shrink-0">
                            <UserIcon size={20} className="md:w-6 md:h-6" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold truncate">{member.name}</p>
                              {member.status === 'suspended' && (
                                <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                  Suspenso
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 truncate">{member.email} • {member.shift_info}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-4">
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Salário</p>
                            <p className="font-bold text-sm md:text-base">Kz {member.salary.toLocaleString()}</p>
                          </div>
                          <div className="flex gap-1 md:gap-2">
                            <button 
                              onClick={() => handleToggleStaffStatus(member.id, member.status)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-bold",
                                member.status === 'active' 
                                  ? "text-zinc-500 hover:text-rose-600 hover:bg-rose-50" 
                                  : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              )}
                              title={member.status === 'active' ? "Suspender Vendedor" : "Ativar Vendedor"}
                            >
                              {member.status === 'active' ? (
                                <>
                                  <ShieldAlert size={16} />
                                  <span className="hidden sm:inline">Suspender</span>
                                  <span className="sm:hidden">Susp.</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck size={16} />
                                  <span className="hidden sm:inline">Ativar</span>
                                  <span className="sm:hidden">Ativ.</span>
                                </>
                              )}
                            </button>
                            <button 
                              onClick={() => handleEditStaff(member)}
                              className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteStaff(member.id)}
                              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <div className="p-6 border-b border-zinc-100">
                    <h3 className="font-bold">Desempenho de Vendas</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {staffPerformance.map((perf: any) => (
                      <div key={`staff-perf-${perf.id}`} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-sm">{perf.name}</p>
                          <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-full">
                            {perf.total_sales} Vendas
                          </span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Faturamento</p>
                            <p className="font-black text-emerald-600">Kz {(perf.total_revenue || 0).toLocaleString()}</p>
                          </div>
                          <div className="w-16 h-1 bg-zinc-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500" 
                              style={{ width: `${Math.min(100, (perf.total_revenue / 100000) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {staffPerformance.length === 0 && (
                      <p className="text-center py-8 text-zinc-400 text-sm italic">Nenhum dado de desempenho disponível.</p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                    <h3 className="font-bold">Faturamento (Últimos 30 dias)</h3>
                    <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-zinc-400">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" /> Receita
                    </div>
                  </div>
                  <div className="h-[250px] md:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportsData?.salesByDay || []}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#a1a1aa' }}
                          tickFormatter={(str) => new Date(str).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#a1a1aa' }}
                          tickFormatter={(val) => `Kz ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                          formatter={(val: any) => [`Kz ${val.toLocaleString()}`, 'Receita']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4 md:p-6">
                  <h3 className="font-bold mb-6">Top 5 Produtos</h3>
                  <div className="space-y-4">
                    {reportsData?.topProducts?.map((product: any, idx: number) => (
                      <div key={product.id || `top-prod-${idx}`} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0">
                            #{idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-800 truncate">{product.name}</p>
                            <p className="text-[10px] text-zinc-400">{product.quantity} unidades</p>
                          </div>
                        </div>
                        <p className="text-xs font-black shrink-0 ml-2">Kz {product.revenue.toLocaleString()}</p>
                      </div>
                    ))}
                    {(!reportsData?.topProducts || reportsData.topProducts.length === 0) && (
                      <p className="text-center py-8 text-zinc-400 text-sm italic">Nenhum dado disponível.</p>
                    )}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-4 md:p-6">
                  <h3 className="font-bold mb-6">Vendas por Categoria</h3>
                  <div className="h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportsData?.salesByCategory || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {(reportsData?.salesByCategory || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4 md:p-6">
                  <h3 className="font-bold mb-6">Métodos de Pagamento</h3>
                  <div className="h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportsData?.paymentMethods || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                        <Tooltip 
                          cursor={{ fill: '#f4f4f5' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                          {(reportsData?.paymentMethods || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b'][index % 3]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <Modal 
                isOpen={!!selectedCreditInvoice} 
                onClose={() => setSelectedCreditInvoice(null)}
                title="Visualizar Fatura"
                maxWidth="max-w-4xl"
              >
                {selectedCreditInvoice && (
                  <CreditInvoicePreview invoice={selectedCreditInvoice} establishment={establishment} />
                )}
              </Modal>

              <Modal
                isOpen={isInvoiceTypeModalOpen}
                onClose={() => setIsInvoiceTypeModalOpen(false)}
                title={invoiceModalMode === 'invoice' ? "Nova Fatura" : "Nova Nota"}
                maxWidth="max-w-md"
              >
                <div className="grid grid-cols-2 gap-4 p-4">
                  {invoiceModalMode === 'invoice' ? (
                    <>
                      <button 
                        onClick={() => {
                          setCreditInvoiceForm({
                            ...creditInvoiceForm, 
                            doc_type: 'FT',
                            parent_invoice_id: '',
                            items: []
                          });
                          setIsInvoiceTypeModalOpen(false);
                          setIsCreditInvoiceModalOpen(true);
                        }}
                        className="flex flex-col items-center gap-4 p-6 bg-zinc-50 border-2 border-zinc-100 rounded-3xl hover:border-black hover:bg-zinc-100 transition-all group"
                      >
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <CreditCard className="text-zinc-400 group-hover:text-black" size={24} />
                        </div>
                        <div className="text-center">
                          <h4 className="font-black uppercase tracking-widest text-[10px]">Fatura Crédito</h4>
                          <p className="text-[10px] text-zinc-500 mt-1">Venda a prazo.</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => {
                          setCreditInvoiceForm({
                            ...creditInvoiceForm, 
                            doc_type: 'FR',
                            parent_invoice_id: '',
                            items: []
                          });
                          setIsInvoiceTypeModalOpen(false);
                          setIsCreditInvoiceModalOpen(true);
                        }}
                        className="flex flex-col items-center gap-4 p-6 bg-zinc-50 border-2 border-zinc-100 rounded-3xl hover:border-black hover:bg-zinc-100 transition-all group"
                      >
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <FileText className="text-zinc-400 group-hover:text-black" size={24} />
                        </div>
                        <div className="text-center">
                          <h4 className="font-black uppercase tracking-widest text-[10px]">Fatura Recibo</h4>
                          <p className="text-[10px] text-zinc-500 mt-1">Venda a pronto.</p>
                        </div>
                      </button>

              <button 
                onClick={() => {
                  setCreditInvoiceForm({
                    ...creditInvoiceForm, 
                    doc_type: 'PP',
                    parent_invoice_id: '',
                    items: [],
                    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    invoice_date: new Date().toISOString().split('T')[0]
                  });
                  setIsInvoiceTypeModalOpen(false);
                  setIsCreditInvoiceModalOpen(true);
                }}
                className="flex flex-col items-center gap-4 p-6 bg-blue-50/50 border-2 border-blue-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <ClipboardList className="text-blue-500" size={24} />
                </div>
                <div className="text-center">
                  <h4 className="font-black uppercase tracking-widest text-[10px] text-blue-700">Fatura Proforma (PP)</h4>
                  <p className="text-[10px] text-blue-600 mt-1">Orçamento/Cotação.</p>
                </div>
              </button>

                      <button 
                        onClick={() => {
                          setCreditInvoiceForm({
                            ...creditInvoiceForm, 
                            doc_type: 'RC',
                            parent_invoice_id: '',
                            items: []
                          });
                          setIsInvoiceTypeModalOpen(false);
                          setIsCreditInvoiceModalOpen(true);
                        }}
                        className="flex flex-col items-center gap-4 p-6 bg-zinc-50 border-2 border-zinc-100 rounded-3xl hover:border-black hover:bg-zinc-100 transition-all group"
                      >
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <CheckCircle className="text-zinc-400 group-hover:text-black" size={24} />
                        </div>
                        <div className="text-center">
                          <h4 className="font-black uppercase tracking-widest text-[10px]">Recibo (RC)</h4>
                          <p className="text-[10px] text-zinc-500 mt-1">Liquidar Fatura Crédito.</p>
                        </div>
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setCreditInvoiceForm({
                            ...creditInvoiceForm, 
                            doc_type: 'NC',
                            parent_invoice_id: creditInvoiceForm.parent_invoice_id || '',
                            items: creditInvoiceForm.parent_invoice_id ? creditInvoiceForm.items : [],
                            reason: '',
                            note_category: 'return'
                          });
                          setIsInvoiceTypeModalOpen(false);
                          setIsCreditInvoiceModalOpen(true);
                        }}
                        className="flex flex-col items-center gap-4 p-6 bg-zinc-50 border-2 border-zinc-100 rounded-3xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                      >
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <ArrowDownCircle className="text-zinc-400 group-hover:text-orange-500" size={24} />
                        </div>
                        <div className="text-center">
                          <h4 className="font-black uppercase tracking-widest text-[10px]">Nota Crédito</h4>
                          <p className="text-[10px] text-zinc-500 mt-1">Reduzir valor.</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => {
                          setCreditInvoiceForm({
                            ...creditInvoiceForm, 
                            doc_type: 'ND',
                            parent_invoice_id: creditInvoiceForm.parent_invoice_id || '',
                            items: creditInvoiceForm.parent_invoice_id ? creditInvoiceForm.items : [],
                            reason: '',
                            adjustment_amount: 0,
                            observations: ''
                          });
                          setIsInvoiceTypeModalOpen(false);
                          setIsCreditInvoiceModalOpen(true);
                        }}
                        className="flex flex-col items-center gap-4 p-6 bg-zinc-50 border-2 border-zinc-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <ArrowUpCircle className="text-zinc-400 group-hover:text-blue-500" size={24} />
                        </div>
                        <div className="text-center">
                          <h4 className="font-black uppercase tracking-widest text-[10px]">Nota Débito</h4>
                          <p className="text-[10px] text-zinc-500 mt-1">Aumentar valor.</p>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </Modal>

              <Modal
                isOpen={isCreditInvoiceModalOpen}
                onClose={() => setIsCreditInvoiceModalOpen(false)}
                title={
                  creditInvoiceForm.doc_type === 'FT' ? "Nova Fatura Crédito" : 
                  creditInvoiceForm.doc_type === 'FR' ? "Nova Fatura Recibo" :
                  creditInvoiceForm.doc_type === 'PP' ? "Nova Fatura Proforma" :
                  creditInvoiceForm.doc_type === 'RC' ? "Novo Recibo (RC)" :
                  creditInvoiceForm.doc_type === 'NC' ? "Nova Nota de Crédito" :
                  "Nova Nota de Débito"
                }
                maxWidth="max-w-4xl"
              >
                <form onSubmit={handleCreateCreditInvoice} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-4">
                      {/* Selection of Associated Invoice for RC/NC/ND */}
                      {(creditInvoiceForm.doc_type === 'NC' || creditInvoiceForm.doc_type === 'ND' || creditInvoiceForm.doc_type === 'RC') && (
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-2">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Fatura Associada</h4>
                          <div>
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Selecionar Fatura (Obrigatório)</label>
                            <select 
                              required
                              value={creditInvoiceForm.parent_invoice_id}
                              onChange={(e) => {
                                const inv = creditInvoices.find(i => i.id.toString() === e.target.value);
                                if (inv) {
                                  let items = [];
                                  try {
                                    items = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
                                  } catch (err) {}
                                  
                                  setCreditInvoiceForm({
                                    ...creditInvoiceForm,
                                    parent_invoice_id: inv.id.toString(),
                                    client_name: inv.client_name,
                                    client_nif: inv.client_nif,
                                    address: inv.address || '',
                                    country: inv.country || 'Angola',
                                    currency: inv.currency || 'AOA',
                                    items: items.map((it: any) => ({ ...it, quantity: it.quantity, max_quantity: it.quantity }))
                                  });
                                }
                              }}
                              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-black text-xs"
                            >
                              <option value="">Selecione uma fatura...</option>
                              {creditInvoices
                                .filter(inv => {
                                  if (creditInvoiceForm.doc_type === 'RC') return inv.doc_type === 'FT';
                                  return inv.doc_type === 'FT' || inv.doc_type === 'FR';
                                })
                                .map(inv => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.doc_type} {inv.invoice_number} - {inv.client_name} ({new Date(inv.invoice_date).toLocaleDateString()})
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                          
                          {creditInvoiceForm.doc_type !== 'RC' && (
                            <div>
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Motivo da Nota (Obrigatório)</label>
                              <textarea 
                                required
                                value={creditInvoiceForm.reason}
                                onChange={e => setCreditInvoiceForm({...creditInvoiceForm, reason: e.target.value})}
                                placeholder={creditInvoiceForm.doc_type === 'NC' ? "Ex: Devolução..." : "Ex: Erro no preço..."}
                                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-black text-xs min-h-[40px]"
                              />
                            </div>
                          )}

                          {creditInvoiceForm.doc_type === 'NC' && (
                            <div className="space-y-2">
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Tipo de Nota</label>
                              <div className="grid grid-cols-2 gap-2">
                                <button 
                                  type="button"
                                  onClick={() => setCreditInvoiceForm({...creditInvoiceForm, note_category: 'return'})}
                                  className={cn(
                                    "p-2 rounded-xl border-2 transition-all text-left",
                                    creditInvoiceForm.note_category === 'return' ? "border-orange-500 bg-orange-50" : "border-zinc-100 bg-white hover:border-zinc-200"
                                  )}
                                >
                                  <p className="font-bold text-[10px]">Devolução</p>
                                  <p className="text-[7px] text-zinc-500">Volta ao stock.</p>
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setCreditInvoiceForm({...creditInvoiceForm, note_category: 'correction'})}
                                  className={cn(
                                    "p-2 rounded-xl border-2 transition-all text-left",
                                    creditInvoiceForm.note_category === 'correction' ? "border-orange-500 bg-orange-50" : "border-zinc-100 bg-white hover:border-zinc-200"
                                  )}
                                >
                                  <p className="font-bold text-[10px]">Correção</p>
                                  <p className="text-[7px] text-zinc-500">Apenas financeiro.</p>
                                </button>
                              </div>

                              {creditInvoiceForm.note_category === 'correction' && (
                                <div>
                                  <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Valor da Correção</label>
                                  <input 
                                    type="number"
                                    value={creditInvoiceForm.adjustment_amount}
                                    onChange={e => setCreditInvoiceForm({...creditInvoiceForm, adjustment_amount: parseFloat(e.target.value) || 0})}
                                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-black text-xs"
                                    placeholder="Valor a descontar..."
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {creditInvoiceForm.doc_type === 'ND' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Valor Adicional</label>
                                <input 
                                  type="number"
                                  value={creditInvoiceForm.adjustment_amount}
                                  onChange={e => setCreditInvoiceForm({...creditInvoiceForm, adjustment_amount: parseFloat(e.target.value) || 0})}
                                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-black text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Observação</label>
                                <input 
                                  type="text"
                                  value={creditInvoiceForm.observations}
                                  onChange={e => setCreditInvoiceForm({...creditInvoiceForm, observations: e.target.value})}
                                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-black text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Dados do Cliente</h4>
                          {creditInvoiceForm.doc_type === 'PP' && (
                            <div className="relative w-44">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" size={10} />
                              <input 
                                type="text"
                                placeholder="Procurar Cliente..."
                                className="w-full pl-7 pr-2 py-1 bg-white border border-zinc-200 rounded-lg outline-none focus:border-black text-[9px]"
                                value={clientSearch}
                                onChange={(e) => {
                                  const query = e.target.value;
                                  setClientSearch(query);
                                  if (query.length >= 1) {
                                    const matches = clients.filter(c => 
                                      c.name.toLowerCase().includes(query.toLowerCase()) || 
                                      c.nif.toLowerCase().includes(query.toLowerCase())
                                    ).slice(0, 5);
                                    setClientResults(matches);
                                  } else {
                                    setClientResults([]);
                                  }
                                }}
                              />
                              {clientResults.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                  {clientResults.map((c: any) => (
                                    <button
                                      key={`cl-res-${c.id}`}
                                      type="button"
                                      onClick={() => {
                                        setCreditInvoiceForm({
                                          ...creditInvoiceForm,
                                          client_name: c.name,
                                          client_nif: c.nif,
                                          address: c.address || ''
                                        });
                                        setClientSearch('');
                                        setClientResults([]);
                                      }}
                                      className="w-full px-2 py-1.5 text-left hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                                    >
                                      <p className="text-[10px] font-bold text-zinc-800 uppercase">{c.name}</p>
                                      <p className="text-[8px] text-zinc-400">NIF: {c.nif}</p>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">NIF do Cliente</label>
                            <input 
                              type="text"
                              required
                              readOnly={!!creditInvoiceForm.parent_invoice_id}
                              value={creditInvoiceForm.client_nif}
                              onChange={e => setCreditInvoiceForm({...creditInvoiceForm, client_nif: e.target.value})}
                              className={cn(
                                "w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none focus:border-black text-xs",
                                creditInvoiceForm.parent_invoice_id ? "bg-zinc-100 cursor-not-allowed" : "bg-white"
                              )}
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Nome do Cliente</label>
                            <input 
                              type="text"
                              required
                              readOnly={!!creditInvoiceForm.parent_invoice_id}
                              value={creditInvoiceForm.client_name}
                              onChange={e => setCreditInvoiceForm({...creditInvoiceForm, client_name: e.target.value})}
                              className={cn(
                                "w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none focus:border-black text-xs",
                                creditInvoiceForm.parent_invoice_id ? "bg-zinc-100 cursor-not-allowed" : "bg-white"
                              )}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Endereço</label>
                            <input 
                              type="text"
                              required
                              readOnly={!!creditInvoiceForm.parent_invoice_id}
                              value={creditInvoiceForm.address}
                              onChange={e => setCreditInvoiceForm({...creditInvoiceForm, address: e.target.value})}
                              className={cn(
                                "w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none focus:border-black text-xs",
                                creditInvoiceForm.parent_invoice_id ? "bg-zinc-100 cursor-not-allowed" : "bg-white"
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Item Table logic for RC/NC/ND */}
                      {(creditInvoiceForm.doc_type === 'FT' || creditInvoiceForm.doc_type === 'FR' || creditInvoiceForm.doc_type === 'PP' || (creditInvoiceForm.doc_type === 'NC' && creditInvoiceForm.note_category === 'return') || creditInvoiceForm.doc_type === 'ND' || creditInvoiceForm.doc_type === 'RC') && (
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                              {creditInvoiceForm.doc_type === 'NC' ? "Produtos a Devolver" : 
                               creditInvoiceForm.doc_type === 'RC' ? "Itens Pagos" : "Itens da Fatura"}
                            </h4>
                            {(creditInvoiceForm.doc_type === 'FT' || creditInvoiceForm.doc_type === 'FR' || creditInvoiceForm.doc_type === 'PP' || creditInvoiceForm.doc_type === 'ND') && (
                              <div className="flex gap-2">
                                <div className="relative w-44">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" size={10} />
                                  <input 
                                    type="text"
                                    placeholder="Procurar Produto..."
                                    className="w-full pl-7 pr-2 py-1 bg-white border border-zinc-200 rounded-lg outline-none focus:border-black text-[9px]"
                                    value={productSearch}
                                    onChange={(e) => {
                                      const query = e.target.value;
                                      setProductSearch(query);
                                      if (query.length >= 1) {
                                        const matches = [
                                          ...products.map(p => ({...p, resultType: 'product'})),
                                          ...services.map(s => ({...s, resultType: 'service'}))
                                        ].filter(item => 
                                          item.name.toLowerCase().includes(query.toLowerCase()) || 
                                          (item.barcode && item.barcode.toLowerCase().includes(query.toLowerCase()))
                                        ).slice(0, 5);
                                        setProductResults(matches);
                                      } else {
                                        setProductResults([]);
                                      }
                                    }}
                                  />
                                  {productResults.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                      {productResults.map((item: any) => (
                                        <button
                                          key={`prod-match-${item.resultType}-${item.id}`}
                                          type="button"
                                          onClick={() => {
                                            if (item.resultType === 'product') {
                                              addProductToCreditInvoice(item);
                                            } else {
                                              addServiceToCreditInvoice(item);
                                            }
                                            setProductSearch('');
                                            setProductResults([]);
                                          }}
                                          className="w-full px-2 py-1.5 text-left hover:bg-zinc-50 flex items-center justify-between border-b border-zinc-100 last:border-0"
                                        >
                                          <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-zinc-800 truncate max-w-[120px] font-sans uppercase">
                                              {item.name}
                                            </span>
                                            <span className="text-[8px] text-zinc-400 font-mono">
                                              {item.resultType === 'product' ? 'PRODUTO' : 'SERVIÇO'} • {item.barcode || item.id}
                                            </span>
                                          </div>
                                          <span className="text-[9px] font-black text-orange-600">Kz {item.price.toLocaleString()}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCreditInvoiceForm({
                                      ...creditInvoiceForm,
                                      items: [...creditInvoiceForm.items, { 
                                        product_id: Math.floor(Math.random() * 1000000), 
                                        code: 'MANUAL', 
                                        name: 'NOVO ITEM MANUAL', 
                                        price: 0, 
                                        quantity: 1, 
                                        tax: user?.fiscal_regime === 'simplificado' ? 7 : (user?.fiscal_regime === 'exclusao' ? 0 : 14),
                                        type: 'product'
                                      }]
                                    });
                                  }}
                                  className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-[9px] font-bold flex items-center gap-1 transition-colors"
                                >
                                  <Plus size={10} /> Item Manual
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200">
                                  <th className="pb-1.5">Código</th>
                                  <th className="pb-1.5">Descrição</th>
                                  <th className="pb-1.5 text-center">Qtd</th>
                                  <th className="pb-1.5 text-right">Preço</th>
                                  <th className="pb-1.5 text-right">IVA</th>
                                  <th className="pb-1.5 text-right">Ação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100">
                                {creditInvoiceForm.items.map((item, index) => (
                                  <tr key={`ci-item-${item.type}-${item.product_id}-${index}`} className="text-xs">
                                    <td className="py-1.5 font-mono text-[9px]">
                                      <span className={cn(
                                        "px-1 py-0.5 rounded text-[7px] font-black uppercase mr-1",
                                        item.type === 'product' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                                      )}>
                                        {item.type === 'product' ? 'P' : 'S'}
                                      </span>
                                      {item.code}
                                    </td>
                                    <td className="py-1.5 font-bold text-[10px]">
                                      <input 
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => updateCreditInvoiceItemField(item.product_id, item.type, 'name', e.target.value)}
                                        className="w-full bg-transparent border-b border-transparent focus:border-zinc-300 outline-none uppercase"
                                      />
                                    </td>
                                    <td className="py-1.5">
                                      <div className="flex items-center justify-center gap-1">
                                        <button 
                                          type="button"
                                          onClick={() => updateCreditInvoiceItemQuantity(item.product_id, item.type, item.quantity - 1)}
                                          className="p-0.5 hover:bg-zinc-200 rounded-md"
                                        >
                                          <Minus size={8} />
                                        </button>
                                        <span className="w-5 text-center font-bold text-[10px]">{item.quantity}</span>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            if (creditInvoiceForm.doc_type === 'NC' && item.max_quantity && item.quantity >= item.max_quantity) return;
                                            updateCreditInvoiceItemQuantity(item.product_id, item.type, item.quantity + 1);
                                          }}
                                          className={cn(
                                            "p-0.5 hover:bg-zinc-200 rounded-md",
                                            creditInvoiceForm.doc_type === 'NC' && item.max_quantity && item.quantity >= item.max_quantity && "opacity-20 cursor-not-allowed"
                                          )}
                                        >
                                          <Plus size={8} />
                                        </button>
                                      </div>
                                      {item.max_quantity && (
                                        <p className="text-[6px] text-center text-zinc-400 uppercase font-bold mt-0.5">Máx: {item.max_quantity}</p>
                                      )}
                                    </td>
                                    <td className="py-1.5 text-right text-[10px]">
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="text-zinc-400 font-mono">Kz</span>
                                        <input 
                                          type="number"
                                          value={item.price}
                                          onChange={(e) => updateCreditInvoiceItemField(item.product_id, item.type, 'price', Number(e.target.value))}
                                          className="w-20 bg-transparent border-b border-transparent focus:border-zinc-300 outline-none text-right font-bold"
                                        />
                                      </div>
                                    </td>
                                    <td className="py-1.5 text-right text-[10px]">
                                      <div className="flex items-center justify-end">
                                        <input 
                                          type="number"
                                          value={item.tax}
                                          onChange={(e) => updateCreditInvoiceItemField(item.product_id, item.type, 'tax', Number(e.target.value))}
                                          className="w-8 bg-transparent border-b border-transparent focus:border-zinc-300 outline-none text-right"
                                        />
                                        <span className="text-zinc-400">%</span>
                                      </div>
                                    </td>
                                    <td className="py-1.5 text-right">
                                      <button 
                                        type="button"
                                        onClick={() => removeProductFromCreditInvoice(item.product_id, item.type)}
                                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {creditInvoiceForm.items.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="py-4 text-center text-zinc-400 text-[10px] italic">
                                      Nenhum item adicionado.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-zinc-900 text-white rounded-2xl space-y-4 shadow-xl shadow-black/20">
                        {(creditInvoiceForm.doc_type === 'FT' || creditInvoiceForm.doc_type === 'FR' || creditInvoiceForm.doc_type === 'PP' || creditInvoiceForm.doc_type === 'RC') && (
                          <>
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Detalhes do Documento</h4>
                            <div className="space-y-2">
                              <div>
                                <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Tipo de Documento</label>
                                <select 
                                  value={creditInvoiceForm.doc_type}
                                  onChange={e => setCreditInvoiceForm({...creditInvoiceForm, doc_type: e.target.value})}
                                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg outline-none focus:border-orange-500 text-xs"
                                >
                                  <option value="FT">Fatura Crédito</option>
                                  <option value="FR">Fatura Recibo</option>
                                  <option value="PP">Fatura Proforma (PP)</option>
                                  <option value="RC">Recibo (RC)</option>
                                </select>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                <div>
                                  <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Nº Documento (Obrigatório)</label>
                                  <input 
                                    type="text"
                                    value={creditInvoiceForm.invoice_number}
                                    onChange={e => setCreditInvoiceForm({...creditInvoiceForm, invoice_number: e.target.value})}
                                    className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg outline-none focus:border-orange-500 text-xs"
                                    placeholder="Auto (Recomendado)"
                                  />
                                </div>
                              </div>
                              {creditInvoiceForm.items.length > 0 && creditInvoiceForm.items.every(item => item.type === 'service') && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="pt-2 border-t border-zinc-800"
                                >
                                  <label className="block text-[9px] font-bold text-orange-500 uppercase mb-1 flex items-center gap-1">
                                    <Tag size={8} /> Designação do Serviço (Série Especial)
                                  </label>
                                  <input 
                                    type="text"
                                    value={creditInvoiceForm.service_designation}
                                    onChange={e => setCreditInvoiceForm({...creditInvoiceForm, service_designation: e.target.value})}
                                    placeholder="Ex: Consultoria Técnica / Manutenção"
                                    className="w-full px-3 py-1.5 bg-zinc-800 border border-orange-500/30 rounded-lg outline-none focus:border-orange-500 text-xs text-white placeholder:text-zinc-600"
                                  />
                                  <p className="text-[8px] text-zinc-500 mt-1 italic leading-tight">
                                    Nota: Esta designação será anexada à identificação da série do documento.
                                  </p>
                                </motion.div>
                              )}
                              <div>
                                 <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Data da Fatura (Automática)</label>
                                 <input 
                                   type="date"
                                   required
                                   readOnly
                                   value={creditInvoiceForm.invoice_date}
                                   className="w-full px-3 py-1.5 bg-zinc-700/50 border border-zinc-700 rounded-lg outline-none cursor-not-allowed text-xs text-zinc-400"
                                 />
                              </div>
                              {creditInvoiceForm.doc_type === 'FT' && (
                                <div className="space-y-2 pt-2 border-t border-zinc-800">
                                  <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Prazo de Pagamento</label>
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const d = new Date(creditInvoiceForm.invoice_date);
                                        d.setDate(d.getDate() + 7);
                                        setCreditInvoiceForm({...creditInvoiceForm, due_date: d.toISOString().split('T')[0]});
                                      }}
                                      className={cn(
                                        "py-1 px-2 rounded-lg text-[9px] font-bold uppercase transition-all",
                                        creditInvoiceForm.due_date === new Date(new Date(creditInvoiceForm.invoice_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                                          ? "bg-orange-500 text-white" 
                                          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white"
                                      )}
                                    >
                                      7 Dias
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const d = new Date(creditInvoiceForm.invoice_date);
                                        d.setDate(d.getDate() + 30);
                                        setCreditInvoiceForm({...creditInvoiceForm, due_date: d.toISOString().split('T')[0]});
                                      }}
                                      className={cn(
                                        "py-1 px-2 rounded-lg text-[9px] font-bold uppercase transition-all",
                                        creditInvoiceForm.due_date === new Date(new Date(creditInvoiceForm.invoice_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                                          ? "bg-orange-500 text-white" 
                                          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white"
                                      )}
                                    >
                                      30 Dias
                                    </button>
                                  </div>
                                  <div>
                                    <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-1">Ou selecione data exacta:</label>
                                    <input 
                                      type="date"
                                      value={creditInvoiceForm.due_date}
                                      onChange={e => setCreditInvoiceForm({...creditInvoiceForm, due_date: e.target.value})}
                                      className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg outline-none focus:border-orange-500 text-xs text-white"
                                    />
                                  </div>
                                </div>
                              )}
                              <div>
                                <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Moeda</label>
                                <input 
                                  type="text"
                                  readOnly
                                  value={creditInvoiceForm.currency}
                                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg outline-none text-xs opacity-50"
                                />
                              </div>
                              {creditInvoiceForm.doc_type === 'PP' && (
                                <div className="pt-2 border-t border-zinc-800">
                                  <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Observações</label>
                                  <textarea 
                                    value={creditInvoiceForm.observations}
                                    onChange={e => setCreditInvoiceForm({...creditInvoiceForm, observations: e.target.value})}
                                    placeholder="Obs Adicionais..."
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg outline-none focus:border-orange-500 text-xs min-h-[60px]"
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        <div className="pt-4 border-t border-zinc-800 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                            <span>Subtotal Itens</span>
                            <span>Kz {creditInvoiceForm.items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}</span>
                          </div>
                          {creditInvoiceForm.doc_type === 'ND' && creditInvoiceForm.adjustment_amount > 0 && (
                            <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                              <span>Ajuste Manual</span>
                              <span>Kz {creditInvoiceForm.adjustment_amount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                            <span>IVA ({creditInvoiceForm.items?.[0]?.tax ?? (user?.fiscal_regime === 'exclusao' ? 0 : 14)}%)</span>
                            <span>Kz {creditInvoiceForm.items.reduce((acc, item) => acc + (item.price * item.quantity * ((item.tax ?? (user?.fiscal_regime === 'exclusao' ? 0 : 14)) / 100)), 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-lg font-black pt-2">
                            <span>{creditInvoiceForm.doc_type === 'NC' ? 'VALOR NOTA' : 'TOTAL'}</span>
                            <span className={cn(
                              creditInvoiceForm.doc_type === 'NC' ? "text-orange-500" : 
                              creditInvoiceForm.doc_type === 'RC' ? "text-emerald-500" : "text-blue-500"
                            )}>
                              Kz {(
                                (creditInvoiceForm.items.reduce((acc, item) => acc + (item.price * item.quantity * (1 + (item.tax ?? (user?.fiscal_regime === 'exclusao' ? 0 : 14)) / 100)), 0)) + 
                                creditInvoiceForm.adjustment_amount
                              ).toLocaleString()}
                            </span>
                          </div>

                          {creditInvoiceForm.parent_invoice_id && (
                            <div className="mt-3 p-3 bg-zinc-800 rounded-xl border border-zinc-700">
                              <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1.5">Resumo da Fatura</p>
                              <div className="flex justify-between text-[10px] mb-0.5">
                                <span className="text-zinc-400">Valor Original:</span>
                                <span>Kz {creditInvoices.find(i => i.id.toString() === creditInvoiceForm.parent_invoice_id)?.total_amount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-[10px] font-bold pt-1.5 border-t border-zinc-700">
                                <span className="text-zinc-400">Novo Valor:</span>
                                <span className="text-emerald-500">
                                  Kz {(() => {
                                    const original = creditInvoices.find(i => i.id.toString() === creditInvoiceForm.parent_invoice_id)?.total_amount || 0;
                                    const noteValue = (creditInvoiceForm.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) * (1 + (creditInvoiceForm.items[0]?.tax ?? (user?.fiscal_regime === 'exclusao' ? 0 : 14)) / 100)) + 
                                                     creditInvoiceForm.adjustment_amount;
                                    return (creditInvoiceForm.doc_type === 'NC' ? original - noteValue : original + noteValue).toLocaleString();
                                  })()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <button 
                          type="submit"
                          disabled={creditInvoiceForm.items.length === 0}
                          className={cn(
                            "w-full py-3 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 disabled:shadow-none text-xs",
                            creditInvoiceForm.doc_type === 'NC' ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20" :
                            creditInvoiceForm.doc_type === 'ND' ? "bg-blue-500 hover:bg-blue-600 shadow-blue-500/20" :
                            creditInvoiceForm.doc_type === 'RC' ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" :
                            "bg-black hover:bg-zinc-800 shadow-black/20"
                          )}
                        >
                          Emitir {
                            creditInvoiceForm.doc_type === 'FT' ? "Fatura Crédito" : 
                            creditInvoiceForm.doc_type === 'FR' ? "Fatura Recibo" :
                            creditInvoiceForm.doc_type === 'RC' ? "Recibo" :
                            creditInvoiceForm.doc_type === 'PP' ? "Proforma" :
                            creditInvoiceForm.doc_type === 'NC' ? "Nota de Crédito" :
                            "Nota de Débito"
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </Modal>

              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex gap-6 items-center">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 tracking-tighter uppercase font-black italic">Gestão de Documentos</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Histórico de faturas e notas emitidas.</p>
                  </div>
                  <div className="h-8 w-px bg-zinc-200 hidden md:block"></div>
                  <div className="hidden md:flex items-center gap-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Natureza:</p>
                    <div className="flex bg-zinc-100 p-1 rounded-xl gap-1">
                      {['ALL', 'FT', 'FR', 'PP', 'RC', 'NC', 'ND'].map(f => (
                        <button
                          key={f}
                          onClick={() => setInvoiceTypeFilter(f)}
                          className={cn(
                            "px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all",
                            invoiceTypeFilter === f ? "bg-black text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-200"
                          )}
                        >
                          {f === 'ALL' ? 'TUDO' : f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-4 border-l border-zinc-200 pl-4">
                    <div className="flex flex-col">
                      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">De:</p>
                      <input 
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="bg-zinc-100 px-2 py-1.5 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Até:</p>
                      <input 
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        className="bg-zinc-100 px-2 py-1.5 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                    {(startDateFilter || endDateFilter) && (
                      <button 
                        onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                        className="mt-4 p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Limpar Datas"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (currencies.length === 0) {
                        alert('Por favor, cadastre pelo menos uma moeda nas configurações antes de emitir faturas.');
                        return;
                      }
                      setInvoiceModalMode('invoice');
                      setIsInvoiceTypeModalOpen(true);
                    }}
                    className="bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
                  >
                    <Plus size={18} /> Nova Fatura
                  </button>
                  <button 
                    onClick={() => {
                      if (currencies.length === 0) {
                        alert('Por favor, cadastre pelo menos uma moeda nas configurações antes de emitir notas.');
                        return;
                      }
                      setInvoiceModalMode('note');
                      setIsInvoiceTypeModalOpen(true);
                    }}
                    className="bg-zinc-200 text-zinc-900 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-zinc-300 transition-all font-black"
                  >
                    <FileText size={18} /> Notas
                  </button>
                </div>
              </div>

              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-zinc-100">
                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest text-center">Req.</th>
                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Documento</th>
                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Natureza</th>
                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Cliente</th>
                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Emissão</th>
                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Total</th>
                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditInvoices
                        .filter(inv => {
                          const matchesType = invoiceTypeFilter === 'ALL' || inv.doc_type === invoiceTypeFilter;
                          const invDate = inv.invoice_date.split('T')[0];
                          const matchesStart = !startDateFilter || invDate >= startDateFilter;
                          const matchesEnd = !endDateFilter || invDate <= endDateFilter;
                          return matchesType && matchesStart && matchesEnd;
                        })
                        .length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-16 text-center text-zinc-400 font-black uppercase tracking-widest text-[10px] italic">
                             Nenhum documento encontrado para este filtro.
                          </td>
                        </tr>
                      ) : (
                        creditInvoices
                          .filter(inv => {
                            const matchesType = invoiceTypeFilter === 'ALL' || inv.doc_type === invoiceTypeFilter;
                            const invDate = inv.invoice_date.split('T')[0];
                            const matchesStart = !startDateFilter || invDate >= startDateFilter;
                            const matchesEnd = !endDateFilter || invDate <= endDateFilter;
                            return matchesType && matchesStart && matchesEnd;
                          })
                          .map((inv) => {
                            const request = cancellationRequests.find(r => r.invoice_id === inv.id);
                            return (
                              <tr key={`${inv.is_pos ? 'pos' : 'ci'}-${inv.id}`} className="border-b border-zinc-50 hover:bg-zinc-50/80 transition-all group">
                                <td className="p-4 text-center">
                                  {request ? (
                                    <div className="flex justify-center">
                                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" title={`Solicitação Pendente: ${request.type}`} />
                                    </div>
                                  ) : '-'}
                                </td>
                                <td className="p-4">
                                  <span className="font-mono font-bold text-zinc-900 text-sm block">{inv.invoice_number}</span>
                                  <span className="text-[10px] text-zinc-400 uppercase font-black italic">{inv.series}</span>
                                </td>
                                <td className="p-4">
                                  <span className={cn(
                                    "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                    inv.doc_type === 'FT' ? "bg-blue-50 text-blue-600 border-blue-100" : 
                                    inv.doc_type === 'FR' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                    inv.doc_type === 'PP' ? "bg-zinc-100 text-zinc-600 border-zinc-200" :
                                    inv.doc_type === 'RC' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                    inv.doc_type === 'NC' ? "bg-orange-50 text-orange-600 border-orange-100" :
                                    "bg-indigo-50 text-indigo-600 border-indigo-100"
                                  )}>
                                    {inv.is_pos ? '🛒 PDV - ' : ''}
                                    {inv.doc_type === 'FT' ? 'Fat. Crédito' : 
                                     inv.doc_type === 'FR' ? 'Fat. Recibo' :
                                     inv.doc_type === 'PP' ? 'Proforma' :
                                     inv.doc_type === 'RC' ? 'Recibo (RC)' :
                                     inv.doc_type === 'NC' ? 'Nota Crédito' :
                                     'Nota Débito'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <p className="font-bold text-zinc-900 leading-tight uppercase text-xs">{inv.client_name}</p>
                                  <p className="text-[10px] text-zinc-500">NIF: {inv.client_nif}</p>
                                </td>
                                <td className="p-4 text-xs text-zinc-600">
                                  <div>{new Date(inv.invoice_date).toLocaleDateString('pt-AO')}</div>
                                  {inv.due_date && inv.doc_type === 'FT' && (
                                    <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Vence: {new Date(inv.due_date).toLocaleDateString('pt-AO')}</div>
                                  )}
                                </td>
                                <td className="p-4 font-black text-zinc-900 text-sm">
                                  Kz {inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4">
                                  <span className={cn(
                                    "px-2 py-1 rounded-full text-[10px] font-black uppercase border",
                                    (inv.status === 'liquidado' || inv.status === 'paid' || inv.doc_type === 'FR' || inv.doc_type === 'RC' || inv.is_pos)
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                      : "bg-amber-50 text-amber-600 border-amber-100"
                                  )}>
                                    {(inv.status === 'liquidado' || inv.status === 'paid' || inv.doc_type === 'FR' || inv.doc_type === 'RC' || inv.is_pos) 
                                      ? 'Liquidado' 
                                      : 'Pendente'}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    {(inv.doc_type === 'FT' || inv.doc_type === 'FR' || inv.doc_type === 'PP') && (
                                      <button 
                                        onClick={() => {
                                          const formatted = { ...inv };
                                          if (typeof formatted.items === 'string') {
                                            try {
                                              formatted.items = JSON.parse(formatted.items);
                                            } catch (e) {}
                                          }
                                          const request = cancellationRequests.find(r => r.invoice_id === inv.id);
                                          const originalItems = Array.isArray(formatted.items) ? formatted.items : [];
                                          
                                          setCreditInvoiceForm({
                                            client_nif: formatted.client_nif,
                                            client_name: formatted.client_name,
                                            address: formatted.address || '',
                                            country: formatted.country || 'Angola',
                                            doc_type: request?.doc_type || 'NC',
                                            series: new Date().getFullYear().toString(),
                                            invoice_number: '',
                                            invoice_date: new Date().toISOString().split('T')[0],
                                            currency: formatted.currency || 'AOA',
                                            items: (() => {
                                              if (request) {
                                                if (request.type === 'cancel') {
                                                  // Total cancellation: pre-fill all items with original quantities
                                                  return originalItems.map((it: any) => ({ ...it, quantity: it.quantity, max_quantity: it.quantity }));
                                                }
                                                if (request.items_json) {
                                                  try {
                                                    const requestedItems = JSON.parse(request.items_json);
                                                    if (Array.isArray(requestedItems) && requestedItems.length > 0) {
                                                      return originalItems.map((it: any) => {
                                                        const reqIt = requestedItems.find((ri: any) => ri.product_id === it.product_id && ri.type === it.type);
                                                        return {
                                                          ...it,
                                                          quantity: reqIt ? reqIt.quantity : 0,
                                                          max_quantity: it.quantity
                                                        };
                                                      });
                                                    }
                                                  } catch (e) {}
                                                }
                                              }
                                              return originalItems.map((it: any) => ({ ...it, quantity: 0, max_quantity: it.quantity }));
                                            })(),
                                            parent_invoice_id: inv.id.toString(),
                                            reason: request ? `${request.doc_type}: ${(request.type || '').toUpperCase()} - ${request.reason}` : '',
                                            note_category: request?.doc_type === 'ND' ? 'price_correction' : (request?.type === 'cancel' ? 'correction' : 'return'),
                                            adjustment_amount: request?.type === 'cancel' ? 0 : (request ? request.amount : 0),
                                            observations: request ? `Solicitado por ${request.requested_by_name}` : '',
                                            due_date: new Date().toISOString().split('T')[0],
                                            service_designation: ''
                                          });

                                          if (request) {
                                            // If there's a request, go directly to the note creation form
                                            setIsCreditInvoiceModalOpen(true);
                                          } else {
                                            // Otherwise, show the type selection modal
                                            setInvoiceModalMode('note');
                                            setIsInvoiceTypeModalOpen(true);
                                          }
                                        }}
                                        className={cn(
                                          "p-2 rounded-xl transition-all border",
                                          cancellationRequests.find(r => r.invoice_id === inv.id)
                                            ? cn(
                                                "shadow-[0_0_10px_rgba(0,0,0,0.05)] border-zinc-100",
                                                request?.doc_type === 'ND' ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                                              )
                                            : "hover:bg-orange-50 text-orange-600 border-transparent hover:border-orange-100"
                                        )}
                                        title={cancellationRequests.find(r => r.invoice_id === inv.id) ? `Processar Solicitação (${request?.doc_type})` : "Criar Nota Retificativa"}
                                      >
                                        <FileText size={16} />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => {
                                        const formatted = { ...inv };
                                        if (typeof formatted.items === 'string') {
                                          try {
                                            formatted.items = JSON.parse(formatted.items);
                                          } catch (e) {}
                                        }
                                        setSelectedCreditInvoice(formatted);
                                      }}
                                      className="p-2 hover:bg-zinc-100 rounded-xl transition-all text-zinc-600 border border-transparent hover:border-zinc-200"
                                      title="Visualizar"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const formatted = { ...inv };
                                        if (typeof formatted.items === 'string') {
                                          try {
                                            formatted.items = JSON.parse(formatted.items);
                                          } catch (e) {}
                                        }
                                        setSelectedCreditInvoice(formatted);
                                      }}
                                      className="p-2 hover:bg-zinc-100 rounded-xl transition-all text-zinc-600 border border-transparent hover:border-zinc-200"
                                      title="Imprimir"
                                    >
                                      <Printer size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="font-bold">Configurações do Estabelecimento</h3>
                </div>
                <form onSubmit={handleUpdateSettings} className="p-4 md:p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome do Estabelecimento</label>
                      <input 
                        type="text" 
                        value={settingsForm.name}
                        onChange={e => setSettingsForm({...settingsForm, name: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">NIF da Empresa</label>
                      <input 
                        type="text" 
                        value={settingsForm.nif}
                        onChange={e => setSettingsForm({...settingsForm, nif: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Telefone de Contacto</label>
                      <input 
                        type="text" 
                        value={settingsForm.phone}
                        onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Email do Estabelecimento (Opcional)</label>
                      <input 
                        type="email" 
                        value={settingsForm.email}
                        onChange={e => setSettingsForm({...settingsForm, email: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Endereço</label>
                      <input 
                        type="text" 
                        value={settingsForm.address}
                        onChange={e => setSettingsForm({...settingsForm, address: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm" 
                      />
                    </div>
                    <div className="col-span-full">
                      <label className="block text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Logotipo do Estabelecimento</label>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                          <input 
                            type="text" 
                            value={settingsForm.logo_url}
                            onChange={e => setSettingsForm({...settingsForm, logo_url: e.target.value})}
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm" 
                            placeholder="URL da imagem (https://...)"
                          />
                          <div className="relative">
                            <input 
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const base64 = await fileToBase64(file);
                                    setSettingsForm({...settingsForm, logo_url: base64});
                                  } catch (err) {
                                    console.error("Error converting file to base64", err);
                                  }
                                }
                              }}
                              className="hidden"
                              id="settings-logo-upload"
                            />
                            <label 
                              htmlFor="settings-logo-upload"
                              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-black hover:bg-zinc-50 transition-all text-sm font-bold text-zinc-600"
                            >
                              <Upload size={18} /> Carregar Imagem Local
                            </label>
                          </div>
                        </div>
                        {settingsForm.logo_url && (
                          <div className="w-24 h-24 bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200 shrink-0">
                            <img src={settingsForm.logo_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-span-full space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">Coordenadas Bancárias</label>
                        <button 
                          type="button"
                          onClick={addBankAccount}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus size={14} /> Adicionar Conta
                        </button>
                      </div>
                      
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {settingsForm.bank_accounts.map((account, index) => (
                          <div key={`bank-account-set-${index}`} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-4 relative group">
                            <button 
                              type="button"
                              onClick={() => removeBankAccount(index)}
                              className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X size={16} />
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nome do Banco</label>
                                <input 
                                  type="text"
                                  value={account.bank_name}
                                  onChange={e => updateBankAccount(index, 'bank_name', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-black text-sm"
                                  placeholder="Ex: BFA, BAI..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">IBAN</label>
                                <input 
                                  type="text"
                                  value={account.iban}
                                  onChange={e => updateBankAccount(index, 'iban', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-black text-sm"
                                  placeholder="AO06..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Titular da Conta</label>
                                <input 
                                  type="text"
                                  value={account.holder}
                                  onChange={e => updateBankAccount(index, 'holder', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-black text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Número da Conta</label>
                                <input 
                                  type="text"
                                  value={account.account_number}
                                  onChange={e => updateBankAccount(index, 'account_number', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-black text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {settingsForm.bank_accounts.length === 0 && (
                          <div className="text-center py-6 border-2 border-dashed border-zinc-100 rounded-xl">
                            <p className="text-xs text-zinc-400">Nenhuma coordenada bancária configurada.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-zinc-100 flex justify-end">
                    <button type="submit" className="w-full md:w-auto bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all active:scale-95">
                      Guardar Alterações
                    </button>
                  </div>
                </form>
              </Card>

              <div className="space-y-6">
                <Card>
                  <div className="p-6 border-b border-zinc-100">
                    <h3 className="font-bold">Estado da Unidade</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">Operacional</p>
                        <p className="text-xs text-zinc-500">Permitir vendas nesta unidade.</p>
                      </div>
                      <button 
                        onClick={() => setSettingsForm({...settingsForm, status: settingsForm.status === 'active' ? 'inactive' : 'active'})}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          settingsForm.status === 'active' ? "bg-emerald-500" : "bg-zinc-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                          settingsForm.status === 'active' ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </Card>

                <Card className="border-rose-100 bg-rose-50/10">
                  <div className="p-6 border-b border-rose-100">
                    <h3 className="font-bold text-rose-600">Zona de Perigo</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-xs text-zinc-500">
                      Eliminar um estabelecimento é uma acção irreversível. Todos os dados de produtos, vendas e colaboradores serão perdidos.
                    </p>
                    <button className="w-full flex items-center justify-center gap-2 py-3 text-rose-600 font-bold hover:bg-rose-100 rounded-xl transition-colors border border-rose-200">
                      <Trash2 size={18} />
                      Eliminar Estabelecimento Permanentemente
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
          )}
          
          {activeTab === 'cash-registers' && (
            <div className="flex-1 flex flex-col min-h-0">
              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                  <div>
                    <h3 className="font-bold">Gestão de Caixas</h3>
                    <p className="text-xs text-zinc-500">Configure os pontos de venda do seu estabelecimento.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setIsOpeningModalOpen(true)}
                      className="flex-1 md:flex-none bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Wallet size={16} /> Abrir Caixa
                    </button>
                    <button 
                      onClick={() => {
                        setEditingCashRegister(null);
                        setCashRegisterForm({ name: '', default_initial_balance: '0', max_limit: '0' });
                        setIsCashRegisterModalOpen(true);
                      }}
                      className="flex-1 md:flex-none bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Novo Caixa
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="hidden md:block">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4 font-semibold">Nome</th>
                          <th className="px-6 py-4 font-semibold">Código</th>
                          <th className="px-6 py-4 font-semibold">Estado</th>
                          <th className="px-6 py-4 font-semibold">Operador</th>
                          <th className="px-6 py-4 font-semibold">Saldo Inicial Padrão</th>
                          <th className="px-6 py-4 font-semibold">Limite Máximo</th>
                          <th className="px-6 py-4 font-semibold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {cashRegisters.map(register => (
                          <tr key={`reg-row-${register.id}`} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-sm">{register.name}</td>
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded border border-zinc-200">{register.code}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                register.session_status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                              )}>
                                {register.session_status === 'open' ? 'Aberto' : 'Fechado'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {register.session_status === 'open' ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-[10px] text-zinc-600 font-bold">
                                    {register.current_seller_name?.charAt(0) || 'U'}
                                  </div>
                                  <span className="text-xs font-medium text-zinc-600">{register.current_seller_name || 'Desconhecido'}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-300">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">Kz {register.default_initial_balance.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm font-medium text-rose-600">Kz {register.max_limit.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                {register.session_status === 'open' && (user.role === 'owner' || register.seller_id === user.id) ? (
                                  <button 
                                    onClick={() => handleCloseSessionDashboard(register.current_session_id!)}
                                    className="bg-orange-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-orange-600 transition-all mr-4"
                                  >
                                    Fechar Caixa
                                  </button>
                                ) : register.session_status === 'open' ? (
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase mr-4">Em Operação</span>
                                ) : (
                                  <div className="flex items-center gap-2 mr-4">
                                    <input 
                                      type="number" 
                                      placeholder="Saldo Inicial"
                                      value={openingAmounts[register.id] || ''}
                                      onChange={e => setOpeningAmounts(prev => ({ ...prev, [register.id]: e.target.value }))}
                                      className="w-24 px-2 py-1 text-xs border border-zinc-200 rounded outline-none focus:border-orange-500"
                                    />
                                    <button 
                                      onClick={() => handleOpenSession(register.id, openingAmounts[register.id] || '')}
                                      className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700 transition-all"
                                    >
                                      Abrir Caixa
                                    </button>
                                  </div>
                                )}
                                <button 
                                  onClick={() => {
                                    setEditingCashRegister(register);
                                    setCashRegisterForm({
                                      name: register.name,
                                      default_initial_balance: register.default_initial_balance.toString(),
                                      max_limit: register.max_limit.toString()
                                    });
                                    setIsCashRegisterModalOpen(true);
                                  }}
                                  className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteCashRegister(register.id)}
                                  className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {cashRegisters.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">Nenhum caixa registado.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-zinc-100">
                    {cashRegisters.map(register => (
                      <div key={`reg-mob-card-${register.id}`} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm">{register.name}</p>
                            <p className="text-[10px] font-mono text-zinc-400">{register.code}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setEditingCashRegister(register);
                                setCashRegisterForm({
                                  name: register.name,
                                  default_initial_balance: register.default_initial_balance.toString(),
                                  max_limit: register.max_limit.toString()
                                });
                                setIsCashRegisterModalOpen(true);
                              }}
                              className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCashRegister(register.id)}
                              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-50">
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Estado</p>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block",
                              register.session_status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                            )}>
                              {register.session_status === 'open' ? 'Aberto' : 'Fechado'}
                            </span>
                          </div>
                          {register.session_status === 'open' && (
                            <div>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Operador</p>
                              <p className="text-xs font-bold text-zinc-600">{register.current_seller_name || 'Desconhecido'}</p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-50">
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Saldo Inicial</p>
                            <p className="text-xs font-bold">Kz {register.default_initial_balance.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Limite Máximo</p>
                            <p className="text-xs font-bold text-rose-600">Kz {register.max_limit.toLocaleString()}</p>
                          </div>
                        </div>
                        {register.session_status === 'open' ? (
                          <div className="pt-2 border-t border-zinc-50">
                            <button 
                              onClick={() => handleCloseSessionDashboard(register.current_session_id!)}
                              className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-600 transition-all"
                            >
                              Fechar Caixa
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 pt-2 border-t border-zinc-50">
                            <input 
                              type="number" 
                              placeholder="Saldo Inicial"
                              value={openingAmounts[register.id] || ''}
                              onChange={e => setOpeningAmounts(prev => ({ ...prev, [register.id]: e.target.value }))}
                              className="flex-1 px-3 py-2 text-xs border border-zinc-200 rounded-lg outline-none focus:border-orange-500"
                            />
                            <button 
                              onClick={() => handleOpenSession(register.id, openingAmounts[register.id] || '')}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-all"
                            >
                              Abrir Caixa
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {cashRegisters.length === 0 && (
                      <div className="p-12 text-center text-zinc-400 text-sm">Nenhum caixa registado.</div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {/* Stock Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                      <Package size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Produtos</p>
                      <p className="text-xl md:text-2xl font-black">{stockReport?.stats?.total_products || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                      <BarChart3 size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest">Quantidade Total</p>
                      <p className="text-xl md:text-2xl font-black">{stockReport?.stats?.total_quantity || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                      <DollarSign size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest">Valor do Stock</p>
                      <p className="text-xl md:text-2xl font-black truncate">Kz {(stockReport?.stats?.total_value || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Low Stock Alerts */}
              {stockReport?.lowStock?.length > 0 && (
                <Card className="border-rose-200 bg-rose-50/30">
                  <div className="p-4 border-b border-rose-100 flex items-center gap-2 text-rose-700">
                    <AlertTriangle size={20} />
                    <h3 className="font-bold">Alertas de Stock Baixo</h3>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stockReport.lowStock.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-rose-100 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={p.image_url || undefined} alt="" className="w-8 h-8 rounded object-cover shrink-0" referrerPolicy="no-referrer" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-800 truncate">{p.name}</p>
                            <p className="text-[10px] text-zinc-400">Mínimo: {p.min_stock}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg shrink-0">
                          {p.stock} un
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inventory List */}
                <Card className="lg:col-span-2">
                  <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="font-bold">Inventário / Lista de Stock</h3>
                    <button 
                      onClick={() => setIsStockModalOpen(true)}
                      className="w-full md:w-auto bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Movimentar Stock
                    </button>
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4 font-semibold">Produto</th>
                          <th className="px-6 py-4 font-semibold">Estabelecimento</th>
                          <th className="px-6 py-4 font-semibold">Stock Atual</th>
                          <th className="px-6 py-4 font-semibold">Mínimo</th>
                          <th className="px-6 py-4 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {products.map(product => (
                          <tr key={product.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={product.image_url || undefined} alt="" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                                <span className="font-medium text-sm">{product.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-500">{establishment.name}</td>
                            <td className="px-6 py-4 text-sm font-bold">{product.stock} un</td>
                            <td className="px-6 py-4 text-sm text-zinc-400">{product.min_stock || 5} un</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                product.stock > (product.min_stock || 5) ? "bg-emerald-100 text-emerald-700" : 
                                product.stock > 0 ? "bg-amber-100 text-amber-700" : 
                                "bg-rose-100 text-rose-700"
                              )}>
                                {product.stock > (product.min_stock || 5) ? "Normal" : 
                                 product.stock > 0 ? "Baixo" : "Esgotado"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-zinc-100">
                    {products.map(product => (
                      <div key={product.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={product.image_url || undefined} alt="" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                            <p className="font-bold text-sm">{product.name}</p>
                          </div>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                            product.stock > (product.min_stock || 5) ? "bg-emerald-100 text-emerald-700" : 
                            product.stock > 0 ? "bg-amber-100 text-amber-700" : 
                            "bg-rose-100 text-rose-700"
                          )}>
                            {product.stock > (product.min_stock || 5) ? "Normal" : 
                             product.stock > 0 ? "Baixo" : "Esgotado"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-y border-zinc-50">
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Stock Atual</p>
                            <p className="font-bold text-sm">{product.stock} un</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Mínimo</p>
                            <p className="text-sm font-bold text-zinc-400">{product.min_stock || 5} un</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Movement History */}
                <Card>
                  <div className="p-6 border-b border-zinc-100">
                    <h3 className="font-bold">Histórico de Movimentações</h3>
                  </div>
                  <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                    {stockMovements.map((move: any) => (
                      <div key={move.id} className="flex gap-4 p-3 hover:bg-zinc-50 rounded-xl transition-colors border border-transparent hover:border-zinc-100">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          move.type === 'in' ? "bg-emerald-100 text-emerald-600" :
                          move.type === 'out' ? "bg-rose-100 text-rose-600" :
                          move.type === 'transfer' ? "bg-blue-100 text-blue-600" :
                          "bg-amber-100 text-amber-600"
                        )}>
                          {move.type === 'in' ? <Plus size={20} /> :
                           move.type === 'out' ? <Minus size={20} /> :
                           move.type === 'transfer' ? <ArrowRightLeft size={20} /> :
                           <Edit2 size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-bold text-zinc-800 truncate">{move.product_name}</p>
                            <span className={cn(
                              "text-[10px] font-black",
                              move.quantity > 0 ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {move.quantity > 0 ? '+' : ''}{move.quantity}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{move.reason || (move.type === 'in' ? 'Entrada de mercadoria' : 'Saída de mercadoria')}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[9px] text-zinc-500 font-medium flex items-center gap-1">
                              <Users size={10} /> {move.user_name}
                            </p>
                            <p className="text-[9px] text-zinc-400">
                              {new Date(move.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'support' && (
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-1 flex flex-col h-[600px]">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="font-bold">Meus Tickets</h3>
                  <button 
                    onClick={() => setIsTicketModalOpen(true)}
                    className="p-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {supportTickets.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-8">Nenhum ticket aberto.</p>
                  ) : (
                    supportTickets.map(ticket => (
                      <button
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl border transition-all",
                          selectedTicket?.id === ticket.id 
                            ? "bg-black border-black text-white shadow-lg" 
                            : "bg-white border-zinc-100 hover:border-zinc-300 text-zinc-900"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                            selectedTicket?.id === ticket.id ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600"
                          )}>
                            {ticket.status}
                          </span>
                          <span className="text-[10px] opacity-60">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-bold text-sm truncate">{ticket.subject}</p>
                        <p className={cn(
                          "text-xs mt-1 truncate",
                          selectedTicket?.id === ticket.id ? "text-white/70" : "text-zinc-500"
                        )}>
                          {ticket.description}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </Card>

              <Card className="lg:col-span-2 flex flex-col h-[600px]">
                {selectedTicket ? (
                  <>
                    <div className="p-6 border-b border-zinc-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">{selectedTicket.subject}</h3>
                          <p className="text-sm text-zinc-500 mt-1">{selectedTicket.description}</p>
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase",
                          selectedTicket.priority === 'high' ? "bg-rose-100 text-rose-700" :
                          selectedTicket.priority === 'medium' ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          Prioridade {selectedTicket.priority}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/50">
                      {ticketMessages.map(msg => (
                        <div key={msg.id} className={cn(
                          "flex flex-col max-w-[80%]",
                          msg.is_admin ? "self-end items-end" : "self-start"
                        )}>
                          <div className={cn(
                            "p-4 rounded-2xl text-sm",
                            msg.is_admin 
                              ? "bg-black text-white rounded-tr-none" 
                              : "bg-orange-500 text-white rounded-tl-none"
                          )}>
                            {msg.message}
                          </div>
                          <span className="text-[10px] text-zinc-400 mt-1 px-1">
                            {msg.is_admin ? 'Suporte Fatu-R' : 'Você'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-100 flex gap-3">
                      <input 
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 px-4 py-3 bg-zinc-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all"
                      />
                      <button className="bg-black text-white p-3 rounded-xl hover:bg-zinc-800 transition-all">
                        <ArrowRightLeft size={20} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-12 text-center">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                      <LifeBuoy size={32} />
                    </div>
                    <h3 className="font-bold text-zinc-900">Central de Suporte</h3>
                    <p className="text-sm mt-2 max-w-xs">Selecione um ticket ao lado ou crie um novo para falar com nossa equipa.</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modal Novo Ticket */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Novo Pedido de Suporte</h3>
              <button onClick={() => setIsTicketModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Assunto</label>
                <input 
                  type="text"
                  required
                  value={ticketForm.subject}
                  onChange={e => setTicketForm({...ticketForm, subject: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                  placeholder="Ex: Dúvida sobre faturação"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Prioridade</label>
                <select 
                  value={ticketForm.priority}
                  onChange={e => setTicketForm({...ticketForm, priority: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Descrição</label>
                <textarea 
                  required
                  rows={4}
                  value={ticketForm.description}
                  onChange={e => setTicketForm({...ticketForm, description: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all resize-none"
                  placeholder="Descreva detalhadamente o seu problema ou dúvida..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
                >
                  Abrir Ticket
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Cash Register Opening Modal */}
      <Modal 
        isOpen={isOpeningModalOpen} 
        onClose={() => setIsOpeningModalOpen(false)} 
        title={`Abrir Caixa - ${establishment.name}`}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cashRegisters.map(register => {
              const isOpenedByMe = register.session_status === 'open' && register.seller_id === user.id;
              const isOpenedByOthers = register.session_status === 'open' && register.seller_id !== user.id;

              return (
                <div key={`reg-open-modal-${register.id}`} className="p-6 border border-zinc-100 rounded-2xl space-y-4 hover:border-orange-200 transition-all group">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      register.session_status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                    )}>
                      <Monitor size={24} />
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      register.session_status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                    )}>
                      {register.session_status === 'open' ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-lg">{register.name}</h4>
                    <p className="text-xs text-zinc-400 font-mono">{register.code}</p>
                  </div>

                  {register.session_status === 'open' ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
                      <CheckCircle size={20} className="text-emerald-600" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Caixa em Operação</p>
                        <p className="text-[10px] text-emerald-700">{isOpenedByMe ? 'Aberto por você' : 'Aberto por outro funcionário'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">Kz</span>
                        <input
                          type="number"
                          placeholder="Valor de Abertura"
                          value={openingAmounts[register.id] || ''}
                          onChange={e => setOpeningAmounts(prev => ({ ...prev, [register.id]: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                        />
                      </div>
                      <button
                        onClick={() => handleOpenSession(register.id, openingAmounts[register.id] || register.default_initial_balance.toString())}
                        className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-100"
                      >
                        Abrir Caixa
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {cashRegisters.length === 0 && (
              <div className="col-span-2 py-12 text-center text-zinc-400">
                Nenhum caixa registado para este estabelecimento.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Cash Register Closing Modal */}
      <Modal 
        isOpen={isClosingModalOpen} 
        onClose={() => setIsClosingModalOpen(false)} 
        title="Fechar Caixa"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Informe o valor físico total presente no caixa para encerrar a sessão.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">Kz</span>
            <input
              type="text"
              placeholder="0,00"
              value={closingAmount}
              onChange={e => setClosingAmount(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsClosingModalOpen(false)}
              className="flex-1 py-3 border border-zinc-200 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={confirmCloseSession}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-100"
            >
              Confirmar Fechamento
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isProductModalOpen} onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }} title={editingProduct ? "Editar Produto" : "Novo Produto"} maxWidth="max-w-2xl">
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome do Produto</label>
              <input 
                type="text" required
                value={productForm.name}
                onChange={e => setProductForm({...productForm, name: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Categoria</label>
              <input 
                type="text" required
                list="categories-list"
                value={productForm.category}
                onChange={e => setProductForm({...productForm, category: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
                placeholder="Ex: Bebidas..."
              />
              <datalist id="categories-list">
                {Array.from(new Set(products.map(p => p.category))).map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Código de Barra</label>
              <input 
                type="text"
                readOnly
                value={editingProduct ? editingProduct.barcode : "Gerado automaticamente"}
                className="w-full px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-xl outline-none text-zinc-500 font-mono" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Armazém</label>
              <select 
                required
                value={productForm.warehouse_id}
                onChange={e => setProductForm({...productForm, warehouse_id: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              >
                <option value="">Selecione um armazém</option>
                {warehouses.filter(w => w.establishment_id === Number(establishmentId)).map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.type})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Custo (Kz)</label>
              <input 
                type="number" required
                value={isNaN(Number(productForm.cost)) ? '' : productForm.cost}
                onChange={e => setProductForm({...productForm, cost: e.target.value})}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Preço (Kz)</label>
              <input 
                type="number" required
                value={isNaN(Number(productForm.price)) ? '' : productForm.price}
                onChange={e => setProductForm({...productForm, price: e.target.value})}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-emerald-600 font-bold" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Stock</label>
              <input 
                type="number" required
                value={isNaN(Number(productForm.stock)) ? '' : productForm.stock}
                onChange={e => setProductForm({...productForm, stock: e.target.value})}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Mín. Stock</label>
              <input 
                type="number" required
                value={isNaN(Number(productForm.min_stock)) ? '' : productForm.min_stock}
                onChange={e => setProductForm({...productForm, min_stock: e.target.value})}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">IVA</label>
              <select 
                value={productForm.tax_id}
                onChange={e => setProductForm({...productForm, tax_id: e.target.value})}
                disabled={user?.fiscal_regime === 'exclusao'}
                className={cn(
                  "w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none",
                  user?.fiscal_regime === 'exclusao' && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="">Padrão</option>
                {taxes.filter(t => t.status === 'active').map(tax => (
                  <option key={tax.id} value={tax.id}>{tax.percentage}%</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Imagem do Produto</label>
            <div className="flex items-center gap-4">
              {productForm.image_url && (
                <div className="w-16 h-16 bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200 shrink-0">
                  <img src={productForm.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <div className="flex-1 flex gap-2">
                <input 
                  type="text"
                  value={productForm.image_url}
                  onChange={e => setProductForm({...productForm, image_url: e.target.value})}
                  className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-xs" 
                  placeholder="URL da imagem..."
                />
                <input 
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const base64 = await fileToBase64(file);
                        setProductForm({...productForm, image_url: base64});
                      } catch (err) {
                        console.error("Error converting file to base64", err);
                      }
                    }
                  }}
                  className="hidden"
                  id="product-image-upload"
                />
                <label 
                  htmlFor="product-image-upload"
                  className="px-4 py-2 bg-white border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 transition-all text-[10px] font-bold text-zinc-600 flex items-center gap-1"
                >
                  <Upload size={14} /> Local
                </label>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all">
            {editingProduct ? "Guardar Alterações" : "Adicionar Produto"}
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isCashRegisterModalOpen} 
        onClose={() => { setIsCashRegisterModalOpen(false); setEditingCashRegister(null); }} 
        title={editingCashRegister ? "Editar Caixa" : "Novo Caixa"}
      >
        <form onSubmit={handleSaveCashRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome do Caixa</label>
            <input 
              type="text" required
              value={cashRegisterForm.name}
              onChange={e => setCashRegisterForm({...cashRegisterForm, name: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all" 
              placeholder="Ex: Caixa Principal, Caixa 02..."
            />
          </div>
          {editingCashRegister && (
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Código do Caixa</label>
              <input 
                type="text" readOnly
                value={editingCashRegister.code}
                className="w-full px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-xl outline-none text-zinc-500 font-mono" 
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Saldo Inicial Padrão (Kz)</label>
              <input 
                type="number" required
                value={isNaN(Number(cashRegisterForm.default_initial_balance)) ? '' : cashRegisterForm.default_initial_balance}
                onChange={e => setCashRegisterForm({...cashRegisterForm, default_initial_balance: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Limite Máximo (Kz)</label>
              <input 
                type="number" required
                value={isNaN(Number(cashRegisterForm.max_limit)) ? '' : cashRegisterForm.max_limit}
                onChange={e => setCashRegisterForm({...cashRegisterForm, max_limit: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all" 
              />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => setIsCashRegisterModalOpen(false)}
              className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
            >
              {editingCashRegister ? "Guardar Alterações" : "Criar Caixa"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isStaffModalOpen} onClose={() => { setIsStaffModalOpen(false); setEditingStaff(null); }} title={editingStaff ? "Editar Colaborador" : "Novo Colaborador"}>
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome Completo</label>
            <input 
              type="text" required
              value={staffForm.name}
              onChange={e => setStaffForm({...staffForm, name: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Email (Opcional)</label>
            <input 
              type="email"
              value={staffForm.email}
              onChange={e => setStaffForm({...staffForm, email: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome de Utilizador (Para Login)</label>
            <input 
              type="text" required
              value={staffForm.username}
              onChange={e => setStaffForm({...staffForm, username: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Palavra-passe {editingStaff && "(Deixe em branco para manter)"}</label>
            <input 
              type="password" required={!editingStaff}
              value={staffForm.password}
              onChange={e => setStaffForm({...staffForm, password: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Cargo</label>
              <select 
                value={staffForm.role}
                onChange={e => setStaffForm({...staffForm, role: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
              >
                <option value="seller">Vendedor</option>
                <option value="cashier">Caixa</option>
                <option value="manager">Gerente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Caixa Associado</label>
              <select 
                value={staffForm.cash_register_id}
                onChange={e => setStaffForm({...staffForm, cash_register_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
              >
                <option value="">Nenhum</option>
                {cashRegisters.map(register => (
                  <option key={`reg-opt-${register.id}`} value={register.id}>{register.name} ({register.code})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Salário (Kz)</label>
              <input 
                type="number" required
                value={isNaN(Number(staffForm.salary)) ? '' : staffForm.salary}
                onChange={e => setStaffForm({...staffForm, salary: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Turno/Info</label>
              <input 
                type="text" required
                value={staffForm.shift_info}
                onChange={e => setStaffForm({...staffForm, shift_info: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold">
            {editingStaff ? "Guardar Alterações" : "Contratar Colaborador"}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isPromoModalOpen} onClose={() => setIsPromoModalOpen(false)} title="Criar Promoção">
        <form onSubmit={handleAddPromo} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome da Promoção</label>
            <input 
              type="text" required
              placeholder="Ex: Black Friday, Saldo de Verão"
              value={promoForm.name}
              onChange={e => setPromoForm({...promoForm, name: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Data Início</label>
              <input 
                type="date" required
                value={promoForm.start_date}
                onChange={e => setPromoForm({...promoForm, start_date: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Data Término</label>
              <input 
                type="date" required
                value={promoForm.end_date}
                onChange={e => setPromoForm({...promoForm, end_date: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Desconto (%)</label>
            <input 
              type="number" required min="1" max="100"
              value={isNaN(Number(promoForm.discount_percent)) ? '' : promoForm.discount_percent}
              onChange={e => setPromoForm({...promoForm, discount_percent: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Selecionar Produtos</label>
            <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-xl p-2 space-y-1 bg-zinc-50">
              {products.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                  <input 
                    type="checkbox"
                    checked={promoForm.product_ids.includes(p.id)}
                    onChange={e => {
                      const ids = e.target.checked 
                        ? [...promoForm.product_ids, p.id]
                        : promoForm.product_ids.filter(id => id !== p.id);
                      setPromoForm({...promoForm, product_ids: ids});
                    }}
                    className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black"
                  />
                  <div className="flex items-center gap-2">
                    <img src={p.image_url || undefined} alt="" className="w-6 h-6 rounded object-cover" referrerPolicy="no-referrer" />
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-[10px] text-zinc-400">Kz {p.price.toLocaleString()}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold">Lançar Promoção</button>
        </form>
      </Modal>

      <Modal isOpen={isStockModalOpen} onClose={() => setIsStockModalOpen(false)} title="Movimentar Stock">
        <form onSubmit={handleStockMovement} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Tipo de Movimento</label>
              <select 
                required
                value={stockForm.type}
                onChange={e => setStockForm({...stockForm, type: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="in">Entrada de Stock</option>
                <option value="out">Saída de Stock</option>
                <option value="transfer">Transferência entre Estabelecimentos</option>
                <option value="adjustment">Ajuste Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Produto</label>
              <select 
                required
                value={stockForm.product_id}
                onChange={e => setStockForm({...stockForm, product_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="">Selecionar Produto</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                ))}
              </select>
            </div>
          </div>

          {stockForm.type === 'in' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Fornecedor (Opcional)</label>
              <select 
                value={stockForm.supplier_id}
                onChange={e => setStockForm({...stockForm, supplier_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="">Selecionar Fornecedor</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.company_name ? `(${s.company_name})` : ''}</option>
                ))}
              </select>
            </motion.div>
          )}

          {stockForm.type === 'transfer' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Estabelecimento de Destino</label>
              <select 
                required
                value={stockForm.to_establishment_id}
                onChange={e => setStockForm({...stockForm, to_establishment_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="">Selecionar Estabelecimento</option>
                {establishments.filter(s => s.id !== Number(establishmentId)).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </motion.div>
          )}

          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Modo de Lançamento</h4>
              <div className="flex bg-white p-1 rounded-lg border border-zinc-200">
                <button 
                  type="button"
                  onClick={() => setStockForm({...stockForm, isBulk: false})}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all",
                    !stockForm.isBulk ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-50"
                  )}
                >
                  Individual
                </button>
                <button 
                  type="button"
                  onClick={() => setStockForm({...stockForm, isBulk: true})}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all",
                    stockForm.isBulk ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-50"
                  )}
                >
                  Em Massa
                </button>
              </div>
            </div>

            {!stockForm.isBulk ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Quantidade Individual</label>
                  <input 
                    type="number" required min="1"
                    placeholder="Ex: 50"
                    value={isNaN(Number(stockForm.quantity)) ? '' : stockForm.quantity}
                    onChange={e => setStockForm({...stockForm, quantity: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all" 
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Tipo de Embalagem</label>
                    <select 
                      value={stockForm.bulkType}
                      onChange={e => {
                        const type = e.target.value;
                        let units = '24';
                        if (type === 'caixa') units = '12';
                        if (type === 'embalagem') units = '6';
                        setStockForm({...stockForm, bulkType: type as any, unitsPerBulk: units});
                      }}
                      className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                    >
                      <option value="grade">Grade (Crate)</option>
                      <option value="caixa">Caixa (Box)</option>
                      <option value="embalagem">Embalagem (Pack)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Qtd. de {stockForm.bulkType}s</label>
                    <input 
                      type="number" required min="1"
                      placeholder="Ex: 5"
                      value={isNaN(Number(stockForm.bulkQuantity)) ? '' : stockForm.bulkQuantity}
                      onChange={e => setStockForm({...stockForm, bulkQuantity: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Unidades por {stockForm.bulkType}</label>
                  <div className="relative">
                    <input 
                      type="number" required min="1"
                      value={isNaN(Number(stockForm.unitsPerBulk)) ? '' : stockForm.unitsPerBulk}
                      onChange={e => setStockForm({...stockForm, unitsPerBulk: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400">
                      UNIDADES
                    </div>
                  </div>
                </div>
                {stockForm.bulkQuantity && stockForm.unitsPerBulk && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                      <Layers size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Total a Lançar</p>
                      <p className="text-sm font-black text-amber-900">
                        {Number(stockForm.bulkQuantity) * Number(stockForm.unitsPerBulk)} Unidades Individuais
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Motivo / Observação</label>
            <input 
              type="text" required
              placeholder="Ex: Reposição de stock, Compra a fornecedor..."
              value={stockForm.reason}
              onChange={e => setStockForm({...stockForm, reason: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all" 
            />
          </div>

          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-[0.98]">
            <ArrowRightLeft size={20} /> Processar Movimento
          </button>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
};


const CreditInvoicePreview = ({ invoice, establishment }: { invoice: any, establishment: any }) => {
  if (invoice.doc_type === 'PP') {
    return <ProformaInvoice proforma={invoice} establishment={establishment} />;
  }
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [qrCode, setQrCode] = useState<string>('');

  useEffect(() => {
    if (invoice.billing_mode === 'eletronica' || invoice.doc_type === 'FR') {
      const qrData = `https://agt.minfin.gov.ao/m?nif=${establishment.nif}&num=${invoice.invoice_number}&dt=${new Date(invoice.invoice_date || invoice.timestamp || invoice.created_at).toISOString().split('T')[0]}&val=${invoice.total_amount.toFixed(2)}`;
      QRCode.toDataURL(qrData, { margin: 1, width: 120 }, (err, url) => {
        if (!err) setQrCode(url);
      });
    }
  }, [invoice, establishment]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!invoiceRef.current) return;
    
    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (clonedDoc) => {
        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach(style => {
          if (style.textContent) {
            style.textContent = style.textContent.replace(/oklab\([^)]+\)/g, '#000');
            style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#000');
            style.textContent = style.textContent.replace(/color-mix\([^)]+\)/g, '#000');
            style.textContent = style.textContent.replace(/light-dark\([^)]+\)/g, '#000');
          }
        });
        const elementsWithStyle = clonedDoc.querySelectorAll('[style]');
        elementsWithStyle.forEach(el => {
          const styleAttr = el.getAttribute('style');
          if (styleAttr) {
            let newStyle = styleAttr.replace(/oklab\([^)]+\)/g, '#000');
            newStyle = newStyle.replace(/oklch\([^)]+\)/g, '#000');
            newStyle = newStyle.replace(/color-mix\([^)]+\)/g, '#000');
            newStyle = newStyle.replace(/light-dark\([^)]+\)/g, '#000');
            el.setAttribute('style', newStyle);
          }
        });
      }
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgProps = new jsPDF().getImageProperties(imgData);
    const pdfWidth = 210; // A4
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${invoice.doc_type === 'NC' ? 'NOTA_CREDITO' : invoice.doc_type === 'ND' ? 'NOTA_DEBITO' : invoice.doc_type === 'FR' ? 'FATURA_RECIBO' : invoice.doc_type === 'RC' ? 'RECIBO' : 'FATURA_CREDITO'}_${invoice.invoice_number.replace('/', '_')}.pdf`);
  };

  if (!invoice || !establishment) return null;

  const subtotal = (invoice.items || []).reduce((acc: number, item: any) => acc + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  const taxTotal = (invoice.items || []).reduce((acc: number, item: any) => {
    const taxRate = Number(item.tax ?? item.tax_rate ?? 0);
    return acc + (Number(item.price || 0) * Number(item.quantity || 0) * (taxRate / 100));
  }, 0);
  const total = subtotal + taxTotal + (Number(invoice.adjustment_amount || 0));
  const currencyCode = invoice.currency || 'Kz';

  if (invoice.doc_type === 'PP') {
    return <ProformaInvoice proforma={invoice} establishment={establishment} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3 no-print">
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all"
        >
          <Printer size={18} /> Imprimir
        </button>
        <button 
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
        >
          <Download size={18} /> Descarregar PDF
        </button>
      </div>

      <div ref={invoiceRef} className="bg-white p-12 w-[800px] min-h-[1123px] mx-auto shadow-sm border border-zinc-100 rounded-lg font-sans text-zinc-900 flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div className="flex items-center gap-8">
            {establishment.logo_url && (
              <div className="w-24 h-24 bg-zinc-50 rounded-2xl flex items-center justify-center p-4 border border-zinc-100">
                <img src={establishment.logo_url} alt="" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            )}
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-zinc-900 leading-none">{establishment.name}</h2>
              <div className="mt-4 space-y-1 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <p>{establishment.address}</p>
                <p>NIF: {establishment.nif} | TEL: {establishment.phone}</p>
                {establishment.email && <p>{establishment.email}</p>}
              </div>
            </div>
          </div>
          <div className="text-right">
              <h1 className="text-4xl font-black text-orange-500 uppercase mb-2">
                {invoice.doc_type === 'FR' ? 'FATURA RECIBO' : 
                 invoice.doc_type === 'FT' ? 'FATURA A CRÉDITO' : 
                 invoice.doc_type === 'PP' ? 'FATURA PROFORMA' :
                 invoice.doc_type === 'RC' ? 'RECIBO' :
                 invoice.doc_type === 'NC' ? 'NOTA DE CRÉDITO' :
                 invoice.doc_type === 'ND' ? 'NOTA DE DÉBITO' :
                 'DOCUMENTO'}
              </h1>
            <div className="space-y-1 text-xs font-bold text-zinc-500 uppercase tracking-widest">
              <p className="text-orange-600">Nº {invoice.invoice_number}</p>
              <p>DATA {new Date(invoice.invoice_date || invoice.timestamp || invoice.created_at).toLocaleDateString()}</p>
              {invoice.due_date && invoice.doc_type === 'FT' && (
                <p className="text-orange-600">Vencimento: {new Date(invoice.due_date).toLocaleDateString()}</p>
              )}
              {invoice.service_designation && (
                <p className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg inline-block mt-2 border border-orange-100 shadow-sm animate-pulse-slow">
                  {(invoice.service_designation || 'SERVIÇO NOVO').toUpperCase()}
                </p>
              )}
              <p>MOEDA {invoice.currency || 'Kz'}</p>
              <p>PAGAMENTO {
                invoice.payment_method === 'cash' ? 'NUMERÁRIO' :
                invoice.payment_method === 'multicaixa' ? 'MULTICAIXA' :
                invoice.payment_method === 'transfer' ? 'TRANSFERÊNCIA' :
                invoice.payment_method === 'split' ? 'MISTO' : (invoice.payment_method || 'N/A').toUpperCase()
              }</p>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-100">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Dados do Cliente</p>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-zinc-900 uppercase">{invoice.client_name}</h3>
              <div className="space-y-1 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <p>NIF: {invoice.client_nif}</p>
                <p>{invoice.address}</p>
                <p>{invoice.country}</p>
              </div>
            </div>
          </div>
          <div className="p-8 bg-orange-50 rounded-3xl border border-orange-100 flex flex-col justify-center">
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-2">Total do Documento</p>
            <p className="text-4xl font-black text-orange-600">Kz {total.toLocaleString()}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-grow">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b-2 border-orange-500">
                <th className="pb-4 font-black uppercase tracking-widest text-[10px]">Código</th>
                <th className="pb-4 font-black uppercase tracking-widest text-[10px]">Descrição</th>
                <th className="pb-4 text-center font-black uppercase tracking-widest text-[10px]">Qtd</th>
                <th className="pb-4 text-right font-black uppercase tracking-widest text-[10px]">Preço Unit.</th>
                <th className="pb-4 text-right font-black uppercase tracking-widest text-[10px]">IVA</th>
                <th className="pb-4 text-right font-black uppercase tracking-widest text-[10px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invoice.items.map((item: any, idx: number) => (
                <tr key={`inv-prev-it-${idx}`}>
                  <td className="py-4 font-mono text-xs">
                    <span className="text-[8px] font-black mr-1 text-zinc-400">[{item.type === 'service' ? 'S' : 'P'}]</span>
                    {item.code}
                  </td>
                  <td className="py-4">
                    <p className="font-bold">{(item.name || item.description || 'ITEM').toUpperCase()}</p>
                  </td>
                  <td className="py-4 text-center">{item.quantity}</td>
                  <td className="py-4 text-right">Kz {Number(item.price || 0).toLocaleString()}</td>
                  <td className="py-4 text-right">{item.tax ?? item.tax_rate ?? 0}%</td>
                  <td className="py-4 text-right font-bold">Kz {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-12 border-t-2 border-zinc-100 flex-grow-0">
          <div className="flex justify-between items-start">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Observações</p>
                <p className="text-xs text-zinc-500 max-w-md font-bold leading-relaxed">
                  {invoice.doc_type === 'RC' ? `ESTE RECIBO LIQUIDA A TOTALIDADE OU PARTE DA FATURA ${invoice.parent_invoice_number || invoice.parent_invoice_id}.` : 
                   invoice.doc_type === 'FT' ? "ESTE DOCUMENTO SERVE COMO FATURA A CRÉDITO. O PAGAMENTO DEVE SER EFETUADO CONFORME OS TERMOS ACORDADOS." :
                   invoice.doc_type === 'FR' ? "ESTA FATURA RECIBO SERVE COMO COMPROVATIVO DE VENDA A PRONTO PAGAMENTO." :
                   invoice.doc_type === 'PP' ? "ESTA FATURA PROFORMA DESTINA-SE EXCLUSIVAMENTE A FINS DE COTAÇÃO E NÃO TEM VALOR PARA PAGAMENTO." :
                   invoice.doc_type === 'NC' ? `ESTA NOTA DE CRÉDITO RETIFICA A FATURA ${invoice.parent_invoice_number || invoice.parent_invoice_id}. MOTIVO: ${invoice.reason?.toUpperCase() || 'NÃO ESPECIFICADO'}` :
                   invoice.doc_type === 'ND' ? `ESTA NOTA DE DÉBITO RETIFICA A FATURA ${invoice.parent_invoice_number || invoice.parent_invoice_id}. MOTIVO: ${invoice.reason?.toUpperCase() || 'NÃO ESPECIFICADO'}` :
                   invoice.reason ? invoice.reason.toUpperCase() : "DOCUMENTO PROCESSADO CONFORME AS NORMAS DA AGT."}
                </p>
              </div>
              {invoice.doc_type === 'FT' && invoice.due_date && (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Nota de Pagamento</p>
                  <p className="text-xs font-black text-orange-600">PAGÁVEL ATÉ {new Date(invoice.due_date).toLocaleDateString()}</p>
                </div>
              )}
              {invoice.doc_type === 'PP' && establishment.bank_accounts && (
                <div className="bg-zinc-50/50 p-6 rounded-3xl border border-zinc-100">
                  <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-4 italic">Coordenadas Bancárias para Pagamento</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {(() => {
                      try {
                        const accounts = typeof establishment.bank_accounts === 'string' ? JSON.parse(establishment.bank_accounts) : establishment.bank_accounts;
                        return Array.isArray(accounts) ? accounts.map((acc: any, idx: number) => (
                          <div key={`inv-bank-idx-${idx}`} className="text-[11px] border-l-4 border-orange-500 pl-4 py-1 bg-white rounded-r-xl shadow-sm">
                            <p className="font-black text-zinc-900 uppercase tracking-tight mb-1">{acc.bank_name}</p>
                            <div className="space-y-1 text-zinc-600">
                              <div className="flex justify-between items-center border-b border-zinc-50 pb-0.5">
                                <span className="font-bold text-[7px] uppercase tracking-widest text-zinc-400">IBAN</span>
                                <span className="font-mono text-zinc-900 font-bold">{acc.iban}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-[7px] uppercase tracking-widest text-zinc-400">Titular</span>
                                <span className="text-zinc-900 font-medium truncate ml-4">{acc.holder}</span>
                              </div>
                            </div>
                          </div>
                        )) : null;
                      } catch (e) { return null; }
                    })()}
                  </div>
                </div>
              )}
            </div>
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <span>Subtotal</span>
                <span>Kz {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <span>SUBTOTAL</span>
                <span>{currencyCode} {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <span>IVA ({(invoice.items?.[0]?.tax ?? invoice.items?.[0]?.tax_rate ?? (establishment?.fiscal_regime === 'exclusao' ? 0 : 14))}%)</span>
                <span>{currencyCode} {taxTotal.toLocaleString()}</span>
              </div>
              {invoice.adjustment_amount !== 0 && (
                <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  <span>Ajuste</span>
                  <span>{currencyCode} {invoice.adjustment_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-black text-zinc-900 uppercase tracking-tight pt-3 border-t border-zinc-100">
                <span>Total</span>
                <span>{currencyCode} {total.toLocaleString()}</span>
              </div>
              
              {qrCode && (invoice.billing_mode === 'eletronica' || invoice.doc_type === 'FR') && (
                <div className="pt-6 flex flex-col items-center gap-2">
                  <img src={qrCode} alt="QR Code AGT" className="w-24 h-24" />
                  <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest text-center">
                    Faturação Eletrónica - Código QR AGT
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProformaInvoice = ({ proforma, establishment }: { proforma: any, establishment: any }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!invoiceRef.current) return;
    
    const pages = invoiceRef.current.querySelectorAll('.proforma-page');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 800,
        onclone: (clonedDoc) => {
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(style => {
            if (style.textContent) {
              style.textContent = style.textContent.replace(/oklab\([^)]+\)/g, '#000');
              style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#000');
              style.textContent = style.textContent.replace(/color-mix\([^)]+\)/g, '#000');
              style.textContent = style.textContent.replace(/light-dark\([^)]+\)/g, '#000');
            }
          });
          const elementsWithStyle = clonedDoc.querySelectorAll('[style]');
          elementsWithStyle.forEach(el => {
            const styleAttr = el.getAttribute('style');
            if (styleAttr) {
              let newStyle = styleAttr.replace(/oklab\([^)]+\)/g, '#000');
              newStyle = newStyle.replace(/oklch\([^)]+\)/g, '#000');
              newStyle = newStyle.replace(/color-mix\([^)]+\)/g, '#000');
              newStyle = newStyle.replace(/light-dark\([^)]+\)/g, '#000');
              el.setAttribute('style', newStyle);
            }
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save(`PROFORMA_${proforma.id}.pdf`);
  };

  if (!proforma || !establishment) return null;

  const bankAccounts = typeof proforma.bank_accounts === 'string' 
    ? JSON.parse(proforma.bank_accounts) 
    : proforma.bank_accounts || (establishment.bank_accounts ? (typeof establishment.bank_accounts === 'string' ? JSON.parse(establishment.bank_accounts) : establishment.bank_accounts) : []);

  const items = typeof proforma.items === 'string'
    ? JSON.parse(proforma.items)
    : proforma.items || [];

  // Logic to split items into pages
  const FIRST_PAGE_MAX = 8;
  const OTHER_PAGE_MAX = 15;
  
  const itemPages: any[][] = [];
  let tempItems = [...items];
  
  if (tempItems.length === 0) {
    itemPages.push([]);
  } else {
    // Page 1
    itemPages.push(tempItems.splice(0, FIRST_PAGE_MAX));
    
    // Subsequent pages
    while (tempItems.length > 0) {
      itemPages.push(tempItems.splice(0, OTHER_PAGE_MAX));
    }
  }

  // Determine if footer needs its own page
  // Footer needs a lot of space (totals + bank accounts)
  const isOnlyOnePage = itemPages.length === 1;
  const lastPageItems = itemPages[itemPages.length - 1] || [];
  const showFooterOnNewPage = isOnlyOnePage 
    ? lastPageItems.length > 5 
    : lastPageItems.length > 10;
  const totalPages = showFooterOnNewPage ? itemPages.length + 1 : itemPages.length;

  const renderFooterContent = () => (
    <div className="mt-auto pt-8 border-t-2 border-zinc-100">
      <div className="mb-8">
        <div className="flex justify-end">
          <div className="w-full max-w-[320px] bg-zinc-50 p-6 rounded-2xl space-y-3 border border-zinc-100 shadow-sm">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500 font-medium">Subtotal</span>
              <span className="font-bold text-zinc-900">{proforma.currency || 'Kz'} {items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500 font-medium">IVA ({items[0]?.tax || 0}%)</span>
              <span className="font-bold text-zinc-900">{proforma.currency || 'Kz'} {items.reduce((acc: number, item: any) => acc + (item.price * item.quantity * ((item.tax || 0) / 100)), 0).toLocaleString()}</span>
            </div>
            <div className="pt-4 border-t border-zinc-200">
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Total Geral</span>
                <span className="text-2xl font-black text-orange-600">{proforma.currency || 'Kz'} {(items.reduce((acc: number, item: any) => acc + (item.price * item.quantity * (1 + (item.tax || 0) / 100)), 0)).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-zinc-50/50 p-6 rounded-2xl border border-zinc-100">
          <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">Coordenadas Bancárias para Pagamento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {bankAccounts.map((acc: any, idx: number) => (
              <div key={`prof-bank-idx-${idx}`} className="text-[11px] border-l-4 border-orange-500 pl-4 py-1 bg-white rounded-r-xl shadow-sm">
                <p className="font-black text-zinc-900 uppercase tracking-tight mb-1">{acc.bank_name}</p>
                <div className="space-y-1 text-zinc-600">
                  <div className="flex justify-between items-center border-b border-zinc-50 pb-0.5">
                    <span className="font-bold text-[7px] uppercase tracking-widest text-zinc-400">IBAN</span>
                    <span className="font-mono text-zinc-900 font-bold">{acc.iban}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[7px] uppercase tracking-widest text-zinc-400">Titular</span>
                    <span className="text-zinc-900 font-medium truncate ml-4">{acc.holder}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-zinc-100">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Informações Adicionais</h4>
        <p className="text-xs text-zinc-600 leading-relaxed max-w-2xl whitespace-pre-wrap italic">
          {proforma.observations || "Este documento não serve de fatura. Emitido para fins de cotação de preços. Válido por 15 dias após a data de emissão."}
        </p>
      </div>

      <div className="text-center text-[8px] text-zinc-400 uppercase tracking-[0.4em] mt-12 font-bold">
        Documento processado por computador · Obrigado pela sua preferência
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 no-print">
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-bold transition-all">
          <Printer size={16} /> Imprimir
        </button>
        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-zinc-800 rounded-lg text-sm font-bold transition-all">
          <Download size={16} /> PDF
        </button>
      </div>

      <div ref={invoiceRef} className="space-y-8 no-shadow">
        {itemPages.map((pageItems, pageIdx) => (
          <div key={pageIdx} className="proforma-page bg-white p-12 w-[800px] min-h-[1123px] mx-auto shadow-sm border border-zinc-100 rounded-lg font-sans text-zinc-900 flex flex-col relative overflow-hidden mb-8 last:mb-0">
            {/* Header - Only on first page */}
            {pageIdx === 0 && (
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-8">
                  {establishment.logo_url && (
                    <div className="w-24 h-24 bg-zinc-50 rounded-2xl flex items-center justify-center p-2 border border-zinc-100">
                      <img src={establishment.logo_url} alt="" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="space-y-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight text-orange-600 leading-none">{establishment.name}</h2>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="grid grid-cols-[80px_1fr] gap-4 items-start">
                        <span className="font-black text-zinc-400 uppercase text-[8px] tracking-[0.2em] pt-1 shrink-0">Endereço</span>
                        <span className="text-zinc-600 font-medium">{establishment.address}</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                        <span className="font-black text-zinc-400 uppercase text-[8px] tracking-[0.2em] shrink-0">NIF</span>
                        <span className="text-zinc-600 font-bold">{establishment.nif}</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                        <span className="font-black text-zinc-400 uppercase text-[8px] tracking-[0.2em] shrink-0">Telefone</span>
                        <span className="text-zinc-600 font-bold">{establishment.phone}</span>
                      </div>
                      {establishment.email && (
                        <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                          <span className="font-black text-zinc-400 uppercase text-[8px] tracking-[0.2em] shrink-0">Email</span>
                          <span className="text-orange-600 font-bold">{establishment.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="text-4xl font-black text-orange-500 uppercase mb-2">PROFORMA</h1>
                  <div className="space-y-1 text-sm text-zinc-600">
                    <p><span className="font-bold">Nº:</span> {proforma.invoice_number}</p>
                    <p><span className="font-bold">Data:</span> {new Date(proforma.invoice_date || proforma.timestamp || proforma.created_at).toLocaleDateString()}</p>
                    <p><span className="font-bold">Vencimento:</span> {new Date(new Date(proforma.due_date || proforma.timestamp || proforma.created_at).getTime()).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Client Info - Only on first page */}
            {pageIdx === 0 && (
              <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="bg-zinc-50 p-6 rounded-2xl">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Dados do Cliente</h4>
                  <div className="space-y-1">
                    <p className="font-bold text-lg">{(proforma.client_name || 'Consumidor Final').toUpperCase()}</p>
                    <p className="text-sm text-zinc-600">{proforma.client_address || proforma.address}</p>
                    <p className="text-sm font-bold mt-2">NIF: {proforma.client_nif}</p>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Condições de Pagamento</h4>
                  <p className="text-sm text-zinc-600">Pronto Pagamento / Transferência Bancária</p>
                  <p className="text-sm text-zinc-600 mt-2">Válido por 15 dias a contar da data de emissão.</p>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="flex-grow">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b-2 border-orange-500">
                    <th className="pb-4 font-black uppercase tracking-widest text-[10px]">Descrição</th>
                    <th className="pb-4 text-center font-black uppercase tracking-widest text-[10px]">Qtd</th>
                    <th className="pb-4 text-right font-black uppercase tracking-widest text-[10px]">Preço Unit.</th>
                    <th className="pb-4 text-right font-black uppercase tracking-widest text-[10px]">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pageItems.map((item: any, idx: number) => (
                    <tr key={`prof-row-idx-${idx}`}>
                      <td className="py-4">
                        <p className="font-bold">{(item.name || item.description || 'ITEM').toUpperCase()}</p>
                      </td>
                      <td className="py-4 text-center">{item.quantity}</td>
                      <td className="py-4 text-right">{proforma.currency || 'Kz'} {item.price.toLocaleString()}</td>
                      <td className="py-4 text-right font-bold">{proforma.currency || 'Kz'} {(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer - Only on last page (if it fits) */}
            {pageIdx === itemPages.length - 1 && !showFooterOnNewPage && renderFooterContent()}

            {/* Page Number */}
            <div className="absolute bottom-6 right-12 text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
              Página {pageIdx + 1} de {showFooterOnNewPage ? itemPages.length + 1 : itemPages.length}
            </div>
          </div>
        ))}

        {/* Dedicated Footer Page if needed */}
        {showFooterOnNewPage && (
          <div className="proforma-page bg-white p-12 w-[800px] min-h-[1123px] mx-auto shadow-sm border border-zinc-100 rounded-lg font-sans text-zinc-900 flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-12 opacity-50">
              <div className="flex items-center gap-8">
                {establishment.logo_url && (
                  <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center p-2 border border-zinc-100">
                    <img src={establishment.logo_url} alt="" className="max-w-full max-h-full object-contain opacity-50" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-zinc-400 leading-none">{establishment.name}</h2>
                  <p className="text-[10px] font-bold text-zinc-300 mt-2 uppercase tracking-widest">Página de Continuação / Coordenadas Bancárias</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-black text-zinc-200 uppercase mb-1">PROFORMA</h1>
                <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Nº {proforma.id.toString().padStart(6, '0')}</p>
              </div>
            </div>

            <div className="flex-grow flex flex-col">
              <div className="text-center py-8 border-2 border-dashed border-zinc-100 rounded-3xl mb-8">
                <p className="text-zinc-400 font-bold uppercase tracking-[0.3em] text-[9px]">Continuação da Fatura Proforma</p>
              </div>
              {renderFooterContent()}
            </div>

            {/* Page Number */}
            <div className="absolute bottom-6 right-12 text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
              Página {itemPages.length + 1} de {itemPages.length + 1}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Seller Module ---

const Invoice = ({ sale, establishment, user }: { sale: any, establishment: any, user: User }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [qrCode, setQrCode] = useState<string>('');

  useEffect(() => {
    if (sale.billing_mode === 'eletronica') {
      const qrData = `https://agt.minfin.gov.ao/m?nif=${establishment.nif}&num=${sale.invoice_number}&dt=${new Date(sale.timestamp).toISOString().split('T')[0]}&val=${sale.total_amount.toFixed(2)}`;
      QRCode.toDataURL(qrData, { margin: 1, width: 100 }, (err, url) => {
        if (!err) setQrCode(url);
      });
    }
  }, [sale, establishment]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!invoiceRef.current) return;
    
    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (clonedDoc) => {
        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach(style => {
          if (style.textContent) {
            style.textContent = style.textContent.replace(/oklab\([^)]+\)/g, '#000');
            style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#000');
            style.textContent = style.textContent.replace(/color-mix\([^)]+\)/g, '#000');
            style.textContent = style.textContent.replace(/light-dark\([^)]+\)/g, '#000');
          }
        });
        const elementsWithStyle = clonedDoc.querySelectorAll('[style]');
        elementsWithStyle.forEach(el => {
          const styleAttr = el.getAttribute('style');
          if (styleAttr) {
            let newStyle = styleAttr.replace(/oklab\([^)]+\)/g, '#000');
            newStyle = newStyle.replace(/oklch\([^)]+\)/g, '#000');
            newStyle = newStyle.replace(/color-mix\([^)]+\)/g, '#000');
            newStyle = newStyle.replace(/light-dark\([^)]+\)/g, '#000');
            el.setAttribute('style', newStyle);
          }
        });
      }
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgProps = new jsPDF().getImageProperties(imgData);
    const pdfWidth = 80; // Typical thermal printer width
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${sale.doc_type || 'FATURA'}_${sale.invoice_number.replace('/', '_')}.pdf`);
    
    // Note: Direct saving to C:/ is not possible in browser, 
    // but this triggers the system download dialog.
  };

  if (!sale || !establishment) return null;

  return (
    <div className="space-y-4">
      <div ref={invoiceRef} className="bg-white p-4 max-w-[280px] mx-auto shadow-sm border border-zinc-200 rounded-lg invoice-print font-mono text-black">
          <div className="text-center mb-2 border-b-2 border-dashed border-zinc-900 pb-2">
          {establishment.logo_url && (
            <img src={establishment.logo_url || undefined} alt="" className="w-10 h-10 mx-auto mb-1 object-contain grayscale" referrerPolicy="no-referrer" />
          )}
          <h2 className="text-base font-black uppercase tracking-tight text-black">{establishment.name}</h2>
          <h1 className="text-[10px] font-black text-black uppercase tracking-[0.2em] mt-0.5">
            {sale.doc_type === 'FR' ? 'Fatura Recibo' : 
             sale.doc_type === 'FT' ? 'Fatura Crédito' : 
             sale.doc_type === 'RC' ? 'Recibo' :
             sale.doc_type === 'NC' ? 'Nota de Crédito' :
             sale.doc_type === 'ND' ? 'Nota de Débito' :
             'Fatura Recibo'}
          </h1>
          <p className="text-[8px] leading-tight text-black mb-0.5 mt-0.5">{establishment.address}</p>
          <div className="text-[7px] font-bold flex flex-wrap justify-center gap-x-2">
            <span className="text-black">NIF: {establishment.nif}</span>
            <span>TEL: {establishment.phone}</span>
            {establishment.establishment_code && <span>CÓD. ESTAB: {establishment.establishment_code}</span>}
          </div>
        </div>

        <div className="space-y-0.5 mb-2 text-[8px] text-black">
          <div className="flex justify-between">
            <span>Nº DOCUMENTO:</span>
            <span className="font-bold text-black">{sale.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span>DATA/HORA:</span>
            <span>{new Date(sale.timestamp).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>OPERADOR:</span>
            <span>{(user?.name || 'ADMIN').toUpperCase()}</span>
          </div>
          <div className="mt-1 pt-1 border-t border-dashed border-zinc-400">
            <div className="flex justify-between">
              <span>CLIENTE:</span>
              <span className="font-bold truncate max-w-[140px] text-black">{(sale.client_name || 'CONSUMIDOR FINAL').toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>NIF CLIENTE:</span>
              <span>{sale.client_nif}</span>
            </div>
            {sale.parent_invoice_id && (
              <div className="mt-1 pt-1 border-t border-dashed border-zinc-400 flex justify-between">
                <span>DOC. REF:</span>
                <span className="font-bold text-black">{sale.parent_invoice_id}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-y-2 border-dashed border-zinc-400 py-1 mb-2">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="text-left border-b border-zinc-200">
                <th className="pb-0.5">ARTIGO</th>
                <th className="pb-0.5 text-center">QTD</th>
                <th className="pb-0.5 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sale.items.map((item: any, idx: number) => (
                <tr key={`thermal-item-${item.id || item.product_id}-${idx}`}>
                  <td className="py-1 leading-tight">
                    <p className="font-black truncate max-w-[160px]">{(item.name || item.description || 'ITEM').toUpperCase()}</p>
                    <p className="text-[7px] text-black italic">{item.price.toLocaleString()} x {item.quantity}</p>
                  </td>
                  <td className="py-1 text-center align-top">{item.quantity}</td>
                  <td className="py-1 text-right align-top font-black">{(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-0.5 text-[9px] pt-0.5 text-black">
          <div className="flex justify-between">
            <span>SUBTOTAL</span>
            <span>{sale.currency_code || 'Kz'} {(sale.total_amount - sale.tax_amount + (sale.discount_amount || 0)).toLocaleString()}</span>
          </div>
          {sale.discount_amount > 0 && (
            <div className="flex justify-between font-bold">
              <span>DESCONTO</span>
              <span>- {sale.currency_code || 'Kz'} {sale.discount_amount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>IVA ({(sale.items?.[0]?.tax_percentage ?? sale.items?.[0]?.tax ?? sale.items?.[0]?.tax_rate ?? (user?.fiscal_regime === 'exclusao' ? 0 : 14))}%)</span>
            <span>{sale.currency_code || 'Kz'} {(Number(sale.tax_amount) || 0).toLocaleString()}</span>
          </div>
          {user.fiscal_regime === 'exclusao' && (
            <p className="text-[7px] text-black italic mt-0.5">Isento nos termos do regime de exclusão</p>
          )}
          <div className="flex justify-between text-sm font-black pt-1 border-t-2 border-dashed border-black mt-1">
            <span>TOTAL ({sale.currency_code || 'Kz'})</span>
            <span>{sale.currency_code || 'Kz'} {sale.total_amount.toLocaleString()}</span>
          </div>

          {sale.currency_code && sale.currency_code !== 'Kz' && (
            <div className="flex justify-between text-[10px] font-black text-black mt-1 py-1 border-y border-dashed border-black/10">
              <span>EQUIV. BASE (Kz)</span>
              <span>Kz {(sale.total_amount * (sale.exchange_rate || 1)).toLocaleString()}</span>
            </div>
          )}
          
          {qrCode && sale.billing_mode === 'eletronica' && (
            <div className="mt-4 flex flex-col items-center gap-1">
              <img src={qrCode} alt="QR Code AGT" className="w-20 h-20 grayscale" />
              <p className="text-[6px] text-black font-black uppercase">Código QR AGT - Faturação Eletrónica</p>
            </div>
          )}
        </div>


        <div className="mt-4 text-center space-y-2">
          <div className="py-1 border-y border-zinc-100">
            <p className="text-[8px] font-bold uppercase tracking-widest">Obrigado pela preferência!</p>
          </div>
          <div className="space-y-0.5">
            {sale.billing_mode === 'eletronica' ? (
              <>
                <p className="text-[6px] text-zinc-400 uppercase">Processado por Fatu-R (Experimental AGT)</p>
                <div className="flex justify-center">
                  <p className={cn(
                    "text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-full inline-block",
                    (sale.agt_status === 'sent' || sale.agt_status === 'accepted') ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    AGT: {(sale.agt_status === 'sent' || sale.agt_status === 'accepted') ? 'Submetido' : 'Pendente'}
                  </p>
                </div>
              </>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="text-[7px] text-zinc-600 font-bold uppercase">
                  Processado por Fatu-R programa válido nº 321/AGT/2026
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 no-print max-w-md mx-auto">
        <button 
          onClick={handlePrint}
          className="flex-1 bg-zinc-100 text-zinc-900 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all"
        >
          <Printer size={16} /> Imprimir
        </button>
        <button 
          onClick={handleDownload}
          className="flex-1 bg-black text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all"
        >
          <FileText size={16} /> Descarregar PDF
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .invoice-print, .invoice-print * { visibility: visible; }
          .invoice-print { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            box-shadow: none; 
            border: none;
            padding: 0;
          }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
};

const FeeSelectionContent = ({ service, onConfirm }: { service: Service | null, onConfirm: (fees: ServiceFee[]) => void }) => {
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});

  if (!service) return null;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
        <h4 className="text-sm font-black text-orange-600 uppercase tracking-tight mb-1">{service.name}</h4>
        <p className="text-xs text-zinc-500">{service.description}</p>
        <p className="text-lg font-black text-zinc-900 mt-2">Preço Base: Kz {service.price.toLocaleString()}</p>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Selecione as taxas aplicáveis:</p>
        {service.fees?.map(fee => (
          <button
            key={fee.id}
            onClick={() => setSelectedIds(prev => ({ ...prev, [fee.id!]: !prev[fee.id!] }))}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
              selectedIds[fee.id!] 
                ? "border-orange-500 bg-orange-50 shadow-sm" 
                : "border-zinc-100 bg-white hover:border-zinc-200"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                selectedIds[fee.id!] ? "bg-orange-500 border-orange-500 text-white" : "border-zinc-200 bg-white"
              )}>
                {selectedIds[fee.id!] && <Check size={14} strokeWidth={4} />}
              </div>
              <span className="font-bold text-zinc-800 text-sm">{fee.name}</span>
            </div>
            <span className="font-black text-orange-600 text-sm">+Kz {fee.amount.toLocaleString()}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          const fees = service.fees?.filter(f => selectedIds[f.id!]) || [];
          onConfirm(fees);
        }}
        className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all active:scale-95 shadow-xl shadow-zinc-200"
      >
        Confirmar e Adicionar
      </button>
    </div>
  );
};

const SellerPOS = ({ user, onUpdate }: { user: User, onUpdate: (u: User) => void }) => {
  if (!hasPermission(user, 'pos_access')) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4 p-8 text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-4">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black text-zinc-900">Acesso Negado</h2>
        <p className="max-w-md">Você não tem permissão para aceder ao Ponto de Venda (PDV). Por favor, contacte o administrador para solicitar acesso.</p>
      </div>
    );
  }

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cart, setCart] = useState<{ item: Product | Service, type: 'product' | 'service', quantity: number, id: string, selectedFees?: ServiceFee[] }[]>([]);
  const [feeSelection, setFeeSelection] = useState<{ isOpen: boolean, service: Service | null, resolve: ((fees: ServiceFee[]) => void) | null }>({
    isOpen: false,
    service: null,
    resolve: null
  });
  const [category, setCategory] = useState('Geral');
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [client, setClient] = useState({ name: 'Consumidor Final', nif: '999999999' });
  const [clients, setClients] = useState<any[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [lastSale, setLastSale] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isFormalInvoiceModalOpen, setIsFormalInvoiceModalOpen] = useState(false);
  const [formalInvoiceAmount, setFormalInvoiceAmount] = useState(0);
  const [isFormalInvoiceGeneratedModalOpen, setIsFormalInvoiceGeneratedModalOpen] = useState(false);
  const [lastFormalInvoice, setLastFormalInvoice] = useState<any>(null);
  const [defaultTax, setDefaultTax] = useState<any>(null);
  const [formalInvoiceForm, setFormalInvoiceForm] = useState({
    client_nif: '',
    client_name: '',
    address: '',
    country: 'Angola',
    doc_type: 'FR',
    series: new Date().getFullYear().toString(),
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    currency: 'AOA',
    payment_method: 'cash',
    items: [] as any[]
  });
  const [establishmentInfo, setEstablishmentInfo] = useState<any>(null);
  
  // Payment states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProformaModalOpen, setIsProformaModalOpen] = useState(false);
  const [proformaForm, setProformaForm] = useState({ 
    client_name: '', 
    client_nif: '', 
    client_address: '' 
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'split'>('cash');
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', card: '' });
  const [cashReceived, setCashReceived] = useState('');
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [openingAmounts, setOpeningAmounts] = useState<Record<number, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSeries, setActiveSeries] = useState<any>(null);
  const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([]);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('Kz');
  const [currentExchangeRate, setCurrentExchangeRate] = useState(1.0);
  // UI State
  const [showCartMobile, setShowCartMobile] = useState(false);

  const checkActiveSession = async () => {
    if (!user.cash_register_id) {
      setHasActiveSession(false);
      return false;
    }

    const establishmentId = user.establishment_id || 1;
    let url = `/api/seller/active-session/${establishmentId}?cash_register_id=${user.cash_register_id}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        setHasActiveSession(false);
        return false;
      }
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setHasActiveSession(!!data);
        return !!data;
      } else {
        setHasActiveSession(false);
        return false;
      }
    } catch (error) {
      // Silently handle session check errors to avoid console noise if server is briefly unavailable
      setHasActiveSession(false);
      return false;
    }
  };

  const handleCancelSale = () => {
    setCart([]);
    setDiscount(0);
    setClient({ name: 'Consumidor Final', nif: '999999999' });
    setCashReceived('');
    setSplitAmounts({ cash: '', card: '' });
    setIsPaymentModalOpen(false);
    setIsFormalInvoiceModalOpen(false);
    setIsCancelConfirmOpen(false);
  };

  const fetchRegisters = () => {
    const establishmentId = user.establishment_id || 1;
    fetch(`/api/owner/establishments/${establishmentId}/cash-registers`)
      .then(res => res.json())
      .then(setCashRegisters);
  };

  useEffect(() => {
    const establishmentId = user.establishment_id || 1;
    fetch(`/api/seller/products/${establishmentId}`).then(res => res.json()).then(setProducts).catch(() => {});
    fetch(`/api/seller/services/${establishmentId}`).then(res => res.json()).then(setServices).catch(() => {});
    fetch(`/api/seller/clients/${establishmentId}`).then(res => res.json()).then(setClients).catch(() => {});
    fetch(`/api/admin/establishments`).then(res => res.json()).then(establishments => {
      if (Array.isArray(establishments)) {
        const currentEstablishment = establishments.find((s: any) => s.id === establishmentId);
        setEstablishmentInfo(currentEstablishment);
      }
    }).catch(() => {});
    
    // Fetch active series for FR
    fetch(`/api/owner/invoice-series/${user.id}`).then(res => res.json()).then(seriesList => {
      if (Array.isArray(seriesList)) {
        const prefix = user.billing_mode === 'eletronica' ? 'E' : 'A';
        const active = seriesList.find(s => s.establishment_id === establishmentId && s.prefix === prefix && s.type === 'FR' && s.status === 'active');
        setActiveSeries(active);
      }
    }).catch(() => {});

    fetch(`/api/owner/taxes/establishment/${establishmentId}`).then(res => res.json()).then(taxes => {
      if (Array.isArray(taxes)) {
        const defTax = taxes.find((t: any) => t.is_default === 1 && t.status === 'active');
        setDefaultTax(defTax || taxes.find((t: any) => t.status === 'active'));
      }
    }).catch(() => {});

    // Fetch currencies
    fetch(`/api/owner/currencies/${user.role === 'owner' ? user.id : user.owner_id}`).then(res => res.json()).then(data => {
      if (Array.isArray(data)) {
        setAvailableCurrencies(data);
        const base = data.find(c => c.is_base);
        if (base) setSelectedCurrencyCode(base.code);
      }
    }).catch(() => {});

    checkActiveSession();
    fetchRegisters();
  }, [user.establishment_id, user.cash_register_id]);


  const subtotal = cart.reduce((acc, i) => {
    let price = i.type === 'product' 
      ? ((i.item as Product).discount_percent ? i.item.price * (1 - (i.item as Product).discount_percent! / 100) : i.item.price)
      : i.item.price;
    
    // Add fees to the unit price
    if (i.selectedFees && i.selectedFees.length > 0) {
      const feesTotal = i.selectedFees.reduce((sum, f) => sum + f.amount, 0);
      price += feesTotal;
    }
    
    return acc + (price * i.quantity);
  }, 0);
  
  const discountAmount = discount;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  
  // Calculate tax per item
  const tax = cart.reduce((acc, i) => {
    let itemPrice = i.type === 'product' 
      ? ((i.item as Product).discount_percent ? i.item.price * (1 - (i.item as Product).discount_percent! / 100) : i.item.price)
      : i.item.price;
    
    // Add fees to the unit price for tax calculation
    if (i.selectedFees && i.selectedFees.length > 0) {
      const feesTotal = i.selectedFees.reduce((sum, f) => sum + f.amount, 0);
      itemPrice += feesTotal;
    }
    
    // Use item's tax percentage if available, otherwise use default tax percentage
    let taxPercentage = i.item.tax_percentage !== undefined && i.item.tax_percentage !== null 
      ? i.item.tax_percentage 
      : (defaultTax ? defaultTax.percentage : 14);
      
    if (user.fiscal_regime === 'exclusao') {
      taxPercentage = 0;
    }
      
    // Apply discount proportionally to each item for tax calculation if needed, 
    // but here we apply discount to subtotal. 
    // For simplicity and matching common practice, we'll calculate tax on the discounted subtotal proportionally.
    const itemSubtotal = itemPrice * i.quantity;
    const itemProportion = subtotal > 0 ? itemSubtotal / subtotal : 0;
    const itemDiscountedSubtotal = itemSubtotal - (discountAmount * itemProportion);
    
    return acc + (itemDiscountedSubtotal * (taxPercentage / 100));
  }, 0);

  const total = Math.round((taxableAmount + tax) * 100) / 100;

  const [totalInSelectedCurrency, setTotalInSelectedCurrency] = useState(0);

  useEffect(() => {
    if (availableCurrencies.length === 0) {
      setTotalInSelectedCurrency(total);
      setCurrentExchangeRate(1.0);
      return;
    }

    const currency = availableCurrencies.find(c => c.code === selectedCurrencyCode);
    if (currency) {
      if (currency.is_base) {
        setCurrentExchangeRate(1.0);
        setTotalInSelectedCurrency(total);
      } else {
        const ownerId = user.role === 'owner' ? user.id : user.owner_id;
        fetch(`/api/owner/exchange-rates/latest/${ownerId}/${currency.id}`)
          .then(res => res.json())
          .then(data => {
            const rate = data.rate || 1.0;
            setCurrentExchangeRate(rate);
            setTotalInSelectedCurrency(Math.round((total / rate) * 100) / 100);
          })
          .catch(() => {
            setCurrentExchangeRate(1.0);
            setTotalInSelectedCurrency(total);
          });
      }
    } else {
      setTotalInSelectedCurrency(total);
      setCurrentExchangeRate(1.0);
    }
  }, [selectedCurrencyCode, availableCurrencies, total]);

  useEffect(() => {
    if (isFormalInvoiceModalOpen && formalInvoiceForm.currency && availableCurrencies.length > 0) {
      const currency = availableCurrencies.find(c => c.code === formalInvoiceForm.currency);
      if (currency) {
        if (currency.is_base) {
          setFormalInvoiceAmount(total);
        } else {
          const ownerId = user.role === 'owner' ? user.id : user.owner_id;
          fetch(`/api/owner/exchange-rates/latest/${ownerId}/${currency.id}`)
            .then(res => res.json())
            .then(data => {
              const rate = data.rate || 1.0;
              setFormalInvoiceAmount(Math.round((total / rate) * 100) / 100);
            })
            .catch(() => setFormalInvoiceAmount(total));
        }
      }
    }
  }, [isFormalInvoiceModalOpen, formalInvoiceForm.currency, availableCurrencies, total]);

  const handleSelectRegister = async (registerId: number) => {
    const res = await fetch('/api/seller/select-register', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, cash_register_id: registerId })
    });
    if (res.ok) {
      onUpdate({ ...user, cash_register_id: registerId });
      // The useEffect will trigger checkActiveSession
    }
  };

  const handleOpenSession = async (e: FormEvent, registerId: number, amount: string) => {
    e.preventDefault();
    if (!hasPermission(user, 'pos_open_cashier')) {
      alert('Você não tem permissão para abrir o caixa.');
      return;
    }

    if (!amount || isNaN(parseFloat(amount))) {
      alert('Por favor, insira um valor de abertura válido.');
      return;
    }

    const establishmentId = user.establishment_id || 1;
    
    try {
      const res = await fetch('/api/seller/open-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishment_id: establishmentId,
          seller_id: user.id,
          cash_register_id: registerId,
          opening_amount: parseFloat(amount)
        })
      });

      if (res.ok) {
        setOpeningAmounts(prev => ({ ...prev, [registerId]: '' }));
        await handleSelectRegister(registerId);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao abrir caixa.');
      }
    } catch (error) {
      console.error("Error opening session:", error);
      alert('Erro de conexão ao abrir caixa.');
    }
  };

  const addToCart = async (item: Product | Service, type: 'product' | 'service' = 'product') => {
    if (!hasPermission(user, 'pos_sell')) {
      alert('Você não tem permissão para realizar vendas.');
      return;
    }

    let selectedFees: ServiceFee[] = [];
    if (type === 'service' && (item as Service).fees && (item as Service).fees!.length > 0) {
      selectedFees = await new Promise<ServiceFee[]>((resolve) => {
        setFeeSelection({ isOpen: true, service: item as Service, resolve });
      });
    }

    setCart(prev => {
      // If service with fees, always add as a new item to allow different fee combinations
      // or if it's a regular item, check for existing
      const hasFees = selectedFees && selectedFees.length > 0;
      
      const existing = !hasFees ? prev.find(i => i.item.id === item.id && i.type === type) : null;
      if (existing) {
        return prev.map(i => (i.item.id === item.id && i.type === type) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, type, quantity: 1, id: crypto.randomUUID(), selectedFees }];
    });
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === cartId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(i => i.id !== cartId));
  };

  if (hasActiveSession === false) {
    const userHasOpenSession = cashRegisters.some(r => r.session_status === 'open' && r.seller_id === user.id);

    return (
      <div className="flex-1 h-screen bg-zinc-50 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 md:p-8 space-y-8 max-w-6xl mx-auto w-full custom-scrollbar pb-32">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet size={40} />
          </div>
          <h2 className="text-3xl font-black text-zinc-900">Ativar Caixa para Trabalhar</h2>
          <p className="text-zinc-500 max-w-lg mx-auto">
            Para começar a vender, você precisa de selecionar um caixa aberto ou abrir um novo se tiver permissão.
            {userHasOpenSession && (
              <span className="block mt-2 text-rose-500 font-bold">
                Atenção: Você já possui um caixa aberto. Feche-o antes de abrir outro.
              </span>
            )}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-1 custom-scrollbar pb-32" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cashRegisters.map(register => {
            const isOpenedByMe = register.session_status === 'open' && register.seller_id === user.id;
            const isOpenedByOthers = register.session_status === 'open' && register.seller_id !== user.id;

            return (
              <Card key={register.id} className="p-8 border-zinc-100 shadow-sm rounded-[2.5rem] hover:border-orange-200 transition-all group relative overflow-hidden">
                <div className="flex items-start justify-between mb-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center",
                    register.session_status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                  )}>
                    <Monitor size={28} />
                  </div>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider",
                    register.session_status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                  )}>
                    {register.session_status === 'open' ? 'Aberto' : 'Fechado'}
                  </div>
                </div>
                
                <h3 className="font-black text-xl mb-1">{register.name}</h3>
                <p className="text-sm text-zinc-400 mb-8">Código: {register.code}</p>

                {register.session_status === 'open' ? (
                  <div className="space-y-3">
                    {isOpenedByOthers && (
                      <div className="bg-zinc-50 p-3 rounded-xl text-center mb-2">
                        <p className="text-[10px] uppercase font-bold text-zinc-400">Ocupado por outro funcionário</p>
                      </div>
                    )}
                    <button
                      onClick={() => handleSelectRegister(register.id)}
                      className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={20} />
                      {isOpenedByMe ? 'Continuar no Meu Caixa' : 'Ativar para Trabalhar'}
                    </button>
                  </div>
                ) : hasPermission(user, 'pos_open_cashier') ? (
                  <div className="space-y-4">
                    {userHasOpenSession ? (
                      <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl text-center">
                        <Lock size={24} className="mx-auto mb-3 text-rose-400" />
                        <p className="text-sm font-black text-rose-600 uppercase tracking-widest mb-1">Bloqueado</p>
                        <p className="text-xs text-rose-400">Você já tem um caixa aberto.</p>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">Kz</span>
                          <input
                            type="number"
                            placeholder="Valor de Abertura"
                            value={isNaN(Number(openingAmounts[register.id])) ? '' : openingAmounts[register.id]}
                            onChange={e => setOpeningAmounts(prev => ({ ...prev, [register.id]: e.target.value }))}
                            className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-lg"
                          />
                        </div>
                        <button
                          onClick={(e) => handleOpenSession(e, register.id, openingAmounts[register.id] || '')}
                          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-100"
                        >
                          Abrir e Ativar
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl text-center">
                    <Lock size={24} className="mx-auto mb-3 text-rose-400" />
                    <p className="text-sm font-black text-rose-600 uppercase tracking-widest mb-1">Caixa Fechado</p>
                    <p className="text-xs text-rose-400">Aguarde a abertura por um supervisor.</p>
                  </div>
                )}
              </Card>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}

  const handleCheckout = async () => {
    if (!hasPermission(user, 'pos_sell')) {
      alert('Você não tem permissão para realizar vendas.');
      return;
    }
    if (cart.length === 0) return;
    
    // Check if in electronic billing mode and if series is approved
    if (user.billing_mode === 'eletronica') {
      if (!activeSeries) {
        alert('Faturação Eletrónica Ativada: Você não possui uma série "E" ativa e aprovada para este estabelecimento. Por favor, solicite a aprovação de uma série nas definições.');
        return;
      }
      if (activeSeries.agt_status !== 'aprovada') {
        alert('Faturação Eletrónica Ativada: A sua série de faturação ainda não foi aprovada pela AGT. Aguarde a aprovação antes de faturar.');
        return;
      }
    }
    
    setIsProcessing(true);
    try {
      const establishmentId = user.establishment_id || 1;
      let url = `/api/seller/active-session/${establishmentId}`;
      if (user.cash_register_id) {
        url += `?cash_register_id=${user.cash_register_id}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        
        if (data && data.status === 'open') {
          setHasActiveSession(true);
          setIsPaymentModalOpen(true);
        } else {
          setHasActiveSession(false);
          alert('O caixa deve estar aberto para realizar vendas. Por favor, abra o caixa no Dashboard.');
        }
      } else {
        throw new Error("Received non-JSON response from server");
      }
    } catch (error: any) {
      const isParseError = error instanceof SyntaxError || error.message?.includes('Unexpected token') || error.message?.includes('valid JSON');
      if (!isParseError) {
        console.error('Error checking session:', error);
        alert('Erro ao verificar sessão do caixa. Verifique sua conexão.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateProforma = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasPermission(user, 'pos_sell')) {
      alert('Você não tem permissão para gerar proformas.');
      return;
    }
    if (cart.length === 0 || !establishmentInfo) return;

    try {
      const establishmentId = user.establishment_id || 1;
      const res = await fetch('/api/owner/proforma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proformaForm,
          establishment_id: establishmentId,
          owner_id: user.id,
          total_amount: total,
          cash_register_id: user.cash_register_id,
          items: cart.map(i => {
            let taxPercentage = i.item.tax_percentage !== undefined && i.item.tax_percentage !== null 
              ? i.item.tax_percentage 
              : (defaultTax ? defaultTax.percentage : 14);
            let taxCode = i.item.tax_code || (defaultTax ? defaultTax.tax_code : 'NOR');
            
            if (user.fiscal_regime === 'exclusao') {
              taxPercentage = 0;
              taxCode = 'ISE';
            }
            
            return {
              product_id: i.type === 'product' ? i.item.id : null,
              service_id: i.type === 'service' ? i.item.id : null,
              type: i.type,
              name: i.item.name,
              unit_cost: i.type === 'product' ? (i.item as Product).cost : 0,
              price: (i.type === 'product' 
                ? ((i.item as Product).discount_percent ? i.item.price * (1 - (i.item as Product).discount_percent! / 100) : i.item.price)
                : i.item.price) + (i.selectedFees?.reduce((sum, f) => sum + f.amount, 0) || 0),
              quantity: i.quantity,
              tax_percentage: taxPercentage,
              tax_code: taxCode,
              fees: i.selectedFees
            };
          })
        })
      });

      if (res.ok) {
        const proformaData = await res.json();
        setIsProformaModalOpen(false);
        setProformaForm({ client_name: '', client_nif: '', client_address: '' });
        alert("Fatura Proforma criada com sucesso!");
        await generateProformaPDF(proformaData, establishmentInfo, user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const finalizeSale = async () => {
    if (cart.length === 0 || !establishmentInfo) {
      alert('O carrinho está vazio ou informações do estabelecimento não carregadas!');
      return;
    }

    if (availableCurrencies.length === 0) {
      alert('Não é possível realizar vendas sem moedas cadastradas no sistema. Por favor, cadastre uma moeda nas configurações do proprietário.');
      return;
    }

    if (isNaN(totalInSelectedCurrency) || totalInSelectedCurrency <= 0) {
      alert('Valor da venda inválido.');
      return;
    }

    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived);
      if (isNaN(received) || received < totalInSelectedCurrency - 0.005) {
        alert('Dinheiro insuficiente ou valor inválido!');
        return;
      }
    }

    if (paymentMethod === 'split') {
      const cash = parseFloat(splitAmounts.cash) || 0;
      const card = parseFloat(splitAmounts.card) || 0;
      if (Math.abs((cash + card) - totalInSelectedCurrency) > 0.05) { // Allow small rounding difference
        alert(`A soma dos valores (${selectedCurrencyCode} ${cash + card}) deve ser igual ao total da venda (${selectedCurrencyCode} ${totalInSelectedCurrency})!`);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const establishmentId = user.establishment_id || 1;
      const res = await fetch('/api/p-venda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishment_id: establishmentId,
          seller_id: user.id,
          cash_register_id: user.cash_register_id,
          total_amount: totalInSelectedCurrency,
          payment_method: paymentMethod,
          client_name: client.name || 'Consumidor Final',
          client_nif: client.nif || '999999999',
          discount_percent: 0,
          discount_amount: discountAmount,
          tax_amount: tax,
          currency_code: selectedCurrencyCode,
          exchange_rate: currentExchangeRate,
          cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : (paymentMethod === 'split' ? (parseFloat(splitAmounts.cash) || 0) : totalInSelectedCurrency),
          split_details: paymentMethod === 'split' ? { cash: parseFloat(splitAmounts.cash) || 0, card: parseFloat(splitAmounts.card) || 0 } : null,
          items: cart.map(i => {
            let price = i.type === 'product' 
              ? ((i.item as Product).discount_percent ? i.item.price * (1 - (i.item as Product).discount_percent! / 100) : i.item.price)
              : i.item.price;
            
            // Add fees to unit price
            if (i.selectedFees && i.selectedFees.length > 0) {
              const feesTotal = i.selectedFees.reduce((sum, f) => sum + f.amount, 0);
              price += feesTotal;
            }

            let taxPercentage = i.item.tax_percentage !== undefined && i.item.tax_percentage !== null 
              ? i.item.tax_percentage 
              : (defaultTax ? defaultTax.percentage : 14);
            let taxCode = i.item.tax_code || (defaultTax ? defaultTax.tax_code : 'NOR');

            if (user.fiscal_regime === 'exclusao') {
              taxPercentage = 0;
              taxCode = 'ISE';
            }

            return { 
              id: i.item.id, 
              type: i.type,
              name: i.item.name,
              quantity: i.quantity,
              price: price,
              unit_cost: i.type === 'product' ? (i.item as Product).cost : 0,
              tax_percentage: taxPercentage,
              tax_code: taxCode,
              fees: i.selectedFees // Optional: backend records fees in JSON
            };
          })
        })
      });

      if (res.ok) {
        const saleData = await res.json();
        if (saleData.sale) {
          setLastSale(saleData.sale);
          setIsInvoiceModalOpen(true);
          setCart([]);
          setIsPaymentModalOpen(false);
          setCashReceived('');
          setSplitAmounts({ cash: '', card: '' });
          setDiscount(0);
          setClient({ name: 'Consumidor Final', nif: '999999999' });
          fetch(`/api/seller/products/${establishmentId}`).then(res => res.json()).then(setProducts);
        } else {
          throw new Error("Dados da venda não recebidos do servidor.");
        }
      } else {
        let errorMessage = "Erro ao processar venda.";
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (res.status === 403) {
            if (data.series_status) {
              alert(`ERRO DE FATURAÇÃO ELETRÓNICA: ${data.error}\n\nPor favor, contacte o administrador para aprovar a série de faturação nas configurações fiscais.`);
              setIsPaymentModalOpen(false);
              return;
            } else {
              alert(data.error || 'O caixa deve estar aberto para realizar vendas.');
              setHasActiveSession(false);
              setIsPaymentModalOpen(false);
              return;
            }
          }
          errorMessage = data.error || errorMessage;
        } else {
          const text = await res.text();
          console.error("Non-JSON error response:", text);
          errorMessage = `Erro do servidor (${res.status}). Por favor, tente novamente.`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error finalizing sale:', error);
      alert(error instanceof Error ? error.message : "Erro crítico ao finalizar venda. Verifique a sua conexão.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateFormalInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Check if in electronic billing mode and if series is approved
    if (user.billing_mode === 'eletronica') {
      if (!activeSeries) {
        alert('Faturação Eletrónica Ativada: Você não possui uma série "E" ativa e aprovada para este estabelecimento. Por favor, solicite a aprovação de uma série nas definições.');
        return;
      }
      if (activeSeries.agt_status !== 'aprovada') {
        alert('Faturação Eletrónica Ativada: A sua série de faturação ainda não foi aprovada pela AGT. Aguarde a aprovação antes de faturar.');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const establishmentId = user.establishment_id || 1;
      const items = cart.map(i => {
        const unitPrice = i.type === 'product' 
          ? ((i.item as Product).discount_percent ? i.item.price * (1 - (i.item as Product).discount_percent! / 100) : i.item.price)
          : i.item.price;
        const feesTotal = i.selectedFees?.reduce((sum, f) => sum + f.amount, 0) || 0;
        const price = unitPrice + feesTotal;
        
        let taxPercentage = i.item.tax_percentage || (defaultTax ? defaultTax.percentage : 14);
        if (user.fiscal_regime === 'exclusao') {
          taxPercentage = 0;
        }

        return { 
          product_id: i.item.id, 
          name: i.item.name,
          quantity: i.quantity,
          price: price,
          unit_cost: i.type === 'product' ? (i.item as Product).cost : 0,
          type: i.type,
          code: i.type === 'product' ? (i.item as Product).barcode : (i.item as Service).code,
          tax: taxPercentage,
          fees: i.selectedFees
        };
      });

      const currencyObj = availableCurrencies.find(c => c.code === formalInvoiceForm.currency);
      const rateToUse = (currencyObj && !currencyObj.is_base && formalInvoiceAmount > 0) ? total / formalInvoiceAmount : 1.0;

      const total_amount = formalInvoiceAmount;
      const tax_amount = Math.round((tax / rateToUse) * 100) / 100;

      const res = await fetch('/api/owner/credit-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formalInvoiceForm, 
          items: items.map(it => ({
            ...it,
            price: Math.round((it.price / rateToUse) * 100) / 100
          })),
          establishment_id: establishmentId,
          total_amount,
          tax_amount,
          exchange_rate: rateToUse,
          seller_id: user.id,
          cash_register_id: user.cash_register_id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLastFormalInvoice(data);
        setIsFormalInvoiceModalOpen(false);
        setIsFormalInvoiceGeneratedModalOpen(true);
        setCart([]);
        setDiscount(0);
        setClient({ name: 'Consumidor Final', nif: '999999999' });
        fetch(`/api/seller/products/${establishmentId}`).then(res => res.json()).then(setProducts);
        alert('Fatura Recibo emitida com sucesso!');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao emitir fatura recibo.');
      }
    } catch (error) {
      console.error("Error creating formal invoice:", error);
      alert('Erro de conexão ao emitir fatura recibo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const change = paymentMethod === 'cash' && cashReceived ? parseFloat(cashReceived) - totalInSelectedCurrency : 0;

  const filteredProducts = products
    .filter(p => 
      (category === 'Geral' || p.category === category || (category === 'Promoções' && p.discount_percent)) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase())))
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const dynamicCategories: string[] = Array.from(new Set(products.map(p => p.category)))
    .filter((cat): cat is string => !!cat && cat !== 'Geral' && cat !== 'Promoções')
    .sort();

  const categoryIcons: Record<string, any> = {
    'Bebidas': Beer,
    'Alimentos': Apple,
    'Cosméticos': Sparkles,
    'Café': Coffee,
    'Outros': Layers,
    'Limpeza': Zap,
    'Talho': Box,
    'Padaria': Coffee,
  };

  const categories = [
    { name: 'Geral', icon: LayoutGrid },
    { name: 'Promoções', icon: Tag },
    ...dynamicCategories.map(cat => ({
      name: cat,
      icon: categoryIcons[cat] || Package
    }))
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 p-4 md:p-6 pb-24 lg:pb-6 relative">
      {/* Product Selection */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 min-h-0 transition-all",
        showCartMobile ? "hidden lg:flex" : "flex"
      )}>
        <div className="mb-6 space-y-6">
          <div className="bg-orange-500 -mx-6 -mt-6 p-6 text-white rounded-b-[2rem] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">PDV - Estabelecimento</h2>
                <p className="text-orange-100 text-sm opacity-80">Terminal: {user.cash_register_name || 'Caixa'}</p>
              </div>
              <div className="flex items-center gap-2 bg-orange-400/30 px-3 py-1 rounded-full text-xs font-bold">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                OFF
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                  <ShoppingCart size={24} />
                </div>
              </div>
              <div>
                <p className="font-bold text-lg">{user.name}</p>
                <p className="text-orange-100 text-sm opacity-80">Perfil: {user.role}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {hasActiveSession === false && (
              <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 mb-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-rose-900">Caixa Fechado</h3>
                    <p className="text-sm text-rose-600">É necessário abrir o caixa para realizar vendas.</p>
                  </div>
                </div>
                {hasPermission(user, 'pos_open_cashier') ? (
                  <button 
                    onClick={() => window.location.hash = '#/seller/close'}
                    className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-200"
                  >
                    Abrir Caixa Agora
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200">
                    Aguarde a abertura por um supervisor
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome ou código de barra..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm text-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setCategory(cat.name)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all shadow-sm border-2",
                    category === cat.name 
                      ? "bg-orange-500 border-orange-500 text-white" 
                      : "bg-white border-zinc-100 text-zinc-500 hover:border-orange-200"
                  )}
                >
                  <cat.icon size={18} />
                  {cat.name}
                </button>
              ))}
              {services.length > 0 && (
                <button
                  onClick={() => setIsServiceModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all shadow-sm border-2 bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800"
                >
                  <Sparkles size={18} />
                  Serviços
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 pr-2 pb-4">
          {filteredProducts.map(product => (
            <motion.div
              layout
              key={product.id}
              onClick={() => addToCart(product)}
              className="group cursor-pointer"
            >
              <Card className="h-full hover:border-orange-500 transition-all border-zinc-100 shadow-sm rounded-xl flex flex-col overflow-hidden">
                <div className="aspect-[4/3] relative p-2 bg-zinc-50/50">
                  <img 
                    src={product.image_url || undefined} 
                    alt={product.name} 
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" 
                    referrerPolicy="no-referrer" 
                  />
                  {product.discount_percent && (
                    <div className="absolute top-1 right-1 bg-rose-600 text-white text-[7px] font-bold px-1 py-0.5 rounded-full uppercase shadow-sm">
                      -{product.discount_percent}%
                    </div>
                  )}
                </div>
                <div className="p-1.5 flex-1 flex flex-col min-h-0">
                  <h4 className="font-bold text-[10px] text-zinc-800 line-clamp-1 mb-0.5 leading-tight">{product.name}</h4>
                  <div className="mt-auto flex items-center justify-between gap-1">
                    <div className="flex flex-col">
                      {product.discount_percent && (
                        <span className="text-[7px] text-zinc-400 line-through">Kz {(product.price || 0).toLocaleString()}</span>
                      )}
                      <p className="font-black text-orange-600 text-[10px]">
                        Kz {(product.discount_percent 
                          ? (product.price || 0) * (1 - product.discount_percent / 100) 
                          : (product.price || 0)).toLocaleString()}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[7px] font-bold px-1 rounded-md",
                      product.stock > 10 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                    )}>
                      {product.stock}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Cart / Checkout - Sidebar on desktop, Toggleable on mobile */}
      <div className={cn(
        "lg:flex w-full lg:w-80 flex-col transition-all",
        showCartMobile ? "flex flex-1 fixed inset-0 z-50 p-4 bg-white lg:relative lg:p-0 lg:bg-transparent lg:inset-auto" : "hidden"
      )}>
        <Card className="flex-1 flex flex-col shadow-2xl border-zinc-200 rounded-[2rem] overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ShoppingCart size={20} className="text-orange-500" /> Carrinho
            </h3>
            <div className="flex items-center gap-3">
              <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-black">
                {cart.reduce((acc, item) => acc + item.quantity, 0)} ITENS
              </span>
              <button 
                onClick={() => setShowCartMobile(false)}
                className="lg:hidden p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-300 space-y-3">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                  <ShoppingCart size={32} strokeWidth={1.5} />
                </div>
                <p className="text-xs font-medium">Seu carrinho está vazio</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(i => {
                  const unitPrice = i.type === 'product' 
                    ? ((i.item as Product).discount_percent ? i.item.price * (1 - (i.item as Product).discount_percent! / 100) : i.item.price)
                    : i.item.price;
                  const feesTotal = i.selectedFees?.reduce((sum, f) => sum + f.amount, 0) || 0;
                  const totalPrice = (unitPrice + feesTotal) * i.quantity;

                  return (
                    <div key={i.id} className="flex flex-col gap-1 border-b border-zinc-50 pb-3 last:border-0 group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0 flex items-center justify-center">
                          {i.type === 'product' ? (
                            <img src={(i.item as Product).image_url || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Tag size={16} className="text-orange-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-zinc-900 truncate uppercase tracking-tight">{i.item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <button 
                              onClick={() => updateQuantity(i.id, -1)}
                              className="w-4 h-4 flex items-center justify-center bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200 text-[10px] font-bold"
                            >
                              -
                            </button>
                            <span className="text-[10px] font-black w-4 text-center">{i.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(i.id, 1)}
                              className="w-4 h-4 flex items-center justify-center bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200 text-[10px] font-bold"
                            >
                              +
                            </button>
                            <span className="text-[9px] font-bold text-zinc-400 ml-1">
                              x {selectedCurrencyCode} {((unitPrice + feesTotal) / currentExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-black text-zinc-900">
                            {selectedCurrencyCode} {(totalPrice / currentExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <button 
                            onClick={() => removeFromCart(i.id)}
                            className="text-rose-400 hover:text-rose-600 p-1 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                      
                      {i.selectedFees && i.selectedFees.length > 0 && (
                        <div className="pl-13 flex flex-wrap gap-1">
                          {i.selectedFees.map((fee, fIdx) => (
                            <span key={fIdx} className="text-[8px] font-black bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded uppercase tracking-widest border border-orange-100">
                              {fee.name} (+{selectedCurrencyCode} {(fee.amount / currentExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="pt-4 border-t border-zinc-100 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cliente</label>
                    <button 
                      onClick={() => setIsClientModalOpen(true)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-orange-500 transition-all group"
                    >
                      <div className="text-left">
                        <p className="text-[10px] font-black text-zinc-800">{client.name}</p>
                        <p className="text-[8px] text-zinc-400">NIF: {client.nif}</p>
                      </div>
                      <UserPlus size={16} className="text-zinc-400 group-hover:text-orange-500" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Desconto Global (Kz)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        disabled={!hasPermission(user, 'pos_discount')}
                        value={isNaN(Number(discount)) ? '' : discount}
                        onChange={e => setDiscount(Number(e.target.value))}
                        className={cn(
                          "w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-orange-500 text-xs font-bold",
                          !hasPermission(user, 'pos_discount') && "opacity-50 cursor-not-allowed"
                        )}
                        placeholder="0.00"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px] font-bold">Kz</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-zinc-50 border-t border-zinc-100 space-y-4 rounded-b-[2rem]">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Subtotal</span>
                <span className="font-bold text-zinc-700">{selectedCurrencyCode} {((subtotal || 0) / currentExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-rose-500">
                  <span>Desconto</span>
                  <span className="font-bold">- {selectedCurrencyCode} {((discountAmount || 0) / currentExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Imposto ({defaultTax ? `${defaultTax.percentage}%` : (user?.fiscal_regime === 'exclusao' ? '0%' : '14%')})</span>
                <span className="font-bold text-zinc-700">{selectedCurrencyCode} {((tax || 0) / currentExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xl font-black pt-3 border-t border-zinc-200 text-zinc-900">
                <span>Total</span>
                <span className="text-orange-600">{selectedCurrencyCode} {totalInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsProformaModalOpen(true)}
                disabled={cart.length === 0 || !hasPermission(user, 'pos_sell')}
                className="flex-1 bg-zinc-100 text-zinc-600 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                <FileText size={18} />
                Proforma
              </button>
              <button 
                onClick={() => {
                  setFormalInvoiceForm({
                    ...formalInvoiceForm, 
                    doc_type: 'FR',
                    client_name: client.name !== 'Consumidor Final' ? client.name : '',
                    client_nif: client.nif !== '999999999' ? client.nif : '',
                    currency: selectedCurrencyCode
                  });
                  setIsFormalInvoiceModalOpen(true);
                }}
                disabled={cart.length === 0 || !hasPermission(user, 'pos_sell')}
                className="flex-1 bg-zinc-100 text-zinc-600 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                <FileText size={18} />
                Fatura
              </button>
              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0 || isProcessing || hasActiveSession === false || !hasPermission(user, 'pos_sell')}
                className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 hover:bg-orange-600 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
              >
                {isProcessing ? 'Processando...' : 'Vender agora'}
                <ChevronRight size={20} />
              </button>
            </div>
            {hasActiveSession === false && (
              <p className="text-rose-500 text-[10px] font-bold mt-2 text-center animate-pulse">
                CAIXA FECHADO. ABRA O CAIXA NO DASHBOARD DO VENDEDOR.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Proforma Modal */}
      <Modal isOpen={isProformaModalOpen} onClose={() => setIsProformaModalOpen(false)} title="Gerar Fatura Proforma">
        <form onSubmit={handleCreateProforma} className="space-y-4">
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 mb-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Resumo dos Itens</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {cart.map(item => {
                const unitPrice = (item.type === 'product' && (item.item as Product).discount_percent 
                  ? item.item.price * (1 - (item.item as Product).discount_percent! / 100) 
                  : item.item.price);
                const feesTotal = item.selectedFees?.reduce((sum, f) => sum + f.amount, 0) || 0;
                
                return (
                  <div key={item.id} className="flex flex-col gap-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-600 font-bold">{item.quantity}x {item.item.name}</span>
                      <span className="font-black">{selectedCurrencyCode} {(((unitPrice + feesTotal) * item.quantity) / currentExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {item.selectedFees && item.selectedFees.length > 0 && (
                      <div className="pl-4 flex flex-wrap gap-1">
                        {item.selectedFees.map((fee, idx) => (
                          <span key={idx} className="text-[8px] text-orange-600 italic">
                            + {fee.name} ({selectedCurrencyCode} {(fee.amount / currentExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-200 flex justify-between font-bold text-sm">
              <span>Total Proforma</span>
              <span className="text-orange-600">{selectedCurrencyCode} {totalInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome do Cliente</label>
              <input 
                type="text" required
                value={proformaForm.client_name}
                onChange={e => setProformaForm({...proformaForm, client_name: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">NIF</label>
                <input 
                  type="text"
                  value={proformaForm.client_nif}
                  onChange={e => setProformaForm({...proformaForm, client_nif: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Telefone</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Endereço</label>
              <textarea 
                value={proformaForm.client_address}
                onChange={e => setProformaForm({...proformaForm, client_address: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all h-20 resize-none"
                placeholder="Opcional"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all active:scale-95 mt-4"
          >
            Gerar Fatura Proforma
          </button>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Finalizar Pagamento">
        <div className="space-y-6">
          <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {availableCurrencies.length > 1 && (
                <select 
                  value={selectedCurrencyCode}
                  onChange={(e) => setSelectedCurrencyCode(e.target.value)}
                  className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {availableCurrencies.map(c => (
                    <option key={c.id} value={c.code}>{c.code}</option>
                  ))}
                </select>
              )}
              <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Total a Pagar</p>
            </div>
            <h3 className="text-4xl font-black text-zinc-900">{selectedCurrencyCode} {totalInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            {currentExchangeRate !== 1 && (
              <p className="text-xs text-zinc-400 mt-2 font-medium italic">
                Equivalente a: {(availableCurrencies.find(c => c.is_base)?.code || 'Kz')} {total.toLocaleString()} 
                <span className="ml-2">(Taxa: {currentExchangeRate})</span>
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Método de Pagamento</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'cash', label: 'Dinheiro', icon: Wallet },
                { id: 'card', label: 'Cartão', icon: CreditCard },
                { id: 'transfer', label: 'Transferência', icon: ArrowUpCircle },
                { id: 'split', label: 'Dividido', icon: Split },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                    paymentMethod === m.id 
                      ? "border-orange-500 bg-orange-50 text-orange-600" 
                      : "border-zinc-100 bg-white text-zinc-500 hover:border-orange-200"
                  )}
                >
                  <m.icon size={20} />
                  <span className="text-[9px] font-black uppercase">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Quantia Recebida ({selectedCurrencyCode})</label>
                  <button 
                    onClick={() => setCashReceived(totalInSelectedCurrency.toFixed(2))}
                    className="text-[10px] font-black text-orange-600 uppercase hover:underline"
                  >
                    Valor Exacto
                  </button>
                </div>
                <input
                  type="number"
                  autoFocus
                  value={isNaN(Number(cashReceived)) ? '' : cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-black text-2xl"
                />
              </div>

              {cashReceived && (
                <div className={cn(
                  "p-4 rounded-2xl flex items-center justify-between",
                  change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                )}>
                  <span className="text-sm font-bold">
                    {change >= 0 ? 'Troco a devolver' : 'Dinheiro insuficiente'}
                  </span>
                  <span className="font-black">
                    {selectedCurrencyCode} {(Math.abs(change) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {paymentMethod === 'split' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 flex items-center gap-1">
                    <Wallet size={12} /> Dinheiro
                  </label>
                  <input
                    type="number"
                    value={isNaN(Number(splitAmounts.cash)) ? '' : splitAmounts.cash}
                    onChange={e => setSplitAmounts({...splitAmounts, cash: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 flex items-center gap-1">
                    <CreditCard size={12} /> Cartão
                  </label>
                  <input
                    type="number"
                    value={isNaN(Number(splitAmounts.card)) ? '' : splitAmounts.card}
                    onChange={e => setSplitAmounts({...splitAmounts, card: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-lg"
                  />
                </div>
              </div>
              
              <div className="pt-2 flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-medium">Total Lançado:</span>
                <span className={cn(
                  "font-black",
                  Math.abs((parseFloat(splitAmounts.cash || '0') + parseFloat(splitAmounts.card || '0')) - totalInSelectedCurrency) < 0.01 
                    ? "text-emerald-600" 
                    : "text-rose-600"
                )}>
                  {selectedCurrencyCode} {(parseFloat(splitAmounts.cash || '0') + parseFloat(splitAmounts.card || '0')).toLocaleString()} / {totalInSelectedCurrency.toLocaleString()}
                </span>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={finalizeSale}
              disabled={isProcessing || (paymentMethod === 'cash' && (isNaN(parseFloat(cashReceived)) || parseFloat(cashReceived) < totalInSelectedCurrency)) || (paymentMethod === 'split' && Math.abs((parseFloat(splitAmounts.cash || '0') + parseFloat(splitAmounts.card || '0')) - totalInSelectedCurrency) > 0.05)}
              className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
            </button>
            <button
              onClick={() => setIsCancelConfirmOpen(true)}
              className="w-full bg-rose-50 text-rose-600 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-rose-100 transition-all active:scale-95"
            >
              <Trash2 size={18} />
              Cancelar Venda
            </button>
          </div>
        </div>
      </Modal>

      {/* Client Selection Modal */}
      <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="Vincular Cliente">
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar cliente por nome ou NIF..." 
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            <button
              onClick={() => {
                setClient({ name: 'Consumidor Final', nif: '999999999' });
                setIsClientModalOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                client.name === 'Consumidor Final' ? "border-orange-500 bg-orange-50" : "border-zinc-100 hover:border-orange-200"
              )}
            >
              <div>
                <p className="font-black text-zinc-800">Consumidor Final</p>
                <p className="text-xs text-zinc-400">NIF: 999999999</p>
              </div>
              {client.name === 'Consumidor Final' && <Check size={20} className="text-orange-500" />}
            </button>

            {clients.filter(c => 
              c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
              c.nif.toLowerCase().includes(clientSearch.toLowerCase())
            ).map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setClient({ name: c.name, nif: c.nif });
                  setIsClientModalOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                  client.name === c.name ? "border-orange-500 bg-orange-50" : "border-zinc-100 hover:border-orange-200"
                )}
              >
                <div>
                  <p className="font-black text-zinc-800">{c.name}</p>
                  <p className="text-xs text-zinc-400">NIF: {c.nif} | Tel: {c.phone}</p>
                </div>
                {client.name === c.name && <Check size={20} className="text-orange-500" />}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <p className="text-xs font-bold text-zinc-500 uppercase mb-3">Ou inserir manualmente</p>
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="text"
                placeholder="Nome do Cliente"
                value={client.name === 'Consumidor Final' ? '' : client.name}
                onChange={e => setClient({...client, name: e.target.value})}
                className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold"
              />
              <input 
                type="text"
                placeholder="NIF"
                value={client.nif === '999999999' ? '' : client.nif}
                onChange={e => setClient({...client, nif: e.target.value})}
                className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold"
              />
            </div>
            <button 
              onClick={() => setIsClientModalOpen(false)}
              className="w-full mt-4 bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all"
            >
              Confirmar Cliente
            </button>
          </div>
        </div>
      </Modal>

      {/* Invoice Modal */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="Fatura Gerada">
        <Invoice sale={lastSale} establishment={establishmentInfo} user={user} />
      </Modal>

      {/* Formal Invoice Form Modal */}
      <Modal 
        isOpen={isFormalInvoiceModalOpen} 
        onClose={() => setIsFormalInvoiceModalOpen(false)} 
        title="Nova Fatura Recibo"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateFormalInvoice} className="space-y-8 p-4">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 pb-2">Dados do Cliente</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">NIF do Cliente</label>
                  <input 
                    type="text" 
                    required
                    value={formalInvoiceForm.client_nif}
                    onChange={e => setFormalInvoiceForm({...formalInvoiceForm, client_nif: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Nome do Cliente</label>
                  <input 
                    type="text" 
                    required
                    value={formalInvoiceForm.client_name}
                    onChange={e => setFormalInvoiceForm({...formalInvoiceForm, client_name: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Endereço</label>
                <input 
                  type="text" 
                  required
                  value={formalInvoiceForm.address}
                  onChange={e => setFormalInvoiceForm({...formalInvoiceForm, address: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">País</label>
                  <input 
                    type="text" 
                    required
                    value={formalInvoiceForm.country}
                    onChange={e => setFormalInvoiceForm({...formalInvoiceForm, country: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Moeda</label>
                  <select 
                    value={formalInvoiceForm.currency}
                    onChange={e => setFormalInvoiceForm({...formalInvoiceForm, currency: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-sm"
                  >
                    {availableCurrencies.map(c => (
                      <option key={c.id} value={c.code}>{c.code} ({c.name})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 pb-2">Dados do Documento</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Tipo de Pagamento</label>
                  <select 
                    value={formalInvoiceForm.payment_method}
                    onChange={e => setFormalInvoiceForm({...formalInvoiceForm, payment_method: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-sm"
                  >
                    <option value="cash">Numerário (Dinheiro)</option>
                    <option value="multicaixa">Multicaixa (TPA)</option>
                    <option value="transfer">Transferência Bancária</option>
                    <option value="split">Misto (Dinheiro + TPA)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Data da Fatura (Automática)</label>
                <input 
                  type="date" 
                  readOnly
                  value={formalInvoiceForm.invoice_date}
                  className="w-full px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-xl outline-none cursor-not-allowed font-bold text-sm text-zinc-500"
                />
              </div>
              <div className="p-6 bg-zinc-900 rounded-3xl text-white">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Total da Fatura</span>
                  <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">{formalInvoiceForm.currency}</span>
                </div>
                <div className="text-4xl font-black tracking-tighter">
                  {formalInvoiceForm.currency} {formalInvoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-50">
                  <span>Itens no Carrinho</span>
                  <span>{cart.length} Artigos</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              type="button"
              onClick={() => setIsCancelConfirmOpen(true)}
              className="flex-1 px-8 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-100 transition-all"
            >
              Cancelar Venda
            </button>
            <button 
              type="submit"
              disabled={isProcessing}
              className="flex-[2] px-8 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-xl shadow-black/20 disabled:opacity-50"
            >
              {isProcessing ? 'Processando...' : 'Emitir Fatura Recibo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Formal Invoice Generated Modal */}
      <Modal 
        isOpen={isFormalInvoiceGeneratedModalOpen} 
        onClose={() => setIsFormalInvoiceGeneratedModalOpen(false)} 
        title="Fatura Formal Gerada"
        maxWidth="max-w-4xl"
      >
        <CreditInvoicePreview invoice={lastFormalInvoice} establishment={establishmentInfo} />
      </Modal>

      <Modal 
        isOpen={feeSelection.isOpen} 
        onClose={() => {
          feeSelection.resolve?.([]);
          setFeeSelection({ isOpen: false, service: null, resolve: null });
        }} 
        title="Taxas Adicionais"
      >
        <FeeSelectionContent 
           service={feeSelection.service} 
           onConfirm={(fees) => {
             feeSelection.resolve?.(fees);
             setFeeSelection({ isOpen: false, service: null, resolve: null });
           }}
        />
      </Modal>

      {/* Services Modal */}
      <Modal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title="Serviços Disponíveis">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map(service => {
              const needsProduct = service.availability_condition === 'product_purchased';
              const hasProductInCart = cart.some(i => i.type === 'product');
              const isDisabled = needsProduct && !hasProductInCart;

              return (
                <button
                  key={service.id}
                  disabled={isDisabled}
                  onClick={() => {
                    addToCart(service, 'service');
                    setIsServiceModalOpen(false);
                  }}
                  className={cn(
                    "flex flex-col p-4 rounded-2xl border-2 transition-all text-left group relative overflow-hidden",
                    isDisabled 
                      ? "border-zinc-100 bg-zinc-50 opacity-60 cursor-not-allowed" 
                      : "border-zinc-100 bg-white hover:border-orange-500 hover:bg-orange-50"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      isDisabled ? "bg-zinc-200 text-zinc-400" : "bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white"
                    )}>
                      <Tag size={18} />
                    </div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{service.code}</span>
                  </div>
                  <h4 className="font-bold text-zinc-800 leading-tight mb-1">{service.name}</h4>
                  <p className="text-[10px] text-zinc-500 line-clamp-2 mb-3">{service.description}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <p className="font-black text-orange-600">Kz {service.price.toLocaleString()}</p>
                    {needsProduct && (
                      <div className="flex items-center gap-1 text-[8px] font-bold text-rose-500 uppercase">
                        <AlertCircle size={10} /> Requer Produto
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {services.length === 0 && (
            <div className="text-center py-8 text-zinc-400">
              <Package size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhum serviço disponível para este estabelecimento.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal isOpen={isCancelConfirmOpen} onClose={() => setIsCancelConfirmOpen(false)} title="Confirmar Cancelamento">
        <div className="space-y-6 text-center py-4">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-zinc-900">Cancelar Venda?</h3>
            <p className="text-zinc-500 text-sm">Esta ação irá limpar todos os itens do carrinho e redefinir os dados da venda atual. Esta ação não pode ser desfeita.</p>
          </div>
          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => setIsCancelConfirmOpen(false)}
              className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all"
            >
              Voltar
            </button>
            <button 
              onClick={handleCancelSale}
              className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
            >
              Sim, Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Mobile Cart FAB */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowCartMobile(!showCartMobile)}
          className={cn(
            "flex items-center gap-3 px-6 py-4 rounded-full font-black text-sm shadow-2xl transition-all active:scale-95 border-2 border-white",
            cart.length > 0 ? "bg-orange-600 text-white" : "bg-zinc-800 text-white"
          )}
        >
          <div className="relative">
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-3 -right-3 w-5 h-5 bg-white text-orange-600 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </div>
          <span>{selectedCurrencyCode} {totalInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </button>
      </div>
    </div>
  );
};

const SellerHistory = ({ user }: { user: User }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [establishmentInfo, setEstablishmentInfo] = useState<any>(null);
  
  // New state for cancellation requests
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ doc_type: 'NC', type: 'cancel', reason: '', amount: '' });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  useEffect(() => {
    fetch(`/api/seller/sales/${user.id}`).then(res => res.json()).then(setSales);
    fetch(`/api/admin/establishments`).then(res => res.json()).then(establishments => {
      if (Array.isArray(establishments)) {
        const currentEstablishment = establishments.find((s: any) => s.id === (user.establishment_id || 1));
        setEstablishmentInfo(currentEstablishment);
      }
    });
  }, [user.id, user.establishment_id]);

  const openInvoice = (sale: any) => {
    let formattedSale = { ...sale };
    if (typeof formattedSale.items === 'string') {
      try {
        formattedSale.items = JSON.parse(formattedSale.items);
      } catch (e) {
        console.error("Error parsing items:", e);
      }
    }
    setSelectedSale(formattedSale);
    setIsInvoiceModalOpen(true);
  };

  const openRequestModal = (sale: any) => {
    let formattedSale = { ...sale };
    if (typeof formattedSale.items === 'string') {
      try {
        formattedSale.items = JSON.parse(formattedSale.items);
      } catch (e) {}
    }
    setSelectedSale(formattedSale);
    setIsRequestModalOpen(true);
  };

  const handleRequestNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    
    setIsSubmittingRequest(true);
    try {
      const res = await fetch('/api/sales/request-cancellation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: selectedSale.id,
          doc_type: requestForm.doc_type,
          type: requestForm.type,
          reason: requestForm.reason,
          amount: requestForm.type === 'cancel' ? selectedSale.total_amount : Number(requestForm.amount),
          requested_by: user.id,
          establishment_id: user.establishment_id,
          items: selectedSale.items
        })
      });
      if (res.ok) {
        alert('Solicitação enviada com sucesso!');
        setIsRequestModalOpen(false);
        setRequestForm({ doc_type: 'NC', type: 'cancel', reason: '', amount: '' });
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao enviar solicitação.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar solicitação.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Histórico de Vendas</h2>
          <p className="text-zinc-500">Visualize e reimprima faturas de vendas passadas.</p>
        </div>
      </div>

      <Card className="overflow-hidden border-zinc-100 shadow-sm rounded-[2rem]">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Método</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sales.map((sale) => (
                <tr key={`${sale.source || 'trans'}-${sale.id}`} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">#{sale.id.toString().padStart(6, '0')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      sale.doc_type === 'FR' ? 'bg-blue-100 text-blue-600' :
                      sale.doc_type === 'FT' ? 'bg-purple-100 text-purple-600' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {sale.doc_type || 'FR'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{new Date(sale.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold">{sale.client_name}</div>
                    <div className="text-[10px] text-zinc-400">NIF: {sale.client_nif}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-bold uppercase">
                      {sale.payment_method || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-sm">Kz {(sale.total_amount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openRequestModal(sale)}
                        className="p-2 text-zinc-400 hover:text-rose-500 transition-colors"
                        title="Solicitar Nota de Crédito"
                      >
                        <RefreshCcw size={18} />
                      </button>
                      <button 
                        onClick={() => openInvoice(sale)}
                        className="p-2 text-zinc-400 hover:text-orange-500 transition-colors"
                      >
                        <Printer size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 italic">Nenhuma venda encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile History View */}
        <div className="md:hidden divide-y divide-zinc-100">
          {sales.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-400 italic text-sm">Nenhuma venda encontrada.</div>
          ) : sales.map((sale) => (
            <div key={`${sale.source || 'trans'}-${sale.id}`} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-400">#{sale.id.toString().padStart(6, '0')}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                      sale.doc_type === 'FR' ? 'bg-blue-100 text-blue-600' :
                      sale.doc_type === 'FT' ? 'bg-purple-100 text-purple-600' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {sale.doc_type || 'FR'}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold">{new Date(sale.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm text-zinc-900">Kz {(sale.total_amount || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-zinc-800">{sale.client_name}</p>
                  <p className="text-[10px] text-zinc-400">NIF: {sale.client_nif}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openRequestModal(sale)}
                    className="p-2 bg-zinc-50 text-zinc-400 rounded-xl"
                  >
                    <RefreshCcw size={16} />
                  </button>
                  <button 
                    onClick={() => openInvoice(sale)}
                    className="p-2 bg-orange-50 text-orange-600 rounded-xl"
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal 
        isOpen={isInvoiceModalOpen} 
        onClose={() => setIsInvoiceModalOpen(false)} 
        title={selectedSale?.source === 'formal' ? "Visualizar Fatura A4" : "Reimprimir Fatura"}
        maxWidth={selectedSale?.source === 'formal' ? "max-w-4xl" : "max-w-md"}
      >
        {selectedSale?.source === 'formal' ? (
          <CreditInvoicePreview invoice={{...selectedSale, invoice_date: selectedSale.timestamp}} establishment={establishmentInfo} />
        ) : (
          <Invoice sale={selectedSale} establishment={establishmentInfo} user={user} />
        )}
      </Modal>

      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Solicitar Nota Retificativa"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRequestNote} className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start gap-3">
            <AlertCircle size={20} className="text-orange-600 mt-0.5" />
            <div className="text-xs text-orange-800 leading-relaxed">
              Esta solicitação será enviada ao administrador para aprovação e criação da nota correspondente (Crédito ou Débito).
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRequestForm({ ...requestForm, doc_type: 'NC' })}
                className={cn(
                  "py-3 rounded-xl border font-bold text-sm transition-all",
                  requestForm.doc_type === 'NC' 
                    ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm" 
                    : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                )}
              >
                Nota de Crédito
              </button>
              <button
                type="button"
                onClick={() => setRequestForm({ ...requestForm, doc_type: 'ND' })}
                className={cn(
                  "py-3 rounded-xl border font-bold text-sm transition-all",
                  requestForm.doc_type === 'ND' 
                    ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" 
                    : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                )}
              >
                Nota de Débito
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Motivo da Solicitação</label>
              <select 
                value={requestForm.type}
                onChange={e => setRequestForm({ ...requestForm, type: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-black"
                required
              >
                {requestForm.doc_type === 'NC' ? (
                  <>
                    <option value="cancel">Anular uma venda (Fatura errada)</option>
                    <option value="reduce">Reduzir valor faturado (Desconto posterior)</option>
                    <option value="return">Devolver dinheiro/stock (Devolução de itens)</option>
                  </>
                ) : (
                  <>
                    <option value="correction">Correção de preço (Aumentar valor)</option>
                    <option value="extra">Faturação suplementar</option>
                    <option value="other">Outros motivos de débito</option>
                  </>
                )}
              </select>
            </div>

            {requestForm.type !== 'cancel' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Valor da Correção (Kz)</label>
                  <input 
                    type="number"
                    value={requestForm.amount}
                    onChange={e => setRequestForm({ ...requestForm, amount: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-black font-bold"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Valor a ser creditado ao cliente.</p>
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Observações ou Motivo</label>
              <textarea 
                value={requestForm.reason}
                onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-black min-h-[100px]"
                placeholder="Explique detalhadamente o motivo deste pedido..."
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmittingRequest}
            className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmittingRequest ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <RefreshCcw size={20} />
                Enviar Solicitação
              </>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
};

const SellerDashboard = ({ user }: { user: User }) => {
  if (!hasPermission(user, 'pos_access')) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-zinc-500 space-y-4 p-8 text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-4">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black text-zinc-900">Acesso Negado</h2>
        <p className="max-w-md">Você não tem permissão para aceder ao Painel de Vendas. Por favor, contacte o administrador para solicitar acesso.</p>
      </div>
    );
  }

  const [stats, setStats] = useState({ today: 0, last7Days: 0 });
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);

  useEffect(() => {
    const establishmentId = user.establishment_id || 1;
    fetch(`/api/seller/dashboard-stats/${user.id}`)
      .then(res => res.json())
      .then(setStats);
    
    let url = `/api/seller/active-session/${establishmentId}`;
    if (user.cash_register_id) {
      url += `?cash_register_id=${user.cash_register_id}`;
    }

    fetch(url)
      .then(res => {
        if (!res.ok) return null;
        const ct = res.headers.get("content-type");
        if (ct && ct.includes("application/json")) return res.json();
        return null;
      })
      .then(data => setHasActiveSession(!!data))
      .catch(() => setHasActiveSession(false));
  }, [user.id, user.cash_register_id]);

  return (
    <div className="space-y-6">
      {hasActiveSession === false && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between text-rose-600">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} />
            <p className="text-sm font-bold">O caixa está fechado. Abra o caixa para poder realizar vendas.</p>
          </div>
          {hasPermission(user, 'pos_open_cashier') ? (
            <button 
              onClick={() => window.location.hash = '#/seller/close'}
              className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all active:scale-95"
            >
              Abrir Caixa
            </button>
          ) : (
            <span className="text-xs font-bold bg-rose-100 px-3 py-1 rounded-lg">Aguarde Supervisor</span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Painel e Insights</h2>
          <p className="text-zinc-500">Resumo de desempenho das suas vendas.</p>
        </div>
        <div className="bg-orange-100 text-orange-600 px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2">
          <Calendar size={18} />
          {new Date().toLocaleDateString('pt-AO')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasPermission(user, 'pos_sell') ? (
          <>
            <Card className="p-8 border-zinc-100 shadow-sm rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <TrendingUp size={24} />
                </div>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full uppercase tracking-wider">Hoje</span>
              </div>
              <p className="text-orange-100 text-sm font-medium">Vendas Realizadas</p>
              <h3 className="text-4xl font-black mt-1">Kz {(stats.today || 0).toLocaleString()}</h3>
            </Card>

            <Card className="p-8 border-zinc-100 shadow-sm rounded-[2rem] bg-zinc-900 text-white border-none">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Calendar size={24} />
                </div>
                <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded-full uppercase tracking-wider">7 Dias</span>
              </div>
              <p className="text-zinc-400 text-sm font-medium">Total da Semana</p>
              <h3 className="text-4xl font-black mt-1">Kz {(stats.last7Days || 0).toLocaleString()}</h3>
            </Card>
          </>
        ) : (
          <Card className="p-8 border-zinc-100 shadow-sm rounded-[2rem] bg-zinc-50 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4 md:col-span-2">
            <div className="w-16 h-16 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900">Módulo de Vendas Restrito</h3>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
                Você tem permissão para operações de caixa, mas o acesso aos dados de vendas está restrito ao seu perfil.
              </p>
            </div>
          </Card>
        )}
      </div>

      <Card className="p-8 border-zinc-100 shadow-sm rounded-[2rem]">
        <h3 className="font-bold text-lg mb-6">Dicas de Venda</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Upselling', desc: 'Sugira complementos aos produtos principais.', icon: Plus },
            { title: 'Fidelização', desc: 'Peça o contacto para futuras promoções.', icon: Users },
            { title: 'Agilidade', desc: 'Mantenha o checkout rápido e eficiente.', icon: ShoppingCart },
          ].map((tip) => (
            <div key={tip.title} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm text-orange-500">
                <tip.icon size={20} />
              </div>
              <p className="font-bold text-sm mb-1">{tip.title}</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const SellerCashMovements = ({ user }: { user: User }) => {
  if (!hasPermission(user, 'pos_withdraw')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-black text-zinc-900">Acesso Negado</h2>
        <p className="text-zinc-500 max-w-md mx-auto mt-2">
          Você não tem permissão para acessar os movimentos de caixa.
        </p>
      </div>
    );
  }
  const [movements, setMovements] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'in' | 'out'>('in');
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);

  const fetchMovements = () => {
    fetch(`/api/seller/cash-movements/${user.id}`)
      .then(res => res.json())
      .then(setMovements);
  };

  useEffect(() => {
    const establishmentId = user.establishment_id || 1;
    fetchMovements();
    fetch(`/api/seller/active-session/${establishmentId}`)
      .then(res => {
        if (!res.ok) return null;
        const ct = res.headers.get("content-type");
        if (ct && ct.includes("application/json")) return res.json();
        return null;
      })
      .then(data => setHasActiveSession(!!data))
      .catch(() => setHasActiveSession(false));
  }, [user.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasPermission(user, 'pos_withdraw')) {
      alert('Você não tem permissão para registar movimentos de caixa.');
      return;
    }
    if (hasActiveSession === false) {
      alert('O caixa deve estar aberto para registar movimentos.');
      return;
    }
    const establishmentId = user.establishment_id || 1;
    const res = await fetch('/api/seller/cash-movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        establishment_id: establishmentId,
        seller_id: user.id,
        cash_register_id: user.cash_register_id,
        type,
        amount: parseFloat(amount),
        description
      })
    });
    if (res.ok) {
      setAmount('');
      setDescription('');
      fetchMovements();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Movimentos de Caixa</h2>
        <p className="text-zinc-500">Registe entradas e saídas de valores do caixa.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 p-6 border-zinc-100 shadow-sm rounded-[2rem]">
          <h3 className="font-bold text-lg mb-6">Novo Movimento</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex p-1 bg-zinc-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType('in')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                  type === 'in' ? "bg-orange-500 text-white shadow-md" : "bg-white text-zinc-500"
                )}
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setType('out')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                  type === 'out' ? "bg-orange-500 text-white shadow-md" : "bg-white text-zinc-500"
                )}
              >
                Saída
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Valor (Kz)</label>
              <input
                type="number"
                required
                value={isNaN(Number(amount)) ? '' : amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Descrição / Motivo</label>
              <textarea
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Troco inicial, Pagamento fornecedor..."
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm h-24 resize-none"
              />
            </div>

            <button
              type="submit"
              className={cn(
                "w-full py-4 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
              )}
            >
              Registar {type === 'in' ? 'Entrada' : 'Saída'}
            </button>
          </form>
        </Card>

        <Card className="lg:col-span-2 border-zinc-100 shadow-sm rounded-[2rem] overflow-hidden">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
            <h3 className="font-bold text-lg">Movimentos Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Data/Hora</th>
                  <th className="px-6 py-4 font-bold">Tipo</th>
                  <th className="px-6 py-4 font-bold">Descrição</th>
                  <th className="px-6 py-4 font-bold text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 text-sm">
                      Nenhum movimento registado hoje.
                    </td>
                  </tr>
                ) : (
                  movements.map(m => (
                    <tr key={`cash-move-${m.id}`} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 text-xs text-zinc-500">
                        {new Date(m.timestamp).toLocaleString('pt-AO')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-black uppercase",
                          m.type === 'in' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                        )}>
                          {m.type === 'in' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-zinc-700 truncate max-w-[200px]">
                        {m.description}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-black text-right",
                        m.type === 'in' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {m.type === 'in' ? '+' : '-'} Kz {(m.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

const SellerCloseCashier = ({ user, onUpdate }: { user: User, onUpdate: (u: User) => void }) => {
  if (!hasPermission(user, 'pos_close_cashier')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-black text-zinc-900">Acesso Negado</h2>
        <p className="text-zinc-500 max-w-md mx-auto mt-2">
          Você não tem permissão para fechar o caixa.
        </p>
      </div>
    );
  }
  const [session, setSession] = useState<any>(null);
  const [physicalAmount, setPhysicalAmount] = useState('');
  const [openingAmounts, setOpeningAmounts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>(user.cash_register_id?.toString() || '');

  const [searchParams] = useSearchParams();
  const queryEstablishmentId = searchParams.get('establishmentId');
  const queryRegisterId = searchParams.get('registerId');

  const fetchSession = async () => {
    setLoading(true);
    const establishmentId = queryEstablishmentId || user.establishment_id || 1;
    const registerId = queryRegisterId || selectedRegisterId || user.cash_register_id;
    
    if (!registerId) {
      setSession(null);
      setLoading(false);
      return null;
    }

    let url = `/api/seller/active-session/${establishmentId}?cash_register_id=${registerId}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        setSession(null);
        setLoading(false);
        return null;
      }
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setSession(data);
        setLoading(false);
        return data;
      } else {
        setSession(null);
        setLoading(false);
        return null;
      }
    } catch (error: any) {
      const isParseError = error instanceof SyntaxError || error.message?.includes('Unexpected token') || error.message?.includes('valid JSON');
      if (!isParseError) {
        console.error("Error fetching session:", error);
      }
      setLoading(false);
      return null;
    }
  };

  const fetchRegisters = () => {
    const establishmentId = user.establishment_id || 1;
    fetch(`/api/owner/establishments/${establishmentId}/cash-registers`)
      .then(res => res.json())
      .then(setCashRegisters);
  };

  useEffect(() => {
    fetchSession();
    fetchRegisters();
  }, [user.establishment_id, selectedRegisterId]);

  const handleSelectRegister = async (registerId: number) => {
    const res = await fetch('/api/seller/select-register', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, cash_register_id: registerId })
    });
    if (res.ok) {
      onUpdate({ ...user, cash_register_id: registerId });
      setSelectedRegisterId(registerId.toString());
    }
  };

  const handleOpenSession = async (e: FormEvent, registerId: number, amount: string) => {
    e.preventDefault();
    if (!hasPermission(user, 'pos_open_cashier')) {
      alert('Você não tem permissão para abrir o caixa.');
      return;
    }

    if (!amount || isNaN(parseFloat(amount))) {
      alert('Por favor, insira um valor de abertura válido.');
      return;
    }

    const establishmentId = user.establishment_id || 1;
    
    try {
      const res = await fetch('/api/seller/open-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishment_id: establishmentId,
          seller_id: user.id,
          cash_register_id: registerId,
          opening_amount: parseFloat(amount)
        })
      });

      if (res.ok) {
        setOpeningAmounts(prev => ({ ...prev, [registerId]: '' }));
        // First select the register to update global state
        await handleSelectRegister(registerId);
        // Then explicitly fetch the session to update local state immediately
        await fetchSession();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao abrir caixa.');
      }
    } catch (error) {
      console.error("Error opening session:", error);
      alert('Erro de conexão ao abrir caixa.');
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    if (!hasPermission(user, 'pos_close_cashier')) {
      alert('Você não tem permissão para fechar o caixa.');
      return;
    }

    if (user.role !== 'owner' && session.seller_id !== user.id) {
      alert('Apenas o funcionário que abriu este caixa ou o proprietário podem fechá-lo.');
      return;
    }

    try {
      const res = await fetch('/api/seller/close-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          physical_amount: parseFloat(physicalAmount),
          closing_amount: session.totals.expected,
          seller_id: user.id
        })
      });

      if (res.ok) {
        setPhysicalAmount('');
        await fetchSession();
        await fetchRegisters();
        alert('Caixa fechado com sucesso!');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao fechar caixa.');
      }
    } catch (error) {
      console.error("Error closing session:", error);
      alert('Erro de conexão ao fechar caixa.');
    }
  };

  if (loading) return <div className="p-12 text-center text-zinc-400">Carregando sessão...</div>;

  if (!session) {
    const userHasOpenSession = cashRegisters.some(r => r.session_status === 'open' && r.seller_id === user.id);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Seleccionar Caixa</h2>
            <p className="text-zinc-500">
              Escolha um caixa aberto ou abra um novo se tiver permissão.
              {userHasOpenSession && (
                <span className="block mt-1 text-rose-500 font-bold text-sm">
                  Você já possui um caixa aberto. Feche-o antes de abrir outro.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cashRegisters.map(register => {
            const isOpenedByMe = register.session_status === 'open' && register.seller_id === user.id;
            const isOpenedByOthers = register.session_status === 'open' && register.seller_id !== user.id;

            return (
              <Card key={`close-reg-pos-${register.id}`} className="p-6 border-zinc-100 shadow-sm rounded-3xl hover:border-orange-200 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    register.session_status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                  )}>
                    <Wallet size={24} />
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                    register.session_status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                  )}>
                    {register.session_status === 'open' ? 'Aberto' : 'Fechado'}
                  </div>
                </div>
                
                <h3 className="font-bold text-lg mb-1">{register.name}</h3>
                <p className="text-xs text-zinc-400 mb-6">Código: {register.code}</p>

                {register.session_status === 'open' ? (
                  <div className="space-y-2">
                    {isOpenedByOthers && (
                      <p className="text-[10px] text-center font-bold text-zinc-400 uppercase mb-1">Ocupado</p>
                    )}
                    <button
                      onClick={() => handleSelectRegister(register.id)}
                      className={cn(
                        "w-full py-3 rounded-xl font-bold transition-all active:scale-95",
                        isOpenedByMe ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                      )}
                    >
                      {isOpenedByMe ? 'Fechar Meu Caixa' : (user.role === 'owner' && hasPermission(user, 'pos_close_cashier') ? 'Fechar Caixa' : 'Entrar no Caixa')}
                    </button>
                  </div>
                ) : hasPermission(user, 'pos_open_cashier') ? (
                  <div className="space-y-3">
                    {userHasOpenSession ? (
                      <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-center">
                        <Lock size={20} className="mx-auto mb-2 text-rose-400" />
                        <p className="text-xs font-black text-rose-600 uppercase">Bloqueado</p>
                      </div>
                    ) : (
                      <>
                        <input
                          type="number"
                          placeholder="Valor de Abertura"
                          value={isNaN(Number(openingAmounts[register.id])) ? '' : openingAmounts[register.id]}
                          onChange={e => {
                            setOpeningAmounts(prev => ({ ...prev, [register.id]: e.target.value }));
                          }}
                          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm"
                        />
                        <button
                          onClick={(e) => handleOpenSession(e, register.id, openingAmounts[register.id] || '')}
                          className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-100"
                        >
                          Abrir Caixa
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-center">
                    <Lock size={20} className="mx-auto mb-2 text-rose-400" />
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Caixa Fechado</p>
                    <p className="text-[10px] text-rose-400 mt-1">Aguarde a abertura por um supervisor.</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const diff = parseFloat(physicalAmount || '0') - session.totals.expected;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fechar Caixa</h2>
          <p className="text-zinc-500">Sessão iniciada em {new Date(session.opening_time).toLocaleString('pt-AO')}</p>
        </div>
        <div className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-full text-xs font-black flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          CAIXA ABERTO
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Abertura', val: session.opening_amount || 0, color: 'text-zinc-600' },
            { label: 'Vendas', val: session.totals.sales || 0, color: 'text-emerald-600' },
            { label: 'Entradas', val: session.totals.in || 0, color: 'text-emerald-600' },
            { label: 'Saídas', val: session.totals.out || 0, color: 'text-rose-600' },
          ].map((item) => (
            <Card key={item.label} className="p-4 border-zinc-100 shadow-sm rounded-2xl">
            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{item.label}</p>
            <p className={cn("text-lg font-black", item.color)}>Kz {item.val.toLocaleString()}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-8 border-zinc-100 shadow-sm rounded-[2rem] bg-zinc-50">
          <h3 className="font-bold text-lg mb-6">Resumo de Saldo</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Saldo Esperado</span>
              <span className="text-2xl font-black text-zinc-900">Kz {(session.totals.expected || 0).toLocaleString()}</span>
            </div>
            
            <div className="space-y-2 pt-4">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Valor Físico em Caixa</label>
              <input
                type="number"
                value={isNaN(Number(physicalAmount)) ? '' : physicalAmount}
                onChange={e => setPhysicalAmount(e.target.value)}
                placeholder="Informe o valor contado..."
                className="w-full px-6 py-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-black text-2xl"
              />
            </div>

            {physicalAmount && (
              <div className={cn(
                "p-4 rounded-2xl flex items-center justify-between",
                diff === 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}>
                <span className="text-sm font-bold">{diff === 0 ? 'Caixa Conferido' : 'Diferença de Caixa'}</span>
                <span className="font-black">Kz {(diff || 0).toLocaleString()}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-8 border-zinc-100 shadow-sm rounded-[2rem] flex flex-col justify-center text-center space-y-6">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Lock size={32} />
          </div>
          <div>
            <h4 className="font-bold text-xl mb-2">Encerrar Operações</h4>
            <p className="text-sm text-zinc-500">Ao fechar o caixa, você não poderá realizar novas vendas nesta sessão.</p>
          </div>
          {hasPermission(user, 'pos_close_cashier') && (user.role === 'owner' || session.seller_id === user.id) ? (
            <button
              onClick={handleCloseSession}
              disabled={!physicalAmount}
              className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg hover:bg-orange-600 transition-all active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed shadow-lg shadow-orange-100"
            >
              Fechar Caixa Agora
            </button>
          ) : (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-center">
              <Lock size={20} className="mx-auto mb-2 text-rose-400" />
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Sem Permissão</p>
              <p className="text-[10px] text-rose-400 mt-1">Apenas o funcionário que abriu este caixa ou o proprietário podem fechá-lo.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const SellerSettings = ({ user, onUpdate, onLogout }: { user: User, onUpdate: (u: User) => void, onLogout: () => void }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    username: user.username || '',
    password: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert("As senhas não coincidem");
      return;
    }
    setIsSaving(true);
    try {
      const dataToSave = { ...formData, username: formData.username.trim() };
      const res = await fetch(`/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      if (res.ok) {
        const updatedUser = { ...user, username: dataToSave.username };
        onUpdate(updatedUser);
        alert("Perfil actualizado com sucesso!");
        setIsPasswordModalOpen(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Configurações</h2>
        <p className="text-zinc-500">Gerencie sua conta e preferências de vendedor.</p>
      </div>

      <div className="space-y-4">
        <Card className="p-6 border-zinc-100 shadow-sm rounded-2xl hover:border-orange-200 transition-colors cursor-pointer group" onClick={() => setIsPasswordModalOpen(true)}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <LockIcon size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-zinc-800">Alterar Palavra-passe</h4>
              <p className="text-xs text-zinc-500">Mantenha sua conta segura trocando sua senha regularmente.</p>
            </div>
            <ChevronRight size={20} className="text-zinc-300" />
          </div>
        </Card>

        <Card className="p-6 border-zinc-100 shadow-sm rounded-2xl hover:border-orange-200 transition-colors cursor-pointer group" onClick={() => setIsAboutModalOpen(true)}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-50 text-zinc-600 rounded-xl group-hover:bg-zinc-900 group-hover:text-white transition-colors">
              <Info size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-zinc-800">Sobre o Fatu-R</h4>
              <p className="text-xs text-zinc-500">Produtor: Lazivânio Mulaza - Versão 1.0.5</p>
            </div>
            <ChevronRight size={20} className="text-zinc-300" />
          </div>
        </Card>

        <Card className="p-6 border-zinc-100 shadow-sm rounded-2xl bg-rose-50 border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer group" onClick={() => setIsLogoutModalOpen(true)}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white text-rose-600 rounded-xl shadow-sm">
              <LogOut size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-rose-900">Terminar Sessão</h4>
              <p className="text-xs text-rose-600/70">Sair da sua conta de vendedor com segurança.</p>
            </div>
          </div>
        </Card>
      </div>

      <Modal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        title="Configurações da Conta"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome de Utilizador</label>
              <input 
                type="text" 
                required
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nova Palavra-passe (Opcional)</label>
              <input 
                type="password" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder="Deixe em branco para manter"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Confirmar Palavra-passe</label>
              <input 
                type="password" 
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Actualizar Palavra-passe'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} title="Sobre o Fatu-R">
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-20 h-20 bg-black text-orange-500 rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-orange-500/10 scale-110">
              <Zap size={40} className="fill-orange-500" />
            </div>
            <h3 className="text-3xl font-black text-zinc-900 tracking-tighter">Fatu-R</h3>
            <p className="text-sm font-bold text-orange-600 uppercase tracking-[0.2em] mt-1">Smart Billing System</p>
          </div>

          <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200/60">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Produtor</span>
              <span className="text-sm font-bold text-zinc-900">Lazivânio Mulaza</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200/60">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Validação AGT</span>
              <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Certificado № 274/AGT/2026</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Versão do Sistema</span>
              <span className="text-sm font-bold text-zinc-900">v1.0.5 POS-Expert</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Atributos do Sistema</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl flex flex-col gap-2">
                <ShieldCheck size={24} className="text-orange-600" />
                <span className="text-xs font-bold text-orange-900">Segurança Total</span>
                <p className="text-[10px] text-orange-600 font-medium">Dados encriptados e auditoria completa.</p>
              </div>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col gap-2">
                <Zap size={24} className="text-orange-400" />
                <span className="text-xs font-bold text-white">Alta Performance</span>
                <p className="text-[10px] text-zinc-400 font-medium">Resposta em milissegundos mesmo ऑफलाइन.</p>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl flex flex-col gap-2 col-span-2">
                <div className="flex items-center gap-2">
                  <Database size={20} className="text-zinc-600" />
                  <span className="text-xs font-bold text-zinc-900">Faturação Multimoeda Inteligente</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-medium">Converta valores em tempo real e emita faturas em múltiplas moedas com total conformidade fiscal.</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-center text-zinc-400 font-medium italic">
            © 2026 Fatu-R. Todos os direitos reservados. Desenvolvido para simplificar a gestão do seu negócio.
          </p>
        </div>
      </Modal>

      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} title="Terminar Sessão">
        <div className="space-y-6">
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-white text-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/10 border border-rose-200">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-rose-900 tracking-tighter">Tem a certeza?</h3>
              <p className="text-sm text-rose-600 font-medium mt-1">
                Todas as alterações não guardadas no carrinho podem ser perdidas. Certifique-se de que fechou o seu turno se necessário.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsLogoutModalOpen(false)}
              className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={onLogout}
              className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
            >
              Sim, Sair
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// --- Main App ---

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const generateProformaPDF = async (proforma: any, establishment: any, user: any) => {
  if (!establishment) {
    console.error('Establishment info missing for PDF generation');
    return;
  }
  const doc = new jsPDF();
  const orange = [249, 115, 22]; // #f97316
  const black = [0, 0, 0];
  const white = [255, 255, 255];
  const zinc400 = [161, 161, 170];
  const zinc500 = [113, 113, 122];

  // Parse items and bank accounts
  let items = [];
  try {
    items = typeof proforma.items === 'string' 
      ? JSON.parse(proforma.items) 
      : proforma.items || [];
  } catch (e) {
    console.error('Error parsing proforma items:', e);
    items = [];
  }
    
  let bankAccounts = [];
  try {
    bankAccounts = typeof proforma.bank_accounts === 'string' 
      ? JSON.parse(proforma.bank_accounts) 
      : proforma.bank_accounts || [];
  } catch (e) {
    console.error('Error parsing bank accounts:', e);
    bankAccounts = [];
  }

  // Background accent (top orange bar)
  doc.setFillColor(orange[0], orange[1], orange[2]);
  doc.rect(0, 0, 210, 5, 'F');
  
  // Top left: Logo
  if (establishment.logo_url) {
    try {
      const imgData = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            reject(new Error('Canvas context error'));
          }
        };
        img.onerror = () => reject(new Error('Image load error'));
        img.src = establishment.logo_url;
      });
      doc.addImage(imgData, 'PNG', 20, 15, 25, 25);
    } catch (e) {
      console.error('Error loading logo for PDF:', e);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(orange[0], orange[1], orange[2]);
      doc.text(establishment.name.substring(0, 1).toUpperCase(), 25, 35);
    }
  } else {
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text(establishment.name.substring(0, 1).toUpperCase(), 25, 35);
  }

  // Top right: Establishment details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text(establishment.name.toUpperCase(), 190, 20, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(zinc500[0], zinc500[1], zinc500[2]);
  doc.text(`NIF: ${establishment.nif || '---'}`, 190, 26, { align: 'right' });
  doc.text(`TEL: ${establishment.phone || '---'}`, 190, 31, { align: 'right' });
  doc.text(`EMAIL: ${establishment.email || '---'}`, 190, 36, { align: 'right' });
  
  const splitAddress = doc.splitTextToSize(establishment.address || '---', 60);
  doc.text(splitAddress, 190, 41, { align: 'right' });

  // Title Section
  doc.setFillColor(black[0], black[1], black[2]);
  doc.rect(20, 60, 170, 15, 'F');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(white[0], white[1], white[2]);
  doc.text('FATURA PROFORMA', 105, 70, { align: 'center' });

  // Document Info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text(`Nº DOCUMENTO:`, 20, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(proforma.invoice_number || 'PF-' + Date.now().toString().slice(-6), 55, 85);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`DATA EMISSÃO:`, 20, 90);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString(), 55, 90);

  // Client info box
  doc.setDrawColor(zinc400[0], zinc400[1], zinc400[2]);
  doc.setLineWidth(0.1);
  doc.roundedRect(20, 100, 170, 30, 3, 3, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('DADOS DO CLIENTE', 25, 106);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text((proforma.client_name || 'Consumidor Final').toUpperCase(), 25, 113);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(zinc500[0], zinc500[1], zinc500[2]);
  doc.text(`NIF: ${proforma.client_nif || 'CONSUMIDOR FINAL'}`, 25, 119);
  doc.text(`ENDEREÇO: ${proforma.client_address || 'N/A'}`, 25, 124);

  // Table
  const tableData = items.map((item: any, index: number) => [
    index + 1,
    item.name,
    item.quantity,
    `Kz ${item.price.toLocaleString()}`,
    `Kz ${(item.price * item.quantity).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 140,
    head: [['Nº', 'DESCRIÇÃO DO PRODUTO', 'QTD', 'PREÇO UNIT.', 'TOTAL']],
    body: tableData,
    theme: 'striped',
    headStyles: { 
      fillColor: [249, 115, 22], // orange-500
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 }
    },
    styles: { 
      fontSize: 8,
      cellPadding: 4,
      lineColor: [244, 244, 245], // zinc-100
      lineWidth: 0.1
    },
    margin: { left: 20, right: 20 }
  });

  // Totals
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  const pageHeight = doc.internal.pageSize.height;
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const iva = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity * ((item.tax_percentage || 0) / 100)), 0);
  const total = subtotal + iva;

  // Check if totals and bank details fit on the current page
  // We need about 90mm of space for totals + bank details to be safe
  // If we have 5 or fewer items, we try to keep it on one page by reducing the threshold slightly
  const footerThreshold = items.length <= 5 ? 80 : 100;
  if (finalY > pageHeight - footerThreshold) {
    doc.addPage();
    // Header for continuation
    doc.setFillColor(orange[0], orange[1], orange[2]);
    doc.rect(0, 0, 210, 5, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(`${establishment.name.toUpperCase()} - PROFORMA Nº ${proforma.invoice_number || ''} (CONTINUAÇÃO)`, 20, 15);
    finalY = 30;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(zinc500[0], zinc500[1], zinc500[2]);
  doc.text(`SUBTOTAL:`, 140, finalY);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text(`Kz ${subtotal.toLocaleString()}`, 190, finalY, { align: 'right' });
  
  doc.setTextColor(zinc500[0], zinc500[1], zinc500[2]);
  doc.text(`IVA (${items?.[0]?.tax_percentage || 0}%):`, 140, finalY + 7);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text(`Kz ${iva.toLocaleString()}`, 190, finalY + 7, { align: 'right' });
  
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(0.5);
  doc.line(140, finalY + 10, 190, finalY + 10);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text(`TOTAL GERAL:`, 140, finalY + 18);
  doc.text(`Kz ${total.toLocaleString()}`, 190, finalY + 18, { align: 'right' });

  // Footer: Bank details
  // Orange footer bar
  doc.setFillColor(orange[0], orange[1], orange[2]);
  doc.rect(0, pageHeight - 1, 210, 1, 'F');

  // Determine dynamic Y position for bank details
  // If we are on a new page, we can place them after the totals
  // If we are on the same page, we keep them at the bottom but ensure no collision
  let currentY = Math.max(finalY + 30, pageHeight - 45);

  // Draw a separator line before bank accounts
  doc.setDrawColor(zinc400[0], zinc400[1], zinc400[2]);
  doc.setLineWidth(0.1);
  doc.line(20, currentY - 5, 190, currentY - 5);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text('COORDENADAS BANCÁRIAS', 105, currentY, { align: 'center' });
  currentY += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(zinc500[0], zinc500[1], zinc500[2]);

  if (bankAccounts.length > 0) {
    bankAccounts.forEach((acc: any) => {
      const text = `${acc.bank_name}: ${acc.iban}${acc.account_number ? ` (${acc.account_number})` : ''}`;
      doc.text(text, 105, currentY, { align: 'center' });
      currentY += 5;
    });
  } else {
    doc.text('Nenhuma coordenada bancária disponível.', 105, currentY, { align: 'center' });
  }

  doc.setFontSize(7);
  doc.text(`Emitido por: ${user.name} • Software Fatu-R`, 105, pageHeight - 10, { align: 'center' });

  // Save and Print
  const safeClientName = (proforma.client_name || 'CLIENTE').replace(/\s+/g, '_');
  const fileName = `PROFORMA_${safeClientName}_${Date.now()}.pdf`;
  doc.save(fileName);
  
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleUpdateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    if (user && user.role !== 'admin' && user.role !== 'owner') {
      try {
        fetch('/api/attendance/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
      } catch (e) {}
    }
    setUser(null);
    localStorage.removeItem('user');
  };

  // Add global handler for components that need logout
  useEffect(() => {
    (window as any).handleGlobalLogout = handleLogout;
    return () => {
      delete (window as any).handleGlobalLogout;
    };
  }, [handleLogout]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      const checkStatus = async (signal: AbortSignal) => {
        try {
          const res = await fetch(`/api/user-status/${user.id}`, { signal });
          if (res.status === 403) {
            handleLogout();
            return;
          }
          
          if (res.ok) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const data = await res.json();
              setUser(prev => {
                if (!prev || prev.id !== data.id) return prev;
                const newFiscalRegime = data.fiscal_regime || prev.fiscal_regime || 'geral';
                const newBillingMode = data.billing_mode || prev.billing_mode || 'tradicional';
                if (newFiscalRegime !== prev.fiscal_regime || newBillingMode !== prev.billing_mode || data.status !== prev.status) {
                  const updated = { ...prev, fiscal_regime: newFiscalRegime, billing_mode: newBillingMode, status: data.status };
                  localStorage.setItem('user', JSON.stringify(updated));
                  return updated;
                }
                return prev;
              });
            } else {
              const text = await res.text();
              console.warn("User status check returned non-JSON response:", text.substring(0, 100));
            }
          }
        } catch (e: any) {
          if (e.name === 'AbortError') return;
          // Suppress common network errors during dev server restarts or offline state
          const isNetworkError = 
            e instanceof TypeError || 
            e.message?.toLowerCase().includes('fetch') || 
            e.message?.toLowerCase().includes('network') ||
            e.message?.toLowerCase().includes('load failed');
            
          if (!isNetworkError) {
            console.error("Error checking user status:", e);
          }
        }
      };
      
      const controller = new AbortController();
      checkStatus(controller.signal);
      const interval = setInterval(() => checkStatus(controller.signal), 60000); // Check every minute
      return () => {
        clearInterval(interval);
        controller.abort();
      };
    }
  }, [user?.id]); // Only re-run if the user ID changes (login/logout)

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      {user.role === 'admin' ? (
        <Routes>
          <Route path="/admin" element={<AdminPanel user={user} onLogout={handleLogout} />} />
          <Route path="/admin/reliability" element={<AdminReliability />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      ) : (
        <DashboardLayout user={user} onLogout={handleLogout}>
          <Routes>
            {user.role === 'owner' && (
              <>
                <Route path="/owner" element={<OwnerOverview user={user} />} />
                <Route path="/owner/establishments" element={<MyEstablishments user={user} />} />
                <Route path="/owner/establishments/:establishmentId" element={<EstablishmentAdmin user={user} />} />
                <Route path="/owner/partners" element={<OwnerPartners user={user} />} />
                <Route path="/owner/purchases" element={<OwnerPurchases user={user} />} />
                <Route path="/owner/services" element={<OwnerServices user={user} />} />
                <Route path="/owner/documents" element={<OwnerFiscalDocuments user={user} />} />
                <Route path="/owner/warehouses" element={<OwnerWarehouses user={user} />} />
                <Route path="/owner/finance" element={<OwnerFinance user={user} />} />
                <Route path="/owner/rh" element={<OwnerRH user={user} />} />
                <Route path="/owner/reports" element={<OwnerReports user = {user} />} />
                <Route path="/owner/currencies" element={<OwnerCurrencies user={user} />} />
                <Route path="/owner/settings" element={<OwnerSettings user={user} onUpdateUser={handleUpdateUser} />} />
                <Route path="*" element={<Navigate to="/owner" replace />} />
              </>
            )}
            {(user.role === 'seller' || user.role === 'owner' || user.role === 'manager') && (
              <Route path="/seller/close" element={<SellerCloseCashier user={user} onUpdate={setUser} />} />
            )}
            {(user.role === 'seller' || user.role === 'owner' || user.role === 'manager') && (
              <>
                <Route path="/seller" element={<SellerPOS user={user} onUpdate={setUser} />} />
                <Route path="/seller/dashboard" element={<SellerDashboard user={user} />} />
                <Route path="/seller/rh" element={<OwnerRH user={user} />} />
                <Route path="/seller/movements" element={<SellerCashMovements user={user} />} />
                <Route path="/seller/history" element={<SellerHistory user={user} />} />
                <Route path="/seller/settings" element={<SellerSettings user={user} onUpdate={handleLogin} onLogout={handleLogout} />} />
                <Route path="*" element={<Navigate to="/seller" replace />} />
              </>
            )}
            {user.role === 'manager' && (
              <>
                <Route path="/manager" element={<OwnerOverview user={user} />} />
                <Route path="/manager/establishments" element={
                  user.role === 'manager' && user.establishment_id ? 
                  <Navigate to={`/manager/establishments/${user.establishment_id}`} replace /> : 
                  <MyEstablishments user={user} />
                } />
                <Route path="/manager/establishments/:establishmentId" element={<EstablishmentAdmin user={user} />} />
                <Route path="/manager/rh" element={<OwnerRH user={user} />} />
                <Route path="/manager/purchases" element={<OwnerPurchases user={user} />} />
                <Route path="/manager/partners" element={<OwnerPartners user={user} />} />
                <Route path="/manager/services" element={<OwnerServices user={user} />} />
                <Route path="/manager/documents" element={<OwnerFiscalDocuments user={user} />} />
                <Route path="/manager/warehouses" element={<OwnerWarehouses user={user} />} />
                <Route path="/manager/finance" element={<OwnerFinance user={user} />} />
                <Route path="/manager/reports" element={<OwnerReports user={user} />} />
                <Route path="/manager/settings" element={<OwnerSettings user={user} onUpdateUser={handleUpdateUser} />} />
                <Route path="*" element={<Navigate to="/manager" replace />} />
              </>
            )}
            <Route path="/" element={<Navigate to={`/${user.role}`} replace />} />
          </Routes>
        </DashboardLayout>
      )}
    </Router>
  );
}
