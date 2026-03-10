import { useState, useEffect, ReactNode, FormEvent } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
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
  Package, 
  LogOut, 
  Settings, 
  CreditCard, 
  TrendingUp,
  Sparkles,
  Search,
  Plus,
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
  ArrowRightLeft,
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
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { User, Store as StoreType, Product, Transaction } from './types';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

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

const Card = ({ children, className, ...props }: { children: ReactNode, className?: string, [key: string]: any }) => (
  <div {...props} className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

const StatCard = ({ label, value, icon: Icon, trend, color = "blue" }: { label: string, value: string | number, icon: any, trend?: string, color?: string }) => (
  <Card className="p-6">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-bold mt-1">{value}</h3>
        {trend && (
          <p className={cn("text-xs mt-2 flex items-center gap-1", trend.startsWith('+') ? "text-emerald-600" : "text-rose-600")}>
            <TrendingUp size={12} />
            {trend} em relação ao mês passado
          </p>
        )}
      </div>
      <div className={cn("p-3 rounded-xl", {
        "bg-blue-50 text-blue-600": color === "blue",
        "bg-emerald-50 text-emerald-600": color === "emerald",
        "bg-amber-50 text-amber-600": color === "amber",
        "bg-rose-50 text-rose-600": color === "rose",
      })}>
        <Icon size={24} />
      </div>
    </div>
  </Card>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: ReactNode }) => (
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
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// --- Admin Panel ---

const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [email, setEmail] = useState('owner@factu.com');
  const [password, setPassword] = useState('owner');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        setError('Credenciais inválidas');
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
            <CreditCard size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">FactuModern</h1>
          <p className="text-zinc-500 mt-2">Sistema de Faturação Eletrônica</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all"
                placeholder="exemplo@factu.com"
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
            <p className="text-xs text-zinc-400">Dica: Use admin@factu.com / admin, owner@factu.com / owner ou seller@factu.com / seller</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

// --- Layout ---

const DashboardLayout = ({ user, onLogout, children }: { user: User, onLogout: () => void, children: ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 transition-transform duration-300 lg:relative lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 px-4 py-6 mb-4">
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">FactuModern</span>
          </div>

          <nav className="flex-1 space-y-1">
            {user.role === 'admin' && (
              <>
                <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/admin" />
                <SidebarItem icon={Store} label="Lojas" to="/admin/stores" />
                <SidebarItem icon={Users} label="Clientes" to="/admin/clients" />
                <SidebarItem icon={CreditCard} label="Pagamentos" to="/admin/payments" />
                <SidebarItem icon={Settings} label="Configurações" to="/admin/settings" />
              </>
            )}
            {user.role === 'owner' && (
              <>
                <SidebarItem icon={LayoutDashboard} label="Visão Geral" to="/owner" />
                <SidebarItem icon={Store} label="Minhas Lojas" to="/owner/stores" />
                <SidebarItem icon={TrendingUp} label="Relatórios" to="/owner/reports" />
                <SidebarItem icon={Settings} label="Configurações" to="/owner/settings" />
              </>
            )}
            {user.role === 'seller' && (
              <>
                <SidebarItem icon={LayoutDashboard} label="Painel e Insights" to="/seller/dashboard" />
                <SidebarItem icon={ShoppingCart} label="Vendas (PDV)" to="/seller" />
                <SidebarItem icon={Wallet} label="Movimentos" to="/seller/movements" />
                <SidebarItem icon={Lock} label="Fechar Caixa" to="/seller/close" />
                <SidebarItem icon={History} label="Histórico" to="/seller/history" />
                <SidebarItem icon={Settings} label="Configurações" to="/seller/settings" />
              </>
            )}
          </nav>

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
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-zinc-500">
            <Menu size={24} />
          </button>
          <div className="flex-1 px-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="w-full pl-10 pr-4 py-2 bg-zinc-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-black outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600">
              <Calendar size={18} />
            </div>
            <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600">
              <Settings size={18} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
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
  const [dashboardData, setDashboardData] = useState<any>({
    stats: { totalClients: 0, activeClients: 0, totalStores: 0, pendingSupport: 0, expiredLicenses: 0, expiringSoon: 0 },
    recentClients: []
  });
  const [clients, setClients] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [monitoring, setMonitoring] = useState<any>({
    stats: { totalTransactions: 0, todayTransactions: 0, activeUsers: 0, totalStores: 0 },
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
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

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
    plan_type: 'basic',
    duration_months: 1,
    store_id: ''
  });

  // Settings States
  const [systemSettings, setSystemSettings] = useState<any>({
    expiration_notice: 'true',
    weekly_reports: 'false',
    system_name: 'FactuModern'
  });
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    price: 0,
    max_stores: 1,
    max_products: 100,
    features: { reports: true, multi_store: false }
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
        '/api/admin/finance'
      ];

      const responses = await Promise.all(endpoints.map(url => fetch(url)));
      
      const failed = responses.find(r => !r.ok);
      if (failed) {
        throw new Error(`Failed to fetch ${failed.url}: ${failed.statusText}`);
      }

      const [dashData, clientsData, licensesData, ticketsData, monitoringData, plansData, reportsData, settingsData, financeData] = await Promise.all(
        responses.map(r => r.json())
      );

      setDashboardData(dashData);
      setClients(clientsData);
      setLicenses(licensesData);
      setTickets(ticketsData);
      setMonitoring(monitoringData);
      setPlans(plansData);
      setReportsData(reportsData);
      setSystemSettings(settingsData);
      setFinanceData(financeData);
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

  const handleManageLicense = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + Number(licenseFormData.duration_months));
      
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedClient.id,
          store_id: licenseFormData.store_id || null,
          plan_type: licenseFormData.plan_type,
          start_date: new Date().toISOString().split('T')[0],
          expiry_date: expiry.toISOString().split('T')[0],
          features: { max_stores: 5, max_products: 1000 } // Default for now
        })
      });
      if (!res.ok) throw new Error("Failed to manage license");
      setIsLicenseModalOpen(false);
      fetchData();
      if (isClientDetailsOpen) fetchClientDetails(selectedClient.id);
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

  const handleSavePlan = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedPlan ? `/api/admin/plans/${selectedPlan.id}` : '/api/admin/plans';
      const method = selectedPlan ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planFormData)
      });
      if (!res.ok) throw new Error("Failed to save plan");
      setIsPlanModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete plan");
      fetchData();
    } catch (e) {
      console.error(e);
    }
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
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="font-black text-lg leading-none">ADMIN</h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Platform Master</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'dashboard' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <LayoutDashboard size={20} />
            <span className="font-bold text-sm">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('clients')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'clients' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <Users size={20} />
            <span className="font-bold text-sm">Clientes</span>
          </button>
          <button 
            onClick={() => setActiveTab('finance')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'finance' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <Wallet size={20} />
            <span className="font-bold text-sm">Financeiro</span>
          </button>
          <button 
            onClick={() => setActiveTab('licenses')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'licenses' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <CreditCard size={20} />
            <span className="font-bold text-sm">Licenças</span>
          </button>
          <button 
            onClick={() => setActiveTab('support')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'support' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <LifeBuoy size={20} />
            <span className="font-bold text-sm">Suporte</span>
          </button>
          <button 
            onClick={() => setActiveTab('monitoring')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'monitoring' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <Monitor size={20} />
            <span className="font-bold text-sm">Monitoramento</span>
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'reports' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <FilePieChart size={20} />
            <span className="font-bold text-sm">Relatórios</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", activeTab === 'settings' ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <Settings2 size={20} />
            <span className="font-bold text-sm">Configurações</span>
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
            <button onClick={onLogout} className="text-zinc-400 hover:text-rose-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-20 bg-white border-b border-zinc-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black">
              {activeTab === 'dashboard' && 'Visão Geral da Plataforma'}
              {activeTab === 'clients' && 'Gestão de Clientes'}
              {activeTab === 'finance' && 'Gestão Financeira'}
              {activeTab === 'licenses' && 'Controle de Licenças'}
              {activeTab === 'support' && 'Centro de Suporte'}
              {activeTab === 'monitoring' && 'Monitoramento do Sistema'}
              {activeTab === 'reports' && 'Relatórios de Uso'}
              {activeTab === 'settings' && 'Configurações Globais'}
            </h2>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
              {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Sistemas Operacionais
            </div>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total de Clientes" value={dashboardData.stats.totalClients} icon={Users} color="blue" />
                <StatCard label="Clientes Ativos" value={dashboardData.stats.activeClients} icon={ShieldCheck} color="emerald" />
                <StatCard label="Lojas no Sistema" value={dashboardData.stats.totalStores} icon={Store} color="amber" />
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
                          <tr key={client.id} className="hover:bg-zinc-50/50 transition-colors">
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
              {/* 1️⃣ Resumo Financeiro */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Ganho Hoje" value={`Kz ${financeData.stats.totalToday.toLocaleString()}`} icon={DollarSign} color="emerald" />
                <StatCard label="Total Ganho no Mês" value={`Kz ${financeData.stats.totalMonth.toLocaleString()}`} icon={TrendingUp} color="blue" />
                <StatCard label="Total Ganho no Ano" value={`Kz ${financeData.stats.totalYear.toLocaleString()}`} icon={Activity} color="indigo" />
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
                          <tr key={payment.id} className="hover:bg-zinc-50/50 transition-colors">
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
                  <div className="p-6 border-b border-zinc-100">
                    <h3 className="font-bold">Pagamentos Pendentes</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {financeData.pendingPayments.length === 0 ? (
                      <p className="text-sm text-zinc-400 text-center py-4">Nenhum pagamento pendente.</p>
                    ) : (
                      financeData.pendingPayments.map((pending: any, idx: number) => (
                        <div key={idx} className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="text-amber-600 mt-0.5" size={18} />
                          <div>
                            <p className="text-sm font-bold text-amber-900">{pending.client_name}</p>
                            <p className="text-[10px] text-amber-600 mt-1">Licença expira em: {new Date(pending.license_expiry).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <button onClick={() => setActiveTab('licenses')} className="w-full py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all">
                      Cobrar Clientes
                    </button>
                  </div>
                </Card>
              </div>

              {/* 5️⃣ Relatório de Receitas */}
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

              {/* 3️⃣ Histórico de Pagamentos */}
              <Card>
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="font-bold">Histórico de Pagamentos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-50">
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cliente</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Método</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Plano</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {financeData.payments.map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold">{payment.client_name}</p>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-zinc-900">Kz {payment.amount.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-zinc-500 font-medium">{payment.payment_method}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-zinc-100 rounded-lg text-[10px] font-bold text-zinc-600 uppercase">
                              {payment.plan_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-500">{new Date(payment.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="relative w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Pesquisar por nome, empresa, NIF..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                  <select 
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                    className="px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm font-bold"
                  >
                    <option value="all">Todos os Planos</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm font-bold"
                  >
                    <option value="all">Todos os Estados</option>
                    <option value="active">Ativos</option>
                    <option value="suspended">Suspensos</option>
                    <option value="blocked">Bloqueados</option>
                  </select>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all whitespace-nowrap"
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-50">
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Empresa / Proprietário</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Contacto</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Plano Atual</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Lojas</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estado</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Acções</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {filteredClients.map((client: any) => (
                        <tr key={client.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => fetchClientDetails(client.id)}>
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
                          <td className="px-6 py-4 text-sm font-bold text-zinc-600">{client.store_count}</td>
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
              </Card>
            </div>
          )}

          {activeTab === 'licenses' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="relative w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar por cliente ou empresa..." 
                      value={licenseSearchQuery}
                      onChange={(e) => setLicenseSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                    />
                  </div>
                  <select 
                    value={licenseFilterPlan}
                    onChange={(e) => setLicenseFilterPlan(e.target.value)}
                    className="px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm font-bold"
                  >
                    <option value="all">Todos os Planos</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <select 
                    value={licenseFilterStatus}
                    onChange={(e) => setLicenseFilterStatus(e.target.value)}
                    className="px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm font-bold"
                  >
                    <option value="all">Todos os Estados</option>
                    <option value="active">Ativas</option>
                    <option value="expired">Expiradas</option>
                    <option value="suspended">Suspensas</option>
                  </select>
                </div>
                <button 
                  onClick={() => setIsLicenseModalOpen(true)}
                  className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all whitespace-nowrap"
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
                <div className="overflow-x-auto">
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
                        <tr key={license.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold">{license.company_name || license.client_name}</p>
                            <p className="text-[10px] text-zinc-400">{license.store_name || 'Licença Global'}</p>
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
              </Card>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-180px)]">
              <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex gap-2">
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

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {tickets.filter(t => t.status === supportFilter).map((ticket: any) => (
                    <Card 
                      key={ticket.id} 
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

              <div className="lg:col-span-2 flex flex-col overflow-hidden">
                {selectedTicket ? (
                  <Card className="flex-1 flex flex-col">
                    <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-600">
                          <UserIcon size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight">{selectedTicket.subject}</h3>
                          <p className="text-xs text-zinc-400">Cliente: <span className="font-bold text-zinc-900">{selectedTicket.client_name}</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <select 
                          value={selectedTicket.priority}
                          onChange={(e) => handleUpdateTicketPriority(selectedTicket.id, e.target.value)}
                          className="text-[10px] font-black uppercase bg-zinc-50 border-none rounded-lg px-2 py-1 outline-none"
                        >
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                        </select>
                        <select 
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                          className="text-[10px] font-black uppercase bg-zinc-50 border-none rounded-lg px-2 py-1 outline-none"
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
                        <div key={msg.id} className={cn("flex gap-4", msg.is_admin ? "flex-row-reverse" : "")}>
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", msg.is_admin ? "bg-black text-white" : "bg-zinc-200")}>
                            {msg.is_admin ? <ShieldCheck size={16} /> : <UserIcon size={16} />}
                          </div>
                          <div className={cn(
                            "max-w-[80%] p-4 rounded-2xl shadow-sm border",
                            msg.is_admin 
                              ? "bg-black text-white border-black rounded-tr-none" 
                              : "bg-white text-zinc-800 border-zinc-100 rounded-tl-none"
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
                      {monitoring.recentActivity.map((activity: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-4 group">
                          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-black group-hover:text-white transition-all">
                            <ShoppingCart size={18} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <p className="text-sm">
                                <span className="font-bold">Nova {activity.type}</span> processada em <span className="font-bold">{activity.store_name}</span>
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
                        <div key={idx} className={cn(
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
                <button className="flex items-center gap-2 px-6 py-3 border border-zinc-200 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all">
                  <FileText size={18} />
                  Exportar CSV
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-lg shadow-black/10">
                  <FilePieChart size={18} />
                  Gerar Relatório PDF
                </button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-8">
              <Card>
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="font-bold">Planos de Subscrição</h3>
                  <button 
                    onClick={() => {
                      setSelectedPlan(null);
                      setPlanFormData({ name: '', price: 0, max_stores: 1, max_products: 100, features: { reports: true, multi_store: false } });
                      setIsPlanModalOpen(true);
                    }}
                    className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Novo Plano
                  </button>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {plans.map((plan: any) => (
                      <div key={plan.id} className="p-6 border border-zinc-200 rounded-2xl hover:border-black transition-all group relative">
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
                                  max_stores: plan.max_stores, 
                                  max_products: plan.max_products, 
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
                            Até {plan.max_stores} lojas
                          </li>
                          <li className="flex items-center gap-2 text-sm text-zinc-600">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            Até {plan.max_products} produtos
                          </li>
                        </ul>
                        <button 
                          onClick={() => {
                            setSelectedPlan(plan);
                            setPlanFormData({ 
                              name: plan.name, 
                              price: plan.price, 
                              max_stores: plan.max_stores, 
                              max_products: plan.max_products, 
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
                        setPlanFormData({ name: '', price: 0, max_stores: 1, max_products: 100, features: { reports: true, multi_store: false } });
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
                value={planFormData.price}
                onChange={(e) => setPlanFormData({ ...planFormData, price: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Máx. Lojas</label>
              <input 
                type="number" 
                value={planFormData.max_stores}
                onChange={(e) => setPlanFormData({ ...planFormData, max_stores: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Máx. Produtos</label>
              <input 
                type="number" 
                value={planFormData.max_products}
                onChange={(e) => setPlanFormData({ ...planFormData, max_products: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                required
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
                  checked={planFormData.features.multi_store}
                  onChange={(e) => setPlanFormData({ ...planFormData, features: { ...planFormData.features, multi_store: e.target.checked } })}
                  className="w-5 h-5 rounded-lg border-zinc-200 text-black focus:ring-black"
                />
                <span className="text-sm font-medium text-zinc-600 group-hover:text-black transition-colors">Gestão Multi-Loja</span>
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
                <button onClick={() => setIsClientDetailsOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Lojas</p>
                        <p className="text-2xl font-black">{clientDetails.stats.totalStores}</p>
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

                    {/* Stores List */}
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-widest text-zinc-400 mb-4">Lojas do Cliente</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clientDetails.stores.map((store: any) => (
                          <div key={store.id} className="p-4 border border-zinc-100 rounded-2xl flex items-center gap-4 hover:border-black transition-all">
                            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600">
                              <Store size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{store.name}</p>
                              <p className="text-[10px] text-zinc-400">{store.address}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* History Tabs */}
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-widest text-zinc-400 mb-4">Histórico de Licenças</h4>
                      <div className="space-y-3">
                        {clientDetails.licenses.map((license: any) => (
                          <div key={license.id} className="p-4 border border-zinc-100 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400">
                                <CreditCard size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-bold">Plano {license.plan_type.toUpperCase()}</p>
                                <p className="text-[10px] text-zinc-400">{license.store_name || 'Global'}</p>
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
                        {clientDetails.client.status === 'active' ? 'Suspender Cliente' : 'Reativar Cliente'}
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
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Selecionar Plano</label>
                  <select 
                    value={licenseFormData.plan_type}
                    onChange={(e) => setLicenseFormData({...licenseFormData, plan_type: e.target.value})}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all font-bold"
                  >
                    <option value="basic">Basic (Kz 15.000/mês)</option>
                    <option value="pro">Pro (Kz 35.000/mês)</option>
                    <option value="enterprise">Enterprise (Kz 75.000/mês)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Duração (Meses)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="24"
                    value={licenseFormData.duration_months}
                    onChange={(e) => setLicenseFormData({...licenseFormData, duration_months: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Atribuir a Loja (Opcional)</label>
                  <select 
                    value={licenseFormData.store_id}
                    onChange={(e) => setLicenseFormData({...licenseFormData, store_id: e.target.value})}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all"
                  >
                    <option value="">Licença Global (Todas as Lojas)</option>
                    {clientDetails?.stores?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all">
                    Ativar / Renovar Licença
                  </button>
                </div>
              </form>
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
                        <p className="text-sm font-bold">Plano {h.plan_type.toUpperCase()}</p>
                        <p className="text-[10px] text-zinc-400">{h.store_name || 'Global'}</p>
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
    </div>
  );
};

const OwnerOverview = ({ user }: { user: User }) => {
  const [stats, setStats] = useState({ todaySales: 0, lowStockCount: 0, staffCount: 0 });
  const [stores, setStores] = useState<StoreType[]>([]);

  useEffect(() => {
    fetch(`/api/owner/dashboard-stats/all?ownerId=${user.id}`)
      .then(res => res.json())
      .then(setStats);
    fetch(`/api/owner/stores/${user.id}`)
      .then(res => res.json())
      .then(setStores);
  }, [user.id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Visão Geral do Negócio</h2>
          <p className="text-zinc-500">Resumo de desempenho de todas as suas unidades.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Estado Global</p>
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <Activity size={16} />
            <span>Operacional</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Vendas Consolidadas (Hoje)" 
          value={`Kz ${stats.todaySales.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="+5.2%" 
          color="emerald" 
        />
        <StatCard 
          label="Alertas de Stock" 
          value={`${stats.lowStockCount} itens`} 
          icon={Package} 
          color={stats.lowStockCount > 0 ? "rose" : "blue"} 
        />
        <StatCard 
          label="Força de Trabalho" 
          value={`${stats.staffCount} colaboradores`} 
          icon={Users} 
          color="blue" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <h3 className="font-bold">Desempenho por Loja</h3>
            <Link to="/owner/stores" className="text-sm text-zinc-500 hover:text-black flex items-center gap-1">
              Gerenciar Lojas <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {stores.map(store => (
              <div key={store.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-600">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt="" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                    ) : (
                      <Store size={20} />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{store.name}</p>
                    <p className="text-xs text-zinc-500">{store.address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">Kz {(store.today_sales || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Vendas Hoje</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-zinc-900 text-white border-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BarChart3 size={120} />
          </div>
          <div className="p-8 relative z-10 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Relatórios Inteligentes</h3>
              <p className="text-zinc-400 text-sm mb-6">Analise o crescimento do seu negócio com dados detalhados de faturamento e tendências de consumo.</p>
            </div>
            <Link 
              to="/owner/reports"
              className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-100 transition-colors w-fit"
            >
              Aceder Relatórios <ChevronRight size={18} />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

const MyStores = ({ user }: { user: User }) => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    nif: '',
    logo_url: '',
    status: 'active' as 'active' | 'inactive'
  });

  const fetchStores = () => {
    fetch(`/api/owner/stores/${user.id}`)
      .then(res => res.json())
      .then(setStores);
  };

  useEffect(fetchStores, [user.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingStore ? `/api/owner/stores/${editingStore.id}` : '/api/owner/stores';
    const method = editingStore ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, owner_id: user.id })
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingStore(null);
      setFormData({ name: '', address: '', phone: '', nif: '', logo_url: '', status: 'active' });
      fetchStores();
    }
  };

  const handleEdit = (store: StoreType) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address,
      phone: store.phone || '',
      nif: store.nif || '',
      logo_url: store.logo_url || '',
      status: store.status
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Minhas Lojas</h2>
          <p className="text-zinc-500">Gerencie e configure suas unidades de negócio.</p>
        </div>
        <button 
          onClick={() => {
            setEditingStore(null);
            setFormData({ name: '', address: '', phone: '', nif: '', logo_url: '', status: 'active' });
            setIsModalOpen(true);
          }}
          className="bg-black text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          Nova Loja
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map(store => (
          <Card key={store.id} className="group hover:border-black transition-all duration-300">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-black group-hover:text-white transition-colors overflow-hidden">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Store size={32} />
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(store)}
                    className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <Link 
                    to={`/owner/stores/${store.id}`}
                    className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                  >
                    <Settings2 size={18} />
                  </Link>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">{store.name}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                    store.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                  )}>
                    {store.status === 'active' ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 flex items-center gap-1">
                  <Home size={14} /> {store.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-100">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-1">Vendas Hoje</p>
                  <p className="font-bold text-zinc-800">Kz {(store.today_sales || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-1">Pessoal</p>
                  <p className="font-bold text-zinc-800">{store.staff_count} Colaboradores</p>
                </div>
              </div>
            </div>
            <Link 
              to={`/owner/stores/${store.id}`}
              className="block w-full py-4 bg-zinc-50 text-center text-sm font-bold text-zinc-600 hover:bg-black hover:text-white transition-all border-t border-zinc-100"
            >
              Aceder Painel Administrativo
            </Link>
          </Card>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingStore ? "Editar Loja" : "Cadastrar Nova Loja"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome da Loja</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Endereço</label>
              <input 
                type="text" 
                required
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Telefone</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">NIF</label>
              <input 
                type="text" 
                value={formData.nif}
                onChange={e => setFormData({...formData, nif: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">URL do Logotipo</label>
              <input 
                type="text" 
                value={formData.logo_url}
                onChange={e => setFormData({...formData, logo_url: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                placeholder="https://..."
              />
            </div>
            {editingStore && (
              <div className="col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Estado da Loja</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all"
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
              </div>
            )}
          </div>
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all active:scale-95 mt-4">
            {editingStore ? "Guardar Alterações" : "Criar Loja"}
          </button>
        </form>
      </Modal>
    </div>
  );
};

const StoreAdmin = ({ user }: { user: User }) => {
  const { storeId } = useParams();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'promotions' | 'stock' | 'staff' | 'reports' | 'settings' | 'support'>('dashboard');
  const [storeData, setStoreData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [stockReport, setStockReport] = useState<any>(null);
  const [reportsData, setReportsData] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '', priority: 'medium' });
  const [settingsForm, setSettingsForm] = useState({ name: '', nif: '', phone: '', address: '', logo_url: '', status: 'active' });
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isProformaModalOpen, setIsProformaModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price: '', stock: '', category: '', image_url: '', min_stock: '5' });
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', salary: '', shift_info: '' });
  const [promoForm, setPromoForm] = useState({ name: '', start_date: '', end_date: '', discount_percent: '', product_ids: [] as number[] });
  const [stockForm, setStockForm] = useState({ 
    product_id: '', 
    type: 'in', 
    quantity: '', 
    reason: '', 
    to_store_id: '',
    isBulk: false,
    bulkType: 'grade',
    bulkQuantity: '',
    unitsPerBulk: '24'
  });
  const [proformaForm, setProformaForm] = useState({ 
    client_name: '', 
    client_nif: '', 
    client_address: '', 
    items: [] as { product_id: number, quantity: number, price: number, name: string }[] 
  });
  const navigate = useNavigate();

  const fetchData = () => {
    fetch(`/api/owner/store-details/${storeId}`)
      .then(res => res.json())
      .then(data => {
        setStoreData(data);
        if (data.store) {
          setSettingsForm({
            name: data.store.name || '',
            nif: data.store.nif || '',
            phone: data.store.phone || '',
            address: data.store.address || '',
            logo_url: data.store.logo_url || '',
            status: data.store.status || 'active'
          });
        }
      });
    fetch(`/api/owner/products/${storeId}`)
      .then(res => res.json())
      .then(setProducts);
    fetch(`/api/owner/staff/${storeId}`)
      .then(res => res.json())
      .then(setStaff);
    fetch(`/api/owner/staff-performance/${storeId}`)
      .then(res => res.json())
      .then(setStaffPerformance);
    fetch(`/api/owner/promotions/${storeId}`)
      .then(res => res.json())
      .then(setPromotions);
    fetch(`/api/owner/stock/movements/${storeId}`)
      .then(res => res.json())
      .then(setStockMovements);
    fetch(`/api/owner/stock/report/${storeId}`)
      .then(res => res.json())
      .then(setStockReport);
    fetch(`/api/owner/reports/${storeId}`)
      .then(res => res.json())
      .then(setReportsData);
    fetch('/api/admin/stores')
      .then(res => res.json())
      .then(setStores);
    fetch(`/api/owner/support/${user.id}`)
      .then(res => res.json())
      .then(setSupportTickets);
  };

  useEffect(fetchData, [storeId]);

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingProduct ? `/api/owner/products/${editingProduct.id}` : '/api/owner/products';
    const method = editingProduct ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...productForm, 
        store_id: Number(storeId), 
        price: Number(productForm.price), 
        stock: Number(productForm.stock),
        min_stock: Number(productForm.min_stock)
      })
    });
    if (res.ok) {
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductForm({ name: '', price: '', stock: '', category: '', image_url: '', min_stock: '5' });
      fetchData();
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      image_url: product.image_url,
      min_stock: (product.min_stock || 5).toString()
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
      body: JSON.stringify({ ...staffForm, store_id: Number(storeId), salary: Number(staffForm.salary) })
    });
    if (res.ok) {
      setIsStaffModalOpen(false);
      setEditingStaff(null);
      setStaffForm({ name: '', email: '', password: '', salary: '', shift_info: '' });
      fetchData();
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (confirm('Tem certeza que deseja demitir este colaborador?')) {
      await fetch(`/api/owner/staff/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleEditStaff = (member: any) => {
    setEditingStaff(member);
    setStaffForm({
      name: member.name,
      email: member.email,
      password: '', // Don't show password
      salary: member.salary.toString(),
      shift_info: member.shift_info
    });
    setIsStaffModalOpen(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Tem certeza que deseja eliminar este produto?')) {
      await fetch(`/api/owner/products/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleAddPromo = async (e: FormEvent) => {
    e.preventDefault();
    if (promoForm.product_ids.length === 0) return alert('Selecione pelo menos um produto');
    
    const res = await fetch('/api/owner/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...promoForm, 
        store_id: Number(storeId), 
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
    if (confirm('Tem certeza que deseja eliminar esta promoção?')) {
      await fetch(`/api/owner/promotions/${id}`, { method: 'DELETE' });
      fetchData();
    }
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
      from_store_id: Number(storeId),
      to_store_id: Number(stockForm.to_store_id),
      product_id: Number(stockForm.product_id),
      user_id: user.id,
      quantity: finalQuantity,
      reason: stockForm.reason
    } : {
      store_id: Number(storeId),
      product_id: Number(stockForm.product_id),
      user_id: user.id,
      type: stockForm.type,
      quantity: stockForm.type === 'in' ? finalQuantity : -finalQuantity,
      reason: stockForm.reason
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
        to_store_id: '',
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
    const res = await fetch(`/api/owner/store-settings/${storeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsForm)
    });
    if (res.ok) {
      alert('Configurações actualizadas com sucesso!');
      fetchData();
    }
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

  const handleCreateProforma = async (e: FormEvent) => {
    e.preventDefault();
    if (proformaForm.items.length === 0) {
      alert("Adicione pelo menos um produto à fatura proforma.");
      return;
    }

    const total_amount = proformaForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    try {
      const res = await fetch('/api/owner/proforma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proformaForm,
          store_id: storeId,
          owner_id: user.id,
          total_amount
        })
      });

      if (res.ok) {
        setIsProformaModalOpen(false);
        setProformaForm({ client_name: '', client_nif: '', client_address: '', items: [] });
        alert("Fatura Proforma criada com sucesso!");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addProductToProforma = (product: Product) => {
    const existing = proformaForm.items.find(item => item.product_id === product.id);
    if (existing) {
      setProformaForm({
        ...proformaForm,
        items: proformaForm.items.map(item => 
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      });
    } else {
      setProformaForm({
        ...proformaForm,
        items: [...proformaForm.items, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }]
      });
    }
  };

  const removeProductFromProforma = (productId: number) => {
    setProformaForm({
      ...proformaForm,
      items: proformaForm.items.filter(item => item.product_id !== productId)
    });
  };

  const updateProformaItemQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) return;
    setProformaForm({
      ...proformaForm,
      items: proformaForm.items.map(item => 
        item.product_id === productId ? { ...item, quantity } : item
      )
    });
  };

  if (!storeData) return <div className="p-8 text-center text-zinc-500">Carregando dados da loja...</div>;

  const { store, dashboard } = storeData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/owner/stores')}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-400 hover:text-black"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center overflow-hidden">
              {store.logo_url ? (
                <img src={store.logo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Store size={24} />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{store.name}</h2>
              <p className="text-zinc-500 text-sm flex items-center gap-1">
                <Activity size={14} className={store.status === 'active' ? 'text-emerald-500' : 'text-rose-500'} />
                Painel Administrativo • {store.status === 'active' ? 'Ativa' : 'Inativa'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl overflow-x-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'products', icon: Package, label: 'Produtos' },
            { id: 'promotions', icon: Tag, label: 'Promoções' },
            { id: 'stock', icon: Barcode, label: 'Stock' },
            { id: 'staff', icon: Users, label: 'Pessoal' },
            { id: 'reports', icon: BarChart3, label: 'Relatórios' },
            { id: 'settings', icon: Settings2, label: 'Configurações' },
            { id: 'support', icon: LifeBuoy, label: 'Suporte' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-white text-black shadow-sm" 
                  : "text-zinc-500 hover:text-black"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Vendas (Hoje)" value={dashboard.todaySales} icon={ShoppingCart} color="blue" />
                <StatCard label="Faturamento (Hoje)" value={`Kz ${dashboard.todayRevenue.toLocaleString()}`} icon={DollarSign} color="emerald" />
                <StatCard label="Stock Baixo" value={dashboard.lowStockCount} icon={AlertTriangle} color={dashboard.lowStockCount > 0 ? "rose" : "blue"} />
                <StatCard label="Vendedores Ativos" value={dashboard.activeSellers} icon={Users} color="amber" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <div className="p-6 border-b border-zinc-100">
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
                        <p className="text-2xl font-black">{dashboard.activeSellers}</p>
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
                      <Info size={18} />
                      <span className="text-xs font-bold">Licença ativa até Dezembro 2026</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <Card>
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                <h3 className="font-bold">Gestão de Produtos</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsPromoModalOpen(true)}
                    className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-amber-200 transition-colors"
                  >
                    <Tag size={16} /> Criar Promoção
                  </button>
                  <button 
                    onClick={() => setIsProformaModalOpen(true)}
                    className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-200 transition-colors"
                  >
                    <FileText size={16} /> Fatura Proforma
                  </button>
                  <button 
                    onClick={() => setIsProductModalOpen(true)}
                    className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                  >
                    <Plus size={16} /> Novo Produto
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Produto</th>
                      <th className="px-6 py-4 font-semibold">Categoria</th>
                      <th className="px-6 py-4 font-semibold">Preço</th>
                      <th className="px-6 py-4 font-semibold">Stock</th>
                      <th className="px-6 py-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                            <span className="font-medium text-sm">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500">{product.category}</td>
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
            </Card>
          )}

          {activeTab === 'promotions' && (
            <Card>
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                <h3 className="font-bold">Promoções Ativas</h3>
                <button 
                  onClick={() => setIsPromoModalOpen(true)}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Plus size={16} /> Nova Promoção
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
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
                      <tr key={promo.id} className="hover:bg-zinc-50 transition-colors">
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
            </Card>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                    <h3 className="font-bold">Equipa da Loja</h3>
                    <button 
                      onClick={() => {
                        setEditingStaff(null);
                        setStaffForm({ name: '', email: '', password: '', salary: '', shift_info: '' });
                        setIsStaffModalOpen(true);
                      }}
                      className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                    >
                      <Plus size={16} /> Adicionar Colaborador
                    </button>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {staff.map(member => (
                      <div key={member.id} className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
                            <UserIcon size={24} />
                          </div>
                          <div>
                            <p className="font-bold">{member.name}</p>
                            <p className="text-xs text-zinc-500">{member.email} • {member.shift_info}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Salário</p>
                            <p className="font-bold">Kz {member.salary.toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
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
                    {staffPerformance.map((perf: any, idx: number) => (
                      <div key={idx} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold">Faturamento (Últimos 30 dias)</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" /> Receita
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
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
                          tick={{ fontSize: 10, fill: '#a1a1aa' }}
                          tickFormatter={(str) => new Date(str).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#a1a1aa' }}
                          tickFormatter={(val) => `Kz ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(val: any) => [`Kz ${val.toLocaleString()}`, 'Receita']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold mb-6">Top 5 Produtos</h3>
                  <div className="space-y-4">
                    {reportsData?.topProducts?.map((product: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-xs font-bold">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold truncate max-w-[120px]">{product.name}</p>
                            <p className="text-[10px] text-zinc-400">{product.quantity} unidades</p>
                          </div>
                        </div>
                        <p className="text-sm font-black">Kz {product.revenue.toLocaleString()}</p>
                      </div>
                    ))}
                    {(!reportsData?.topProducts || reportsData.topProducts.length === 0) && (
                      <p className="text-center py-8 text-zinc-400 text-sm italic">Nenhum dado disponível.</p>
                    )}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-bold mb-6">Vendas por Categoria</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportsData?.salesByCategory || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {(reportsData?.salesByCategory || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
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
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportsData?.paymentMethods || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                        <Tooltip 
                          cursor={{ fill: '#f4f4f5' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
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

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="font-bold">Configurações da Loja</h3>
                </div>
                <form onSubmit={handleUpdateSettings} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome da Loja</label>
                      <input 
                        type="text" 
                        value={settingsForm.name}
                        onChange={e => setSettingsForm({...settingsForm, name: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">NIF da Empresa</label>
                      <input 
                        type="text" 
                        value={settingsForm.nif}
                        onChange={e => setSettingsForm({...settingsForm, nif: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Telefone de Contacto</label>
                      <input 
                        type="text" 
                        value={settingsForm.phone}
                        onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Endereço</label>
                      <input 
                        type="text" 
                        value={settingsForm.address}
                        onChange={e => setSettingsForm({...settingsForm, address: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                      />
                    </div>
                    <div className="col-span-full">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">URL do Logotipo</label>
                      <input 
                        type="text" 
                        value={settingsForm.logo_url}
                        onChange={e => setSettingsForm({...settingsForm, logo_url: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-zinc-100 flex justify-end">
                    <button type="submit" className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all active:scale-95">
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
                      Eliminar uma loja é uma acção irreversível. Todos os dados de produtos, vendas e colaboradores serão perdidos.
                    </p>
                    <button className="w-full flex items-center justify-center gap-2 py-3 text-rose-600 font-bold hover:bg-rose-100 rounded-xl transition-colors border border-rose-200">
                      <Trash2 size={18} />
                      Eliminar Loja Permanentemente
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          )}
          
          {activeTab === 'stock' && (
            <div className="space-y-6">
              {/* Stock Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Package size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Produtos</p>
                      <p className="text-2xl font-black">{stockReport?.stats?.total_products || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Quantidade Total</p>
                      <p className="text-2xl font-black">{stockReport?.stats?.total_quantity || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Valor do Stock</p>
                      <p className="text-2xl font-black">Kz {(stockReport?.stats?.total_value || 0).toLocaleString()}</p>
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
                        <div className="flex items-center gap-3">
                          <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <p className="text-xs font-bold text-zinc-800">{p.name}</p>
                            <p className="text-[10px] text-zinc-400">Mínimo: {p.min_stock}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
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
                  <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                    <h3 className="font-bold">Inventário / Lista de Stock</h3>
                    <button 
                      onClick={() => setIsStockModalOpen(true)}
                      className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                    >
                      <Plus size={16} /> Movimentar Stock
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4 font-semibold">Produto</th>
                          <th className="px-6 py-4 font-semibold">Loja</th>
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
                                <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                                <span className="font-medium text-sm">{product.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-500">{store.name}</td>
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
                          msg.is_admin ? "self-start" : "self-end items-end"
                        )}>
                          <div className={cn(
                            "p-4 rounded-2xl text-sm",
                            msg.is_admin 
                              ? "bg-white border border-zinc-100 text-zinc-900 rounded-tl-none" 
                              : "bg-black text-white rounded-tr-none"
                          )}>
                            {msg.message}
                          </div>
                          <span className="text-[10px] text-zinc-400 mt-1 px-1">
                            {msg.is_admin ? 'Suporte Factu' : 'Você'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modal Fatura Proforma */}
      {isProformaModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Criar Fatura Proforma</h3>
                <p className="text-xs text-zinc-500">Gere um orçamento formal para o seu cliente.</p>
              </div>
              <button onClick={() => setIsProformaModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Client Info & Product Selection */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400">Dados do Cliente</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <input 
                      type="text"
                      placeholder="Nome do Cliente"
                      value={proformaForm.client_name}
                      onChange={e => setProformaForm({...proformaForm, client_name: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="text"
                        placeholder="NIF"
                        value={proformaForm.client_nif}
                        onChange={e => setProformaForm({...proformaForm, client_nif: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                      />
                      <input 
                        type="text"
                        placeholder="Telefone (Opcional)"
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                      />
                    </div>
                    <textarea 
                      placeholder="Endereço do Cliente"
                      value={proformaForm.client_address}
                      onChange={e => setProformaForm({...proformaForm, client_address: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all h-20 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400">Selecionar Produtos</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {products.map(product => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 hover:border-zinc-300 transition-all">
                        <div className="flex items-center gap-3">
                          <img src={product.image_url} alt="" className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <p className="text-xs font-bold">{product.name}</p>
                            <p className="text-[10px] text-zinc-500">Kz {product.price.toLocaleString()}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => addProductToProforma(product)}
                          className="p-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Items List & Summary */}
              <div className="flex flex-col h-full">
                <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400 mb-4">Itens da Fatura</h4>
                <div className="flex-1 bg-zinc-50 rounded-2xl border border-zinc-100 p-4 overflow-y-auto space-y-3">
                  {proformaForm.items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                      <ShoppingCart size={32} className="mb-2 opacity-20" />
                      <p className="text-xs">Nenhum item adicionado</p>
                    </div>
                  ) : (
                    proformaForm.items.map(item => (
                      <div key={item.product_id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-zinc-100">
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="text-xs font-bold truncate">{item.name}</p>
                          <p className="text-[10px] text-zinc-500">Kz {item.price.toLocaleString()} un</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-zinc-100 rounded-lg overflow-hidden">
                            <button 
                              onClick={() => updateProformaItemQuantity(item.product_id, item.quantity - 1)}
                              className="p-1 hover:bg-zinc-200 transition-all"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                            <button 
                              onClick={() => updateProformaItemQuantity(item.product_id, item.quantity + 1)}
                              className="p-1 hover:bg-zinc-200 transition-all"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeProductFromProforma(item.product_id)}
                            className="text-rose-500 hover:bg-rose-50 p-1 rounded transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 p-6 bg-black text-white rounded-2xl space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-60">Subtotal</span>
                    <span>Kz {proformaForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-60">Imposto (0%)</span>
                    <span>Kz 0</span>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="font-bold">Total</span>
                    <span className="text-xl font-black">Kz {proformaForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={handleCreateProforma}
                    className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-zinc-100 transition-all active:scale-95"
                  >
                    Gerar Fatura Proforma
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

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

      <Modal isOpen={isProductModalOpen} onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }} title={editingProduct ? "Editar Produto" : "Novo Produto"}>
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome do Produto</label>
            <input 
              type="text" required
              value={productForm.name}
              onChange={e => setProductForm({...productForm, name: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Preço (Kz)</label>
              <input 
                type="number" required
                value={productForm.price}
                onChange={e => setProductForm({...productForm, price: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Stock</label>
              <input 
                type="number" required
                value={productForm.stock}
                onChange={e => setProductForm({...productForm, stock: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Categoria</label>
              <input 
                type="text" required
                list="categories-list"
                value={productForm.category}
                onChange={e => setProductForm({...productForm, category: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
                placeholder="Ex: Bebidas, Alimentos..."
              />
              <datalist id="categories-list">
                {Array.from(new Set(products.map(p => p.category))).map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Stock Mínimo</label>
              <input 
                type="number" required
                value={productForm.min_stock}
                onChange={e => setProductForm({...productForm, min_stock: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">URL da Imagem</label>
            <input 
              type="text"
              value={productForm.image_url}
              onChange={e => setProductForm({...productForm, image_url: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold">
            {editingProduct ? "Guardar Alterações" : "Adicionar Produto"}
          </button>
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
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Email</label>
            <input 
              type="email" required
              value={staffForm.email}
              onChange={e => setStaffForm({...staffForm, email: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
            />
          </div>
          {!editingStaff && (
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Senha Inicial</label>
              <input 
                type="password" required
                value={staffForm.password}
                onChange={e => setStaffForm({...staffForm, password: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Salário (Kz)</label>
              <input 
                type="number" required
                value={staffForm.salary}
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
              value={promoForm.discount_percent}
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
                    <img src={p.image_url} alt="" className="w-6 h-6 rounded object-cover" referrerPolicy="no-referrer" />
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
                <option value="transfer">Transferência entre Lojas</option>
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

          {stockForm.type === 'transfer' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Loja de Destino</label>
              <select 
                required
                value={stockForm.to_store_id}
                onChange={e => setStockForm({...stockForm, to_store_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="">Selecionar Loja</option>
                {stores.filter(s => s.id !== Number(storeId)).map(s => (
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
                    value={stockForm.quantity}
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
                      value={stockForm.bulkQuantity}
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
                      value={stockForm.unitsPerBulk}
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
    </div>
  );
};

const OwnerReports = ({ user }: { user: User }) => (
  <div className="p-12 text-center space-y-4">
    <div className="w-20 h-20 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto">
      <TrendingUp size={40} />
    </div>
    <h3 className="text-xl font-bold">Relatórios Globais</h3>
    <p className="text-zinc-500">Visualize o desempenho consolidado de todas as suas lojas.</p>
  </div>
);

const OwnerSettings = ({ user }: { user: User }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: '',
    nif: '',
    address: '',
    company_name: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/clients/${user.id}/details`)
      .then(res => res.json())
      .then(data => {
        setFormData({
          ...formData,
          name: data.client.name,
          email: data.client.email,
          phone: data.client.phone || '',
          nif: data.client.nif || '',
          address: data.client.address || '',
          company_name: data.client.company_name || ''
        });
        setIsLoading(false);
      });
  }, [user.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert("As senhas não coincidem");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert("Perfil actualizado com sucesso!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-12 text-center text-zinc-500">Carregando configurações...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Configurações da Conta</h2>
        <p className="text-zinc-500">Gerencie seus dados de proprietário e preferências do sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-6 border-b border-zinc-100">
              <h3 className="font-bold">Informações Pessoais</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Telefone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">NIF</label>
                  <input 
                    type="text" 
                    value={formData.nif}
                    onChange={e => setFormData({...formData, nif: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome da Empresa</label>
                  <input 
                    type="text" 
                    value={formData.company_name}
                    onChange={e => setFormData({...formData, company_name: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Endereço Fiscal</label>
                  <textarea 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all h-24 resize-none"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100">
                <h4 className="font-bold text-sm mb-4">Alterar Palavra-passe</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nova Palavra-passe</label>
                    <input 
                      type="password" 
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                      placeholder="Deixe em branco para manter"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Confirmar Palavra-passe</label>
                    <input 
                      type="password" 
                      value={formData.confirmPassword}
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                      placeholder="Confirme a nova senha"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-black text-white">
            <h3 className="font-bold mb-4">Estado da Subscrição</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Plano Actual</span>
                <span className="font-bold bg-white/10 px-2 py-1 rounded text-xs uppercase">Profissional</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Expira em</span>
                <span className="font-bold">31/12/2026</span>
              </div>
              <div className="pt-4 border-t border-white/10">
                <button className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-100 transition-all">
                  Renovar Subscrição
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold mb-4">Segurança</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <ShieldCheck size={18} className="text-emerald-500" />
                Autenticação de dois factores activa
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <Clock size={18} className="text-zinc-400" />
                Último acesso: Hoje às 14:20
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// --- Seller Module ---

const SellerPOS = ({ user }: { user: User }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [category, setCategory] = useState('Geral');
  const [search, setSearch] = useState('');
  
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
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const storeId = user.store_id || 1;
    fetch(`/api/seller/products/${storeId}`).then(res => res.json()).then(setProducts);
  }, [user.store_id]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((acc, item) => {
    const price = item.product.discount_percent 
      ? item.product.price * (1 - item.product.discount_percent / 100) 
      : item.product.price;
    return acc + (price * item.quantity);
  }, 0);
  const tax = subtotal * 0.14;
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsPaymentModalOpen(true);
  };

  const handleCreateProforma = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    try {
      const storeId = user.store_id || 1;
      const res = await fetch('/api/owner/proforma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proformaForm,
          store_id: storeId,
          owner_id: user.id,
          total_amount: total,
          items: cart.map(item => ({
            product_id: item.product.id,
            name: item.product.name,
            price: item.product.discount_percent 
              ? item.product.price * (1 - item.product.discount_percent / 100) 
              : item.product.price,
            quantity: item.quantity
          }))
        })
      });

      if (res.ok) {
        setIsProformaModalOpen(false);
        setProformaForm({ client_name: '', client_nif: '', client_address: '' });
        alert("Fatura Proforma criada com sucesso!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const finalizeSale = async () => {
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived);
      if (isNaN(received) || received < total) {
        alert('Dinheiro insuficiente ou valor inválido!');
        return;
      }
    }

    if (paymentMethod === 'split') {
      const cash = parseFloat(splitAmounts.cash) || 0;
      const card = parseFloat(splitAmounts.card) || 0;
      if (Math.abs((cash + card) - total) > 0.01) {
        alert('A soma dos valores (Dinheiro + Cartão) deve ser igual ao total da venda!');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const storeId = user.store_id || 1;
      const res = await fetch('/api/seller/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          seller_id: user.id,
          total_amount: total,
          payment_method: paymentMethod,
          cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : (paymentMethod === 'split' ? parseFloat(splitAmounts.cash) : total),
          split_details: paymentMethod === 'split' ? { cash: parseFloat(splitAmounts.cash), card: parseFloat(splitAmounts.card) } : null,
          items: cart.map(item => ({ 
            id: item.product.id, 
            quantity: item.quantity,
            price: item.product.discount_percent 
              ? item.product.price * (1 - item.product.discount_percent / 100) 
              : item.product.price
          }))
        })
      });
      if (res.ok) {
        alert('Venda realizada com sucesso!');
        setCart([]);
        setIsPaymentModalOpen(false);
        setCashReceived('');
        setSplitAmounts({ cash: '', card: '' });
        fetch(`/api/seller/products/${storeId}`).then(res => res.json()).then(setProducts);
      }
    } catch (error) {
      console.error('Error finalizing sale:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const change = paymentMethod === 'cash' && cashReceived ? parseFloat(cashReceived) - total : 0;

  const filteredProducts = products.filter(p => 
    (category === 'Geral' || p.category === category || (category === 'Promoções' && p.discount_percent)) &&
    (p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const categories = [
    { name: 'Geral', icon: LayoutGrid },
    { name: 'Promoções', icon: Tag },
    { name: 'Bebidas', icon: Beer },
    { name: 'Alimentos', icon: Apple },
    { name: 'Cosméticos', icon: Sparkles },
    { name: 'Café', icon: Coffee },
  ];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Product Selection */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-6 space-y-6">
          <div className="bg-orange-500 -mx-6 -mt-6 p-6 text-white rounded-b-[2rem] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">PDV - Loja 1</h2>
                <p className="text-orange-100 text-sm opacity-80">Terminal: Caixa 3</p>
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
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Pesquisar produto, S..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm text-lg"
                />
              </div>
              <button className="p-4 bg-white border border-zinc-200 rounded-2xl text-zinc-600 hover:bg-zinc-50 shadow-sm">
                <Barcode size={24} />
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
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
                    src={product.image_url} 
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
                        <span className="text-[7px] text-zinc-400 line-through">Kz {product.price.toLocaleString()}</span>
                      )}
                      <p className="font-black text-orange-600 text-[10px]">
                        Kz {(product.discount_percent 
                          ? product.price * (1 - product.discount_percent / 100) 
                          : product.price).toLocaleString()}
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

      {/* Cart / Checkout - Hidden on mobile if not active, or shown as sidebar on desktop */}
      <div className="hidden lg:flex w-80 flex-col">
        <Card className="flex-1 flex flex-col shadow-2xl border-zinc-200 rounded-[2rem]">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ShoppingCart size={20} className="text-orange-500" /> Carrinho
            </h3>
            <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-black">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} ITENS
            </span>
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
              cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 group">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0">
                    <img src={item.product.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-800 truncate">{item.product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button 
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-5 h-5 flex items-center justify-center bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200"
                      >
                        -
                      </button>
                      <span className="text-[10px] font-bold w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-5 h-5 flex items-center justify-center bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200"
                      >
                        +
                      </button>
                      <span className="text-[10px] text-zinc-400 ml-1">
                        x Kz {(item.product.discount_percent 
                          ? item.product.price * (1 - item.product.discount_percent / 100) 
                          : item.product.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-zinc-900">
                      Kz {((item.product.discount_percent 
                        ? item.product.price * (1 - item.product.discount_percent / 100) 
                        : item.product.price) * item.quantity).toLocaleString()}
                    </p>
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-rose-400 hover:text-rose-600 p-1 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-zinc-50 border-t border-zinc-100 space-y-4 rounded-b-[2rem]">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Subtotal</span>
                <span className="font-bold text-zinc-700">Kz {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Imposto (14%)</span>
                <span className="font-bold text-zinc-700">Kz {tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xl font-black pt-3 border-t border-zinc-200 text-zinc-900">
                <span>Total</span>
                <span className="text-orange-600">Kz {total.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsProformaModalOpen(true)}
                disabled={cart.length === 0}
                className="flex-1 bg-zinc-100 text-zinc-600 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                <FileText size={18} />
                Proforma
              </button>
              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 hover:bg-orange-600 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
              >
                Finalizar Venda
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Proforma Modal */}
      <Modal isOpen={isProformaModalOpen} onClose={() => setIsProformaModalOpen(false)} title="Gerar Fatura Proforma">
        <form onSubmit={handleCreateProforma} className="space-y-4">
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 mb-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Resumo dos Itens</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between text-xs">
                  <span className="text-zinc-600">{item.quantity}x {item.product.name}</span>
                  <span className="font-bold">Kz {((item.product.discount_percent 
                    ? item.product.price * (1 - item.product.discount_percent / 100) 
                    : item.product.price) * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-200 flex justify-between font-bold text-sm">
              <span>Total Proforma</span>
              <span className="text-orange-600">Kz {total.toLocaleString()}</span>
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
            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider mb-1">Total a Pagar</p>
            <h3 className="text-4xl font-black text-zinc-900">Kz {total.toLocaleString()}</h3>
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
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Quantia Recebida (Kz)</label>
                <input
                  type="number"
                  autoFocus
                  value={cashReceived}
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
                    Kz {Math.abs(change).toLocaleString()}
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
                    value={splitAmounts.cash}
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
                    value={splitAmounts.card}
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
                  Math.abs((parseFloat(splitAmounts.cash || '0') + parseFloat(splitAmounts.card || '0')) - total) < 0.01 
                    ? "text-emerald-600" 
                    : "text-rose-600"
                )}>
                  Kz {(parseFloat(splitAmounts.cash || '0') + parseFloat(splitAmounts.card || '0')).toLocaleString()} / {total.toLocaleString()}
                </span>
              </div>
            </motion.div>
          )}

          <button
            onClick={finalizeSale}
            disabled={isProcessing || (paymentMethod === 'cash' && (!cashReceived || change < 0)) || (paymentMethod === 'split' && Math.abs((parseFloat(splitAmounts.cash || '0') + parseFloat(splitAmounts.card || '0')) - total) > 0.01)}
            className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

const SellerDashboard = ({ user }: { user: User }) => {
  const [stats, setStats] = useState({ today: 0, last7Days: 0 });

  useEffect(() => {
    fetch(`/api/seller/dashboard-stats/${user.id}`)
      .then(res => res.json())
      .then(setStats);
  }, [user.id]);

  return (
    <div className="space-y-6">
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
        <Card className="p-8 border-zinc-100 shadow-sm rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full uppercase tracking-wider">Hoje</span>
          </div>
          <p className="text-orange-100 text-sm font-medium">Vendas Realizadas</p>
          <h3 className="text-4xl font-black mt-1">Kz {stats.today.toLocaleString()}</h3>
        </Card>

        <Card className="p-8 border-zinc-100 shadow-sm rounded-[2rem] bg-zinc-900 text-white border-none">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/10 rounded-2xl">
              <Calendar size={24} />
            </div>
            <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded-full uppercase tracking-wider">7 Dias</span>
          </div>
          <p className="text-zinc-400 text-sm font-medium">Total da Semana</p>
          <h3 className="text-4xl font-black mt-1">Kz {stats.last7Days.toLocaleString()}</h3>
        </Card>
      </div>

      <Card className="p-8 border-zinc-100 shadow-sm rounded-[2rem]">
        <h3 className="font-bold text-lg mb-6">Dicas de Venda</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Upselling', desc: 'Sugira complementos aos produtos principais.', icon: Plus },
            { title: 'Fidelização', desc: 'Peça o contacto para futuras promoções.', icon: Users },
            { title: 'Agilidade', desc: 'Mantenha o checkout rápido e eficiente.', icon: ShoppingCart },
          ].map((tip, i) => (
            <div key={i} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
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
  const [movements, setMovements] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'in' | 'out'>('in');

  const fetchMovements = () => {
    fetch(`/api/seller/cash-movements/${user.id}`)
      .then(res => res.json())
      .then(setMovements);
  };

  useEffect(() => {
    fetchMovements();
  }, [user.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/seller/cash-movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id: 1,
        seller_id: user.id,
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
                  type === 'in' ? "bg-emerald-500 text-white shadow-md" : "text-zinc-500"
                )}
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setType('out')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                  type === 'out' ? "bg-rose-500 text-white shadow-md" : "text-zinc-500"
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
                value={amount}
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
                "w-full py-4 rounded-xl font-black text-white shadow-lg transition-all active:scale-95",
                type === 'in' ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
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
                    <tr key={m.id} className="hover:bg-zinc-50 transition-colors">
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
                        {m.type === 'in' ? '+' : '-'} Kz {m.amount.toLocaleString()}
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

const SellerCloseCashier = ({ user }: { user: User }) => {
  const [session, setSession] = useState<any>(null);
  const [physicalAmount, setPhysicalAmount] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSession = () => {
    setLoading(true);
    fetch(`/api/seller/active-session/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setSession(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSession();
  }, [user.id]);

  const handleOpenSession = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/seller/open-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id: 1,
        seller_id: user.id,
        opening_amount: parseFloat(openingAmount)
      })
    });
    if (res.ok) {
      setOpeningAmount('');
      fetchSession();
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    const res = await fetch('/api/seller/close-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        physical_amount: parseFloat(physicalAmount),
        closing_amount: session.totals.expected
      })
    });
    if (res.ok) {
      setPhysicalAmount('');
      fetchSession();
      alert('Caixa fechado com sucesso!');
    }
  };

  if (loading) return <div className="p-12 text-center text-zinc-400">Carregando sessão...</div>;

  if (!session) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="p-8 border-zinc-100 shadow-2xl rounded-[2.5rem] text-center">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet size={40} />
          </div>
          <h2 className="text-2xl font-black mb-2">Abrir Caixa</h2>
          <p className="text-zinc-500 mb-8">Informe o valor inicial para começar as operações do dia.</p>
          
          <form onSubmit={handleOpenSession} className="space-y-6">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Valor de Abertura (Kz)</label>
              <input
                type="number"
                required
                value={openingAmount}
                onChange={e => setOpeningAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-black text-xl"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95"
            >
              Iniciar Sessão
            </button>
          </form>
        </Card>
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
          { label: 'Abertura', val: session.opening_amount, color: 'text-zinc-600' },
          { label: 'Vendas', val: session.totals.sales, color: 'text-emerald-600' },
          { label: 'Entradas', val: session.totals.in, color: 'text-emerald-600' },
          { label: 'Saídas', val: session.totals.out, color: 'text-rose-600' },
        ].map((item, i) => (
          <Card key={i} className="p-4 border-zinc-100 shadow-sm rounded-2xl">
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
              <span className="text-2xl font-black text-zinc-900">Kz {session.totals.expected.toLocaleString()}</span>
            </div>
            
            <div className="space-y-2 pt-4">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Valor Físico em Caixa</label>
              <input
                type="number"
                value={physicalAmount}
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
                <span className="font-black">Kz {diff.toLocaleString()}</span>
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
          <button
            onClick={handleCloseSession}
            disabled={!physicalAmount}
            className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-black transition-all active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
          >
            Fechar Caixa Agora
          </button>
        </Card>
      </div>
    </div>
  );
};

const SellerSettings = ({ user }: { user: User }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    password: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert("As senhas não coincidem");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
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

        <Card className="p-6 border-zinc-100 shadow-sm rounded-2xl hover:border-orange-200 transition-colors cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-50 text-zinc-600 rounded-xl group-hover:bg-zinc-900 group-hover:text-white transition-colors">
              <Info size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-zinc-800">Sobre o FactuModern</h4>
              <p className="text-xs text-zinc-500">Versão 1.0.4 - Sistema de Faturação Inteligente.</p>
            </div>
            <ChevronRight size={20} className="text-zinc-300" />
          </div>
        </Card>

        <Card className="p-6 border-zinc-100 shadow-sm rounded-2xl bg-rose-50 border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer group">
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
        title="Alterar Palavra-passe"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nova Palavra-passe</label>
              <input 
                type="password" 
                required
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Confirmar Palavra-passe</label>
              <input 
                type="password" 
                required
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
    </div>
  );
};

const SellerHistory = ({ user }: { user: User }) => {
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/transactions') // For demo, using admin route but filtering
      .then(res => res.json())
      .then(data => setTransactions(data.filter((t: any) => t.seller_id === user.id)));
  }, [user.id]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Histórico de Vendas</h2>
        <p className="text-zinc-500">Visualize todas as suas vendas realizadas.</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Data</th>
                <th className="px-6 py-4 font-semibold">Loja</th>
                <th className="px-6 py-4 font-semibold">Total</th>
                <th className="px-6 py-4 font-semibold">Itens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 text-sm">{new Date(t.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium">{t.store_name}</td>
                  <td className="px-6 py-4 text-sm font-bold">Kz {t.total_amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {JSON.parse(t.items).length} produtos
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      {user.role === 'admin' ? (
        <Routes>
          <Route path="/admin" element={<AdminPanel user={user} onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      ) : (
        <DashboardLayout user={user} onLogout={handleLogout}>
          <Routes>
            {user.role === 'owner' && (
              <>
                <Route path="/owner" element={<OwnerOverview user={user} />} />
                <Route path="/owner/stores" element={<MyStores user={user} />} />
                <Route path="/owner/stores/:storeId" element={<StoreAdmin user={user} />} />
                <Route path="/owner/reports" element={<OwnerReports user={user} />} />
                <Route path="/owner/settings" element={<OwnerSettings user={user} />} />
                <Route path="*" element={<Navigate to="/owner" replace />} />
              </>
            )}
            {user.role === 'seller' && (
              <>
                <Route path="/seller" element={<SellerPOS user={user} />} />
                <Route path="/seller/dashboard" element={<SellerDashboard user={user} />} />
                <Route path="/seller/movements" element={<SellerCashMovements user={user} />} />
                <Route path="/seller/close" element={<SellerCloseCashier user={user} />} />
                <Route path="/seller/history" element={<SellerHistory user={user} />} />
                <Route path="/seller/settings" element={<SellerSettings user={user} />} />
                <Route path="*" element={<Navigate to="/seller" replace />} />
              </>
            )}
            <Route path="/" element={<Navigate to={`/${user.role}`} replace />} />
          </Routes>
        </DashboardLayout>
      )}
    </Router>
  );
}
