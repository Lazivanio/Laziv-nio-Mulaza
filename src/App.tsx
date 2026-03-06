import { useState, useEffect, ReactNode, FormEvent } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
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
  Power
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

// --- Pages ---

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

const AdminDashboard = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchData = () => {
    fetch('/api/admin/stores').then(res => res.json()).then(setStores);
    fetch('/api/admin/transactions').then(res => res.json()).then(setTransactions);
  };

  useEffect(fetchData, []);

  const toggleLicense = async (storeId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'expired' : 'active';
    const res = await fetch('/api/admin/stores/toggle-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, status: newStatus })
    });
    if (res.ok) fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Painel do Administrador</h2>
          <p className="text-zinc-500">Bem-vindo de volta, Master.</p>
        </div>
        <button className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-zinc-800 transition-colors">
          <Plus size={18} />
          Nova Licença
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total de Lojas" value={stores.length} icon={Store} trend="+12%" color="blue" />
        <StatCard label="Receita Total" value="Kz 1.250.000" icon={DollarSign} trend="+8%" color="emerald" />
        <StatCard label="Licenças Ativas" value={stores.filter(s => s.license_status === 'active').length} icon={CreditCard} color="amber" />
        <StatCard label="Suporte Pendente" value="3" icon={Users} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <h3 className="font-bold">Lojas Recentes</h3>
            <Link to="/admin/stores" className="text-sm text-zinc-500 hover:text-black flex items-center gap-1">
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {stores.map(store => (
              <div key={store.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-600">
                    <Store size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{store.name}</p>
                    <p className="text-xs text-zinc-500">Dono: {store.owner_name}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <button 
                    onClick={() => toggleLicense(store.id, store.license_status)}
                    className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors",
                      store.license_status === 'active' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                    )}
                  >
                    {store.license_status}
                  </button>
                  <p className="text-[10px] text-zinc-400">Expira em: {store.license_expiry}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <h3 className="font-bold">Últimas Transações do Sistema</h3>
            <Link to="/admin/payments" className="text-sm text-zinc-500 hover:text-black flex items-center gap-1">
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-600">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.store_name}</p>
                    <p className="text-xs text-zinc-500">{new Date(t.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">Kz {t.total_amount.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-400">Vendedor: {t.seller_name}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'stock' | 'staff' | 'reports' | 'settings'>('dashboard');
  const [storeData, setStoreData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price: '', stock: '', category: '', image_url: '' });
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', salary: '', shift_info: '' });
  const navigate = useNavigate();

  const fetchData = () => {
    fetch(`/api/owner/store-details/${storeId}`)
      .then(res => res.json())
      .then(setStoreData);
    fetch(`/api/owner/products/${storeId}`)
      .then(res => res.json())
      .then(setProducts);
    fetch(`/api/owner/staff/${storeId}`)
      .then(res => res.json())
      .then(setStaff);
  };

  useEffect(fetchData, [storeId]);

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/owner/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...productForm, store_id: Number(storeId), price: Number(productForm.price), stock: Number(productForm.stock) })
    });
    if (res.ok) {
      setIsProductModalOpen(false);
      setProductForm({ name: '', price: '', stock: '', category: '', image_url: '' });
      fetchData();
    }
  };

  const handleAddStaff = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/owner/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...staffForm, store_id: Number(storeId), salary: Number(staffForm.salary) })
    });
    if (res.ok) {
      setIsStaffModalOpen(false);
      setStaffForm({ name: '', email: '', password: '', salary: '', shift_info: '' });
      fetchData();
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Tem certeza que deseja eliminar este produto?')) {
      await fetch(`/api/owner/products/${id}`, { method: 'DELETE' });
      fetchData();
    }
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
            { id: 'stock', icon: Barcode, label: 'Stock' },
            { id: 'staff', icon: Users, label: 'Pessoal' },
            { id: 'reports', icon: BarChart3, label: 'Relatórios' },
            { id: 'settings', icon: Settings2, label: 'Configurações' },
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
                <button 
                  onClick={() => setIsProductModalOpen(true)}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Plus size={16} /> Novo Produto
                </button>
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
                        <td className="px-6 py-4 text-sm font-bold">Kz {product.price.toLocaleString()}</td>
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
                            <button className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg"><Edit2 size={16} /></button>
                            <button 
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
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

          {activeTab === 'staff' && (
            <Card>
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                <h3 className="font-bold">Equipa da Loja</h3>
                <button 
                  onClick={() => setIsStaffModalOpen(true)}
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
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Salário</p>
                        <p className="font-bold">Kz {member.salary.toLocaleString()}</p>
                      </div>
                      <button className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="font-bold">Configurações Administrativas</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">NIF da Empresa</label>
                      <input type="text" defaultValue={store.nif} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Telefone de Contacto</label>
                      <input type="text" defaultValue={store.phone} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Séries de Faturação</label>
                      <div className="p-4 border border-zinc-100 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">Série 2026/A</p>
                          <p className="text-xs text-zinc-500">Próximo número: FT 2026/124</p>
                        </div>
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase">Em Uso</span>
                      </div>
                    </div>
                  </div>
                  <button className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all">
                    Guardar Configurações
                  </button>
                </div>
              </Card>

              <Card>
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="font-bold">Estado da Loja</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">Visibilidade no Sistema</p>
                      <p className="text-xs text-zinc-500">Permitir vendas nesta unidade.</p>
                    </div>
                    <button className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      store.status === 'active' ? "bg-emerald-500" : "bg-zinc-200"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        store.status === 'active' ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>
                  <div className="pt-4 border-t border-zinc-100">
                    <button className="w-full flex items-center justify-center gap-2 py-3 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-colors">
                      <Trash2 size={18} />
                      Eliminar Loja Permanentemente
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
          
          {(activeTab === 'stock' || activeTab === 'reports') && (
            <Card className="p-12 text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto">
                <BarChart3 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Módulo em Desenvolvimento</h3>
                <p className="text-zinc-500 max-w-sm mx-auto">Estamos a preparar relatórios avançados e gestão de stock detalhada para esta unidade.</p>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Novo Produto">
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
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Categoria</label>
            <input 
              type="text" required
              value={productForm.category}
              onChange={e => setProductForm({...productForm, category: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">URL da Imagem</label>
            <input 
              type="text"
              value={productForm.image_url}
              onChange={e => setProductForm({...productForm, image_url: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
            />
          </div>
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold">Salvar Produto</button>
        </form>
      </Modal>

      <Modal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} title="Novo Colaborador">
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
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Senha Inicial</label>
            <input 
              type="password" required
              value={staffForm.password}
              onChange={e => setStaffForm({...staffForm, password: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" 
            />
          </div>
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
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold">Contratar Colaborador</button>
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

const OwnerSettings = ({ user }: { user: User }) => (
  <div className="p-12 text-center space-y-4">
    <div className="w-20 h-20 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto">
      <Settings size={40} />
    </div>
    <h3 className="text-xl font-bold">Configurações da Conta</h3>
    <p className="text-zinc-500">Gerencie seus dados de proprietário e preferências do sistema.</p>
  </div>
);

// --- Seller Module ---

const SellerPOS = ({ user }: { user: User }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [category, setCategory] = useState('Geral');
  const [search, setSearch] = useState('');
  
  // Payment states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetch('/api/seller/products/1').then(res => res.json()).then(setProducts);
  }, []);

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

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0.14;
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsPaymentModalOpen(true);
  };

  const finalizeSale = async () => {
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived);
      if (isNaN(received) || received < total) {
        alert('Dinheiro insuficiente ou valor inválido!');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/seller/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: 1,
          seller_id: user.id,
          total_amount: total,
          payment_method: paymentMethod,
          cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : total,
          items: cart.map(item => ({ id: item.product.id, quantity: item.quantity }))
        })
      });
      if (res.ok) {
        alert('Venda realizada com sucesso!');
        setCart([]);
        setIsPaymentModalOpen(false);
        setCashReceived('');
        fetch('/api/seller/products/1').then(res => res.json()).then(setProducts);
      }
    } catch (error) {
      console.error('Error finalizing sale:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const change = paymentMethod === 'cash' && cashReceived ? parseFloat(cashReceived) - total : 0;

  const filteredProducts = products.filter(p => 
    (category === 'Geral' || p.category === category || (category === 'Promoções' && p.is_promo)) &&
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
                  {product.is_promo && (
                    <div className="absolute top-1 right-1 bg-rose-600 text-white text-[7px] font-bold px-1 py-0.5 rounded-full uppercase shadow-sm">Promo</div>
                  )}
                </div>
                <div className="p-1.5 flex-1 flex flex-col min-h-0">
                  <h4 className="font-bold text-[10px] text-zinc-800 line-clamp-1 mb-0.5 leading-tight">{product.name}</h4>
                  <div className="mt-auto flex items-center justify-between gap-1">
                    <p className="font-black text-orange-600 text-[10px]">Kz {product.price.toLocaleString()}</p>
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
                      <span className="text-[10px] text-zinc-400 ml-1">x Kz {item.product.price.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-zinc-900">Kz {(item.product.price * item.quantity).toLocaleString()}</p>
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
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 hover:bg-orange-600 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
            >
              Finalizar Venda
              <ChevronRight size={20} />
            </button>
          </div>
        </Card>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Finalizar Pagamento">
        <div className="space-y-6">
          <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 text-center">
            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider mb-1">Total a Pagar</p>
            <h3 className="text-4xl font-black text-zinc-900">Kz {total.toLocaleString()}</h3>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Método de Pagamento</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'cash', label: 'Dinheiro', icon: Wallet },
                { id: 'card', label: 'Cartão', icon: CreditCard },
                { id: 'transfer', label: 'Transferência', icon: ArrowUpCircle },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    paymentMethod === m.id 
                      ? "border-orange-500 bg-orange-50 text-orange-600" 
                      : "border-zinc-100 bg-white text-zinc-500 hover:border-orange-200"
                  )}
                >
                  <m.icon size={24} />
                  <span className="text-[10px] font-black uppercase">{m.label}</span>
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

          <button
            onClick={finalizeSale}
            disabled={isProcessing || (paymentMethod === 'cash' && (!cashReceived || change < 0))}
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
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-zinc-500">Gerencie sua conta e preferências.</p>
      </div>

      <div className="space-y-4">
        <Card className="p-6 border-zinc-100 shadow-sm rounded-2xl hover:border-orange-200 transition-colors cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <UserIcon size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-zinc-800">Alterar Senha</h4>
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
      <DashboardLayout user={user} onLogout={handleLogout}>
        <Routes>
          {user.role === 'admin' && (
            <>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </>
          )}
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
    </Router>
  );
}
