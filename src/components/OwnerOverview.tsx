import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  TrendingUp, 
  Package, 
  Users, 
  ChevronRight, 
  Building2 as EstablishmentIcon, 
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowUpCircle,
  ArrowDownCircle,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  CreditCard,
  PieChart as PieChartIcon,
  ShieldAlert,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { User, Establishment as EstablishmentType } from '../types';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div {...props} className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm", className)}>
    {children}
  </div>
);

const StatCard = ({ label, value, icon: Icon, trend, color, subtitle }: any) => {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600"
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl", colors[color] || colors.blue)}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1",
            trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend.startsWith('+') ? <ArrowUpRight size={12} /> : null}
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-zinc-900">{value}</p>
        {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
      </div>
    </Card>
  );
};

const PIE_COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

export const OwnerOverview = ({ user }: { user: User }) => {
  const [stats, setStats] = useState<any>({ 
    todaySales: 0, 
    todayCount: 0,
    todayExpense: 0,
    monthlySales: 0,
    lowStockCount: 0, 
    staffCount: 0,
    topProducts: [],
    recentTransactions: [],
    salesByDay: [],
    salesByEstablishment: [],
    paymentMethods: [],
    totalExpenses: 0,
    financialHealth: { enabled: false, enoughForSalaries: false, totalSalaries: 0, monthlyIncome: 0 }
  });
  const [establishments, setEstablishments] = useState<EstablishmentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    async function fetchData() {
      try {
        const [statsRes, establishmentsRes] = await Promise.all([
          fetch(`/api/owner/dashboard-stats/all?ownerId=${user.id}`),
          fetch(`/api/owner/establishments/${user.id}`)
        ]);

        if (!statsRes.ok || !establishmentsRes.ok) {
          throw new Error(`Server error: ${statsRes.status} / ${establishmentsRes.status}`);
        }

        const statsData = await statsRes.json();
        const establishmentsData = await establishmentsRes.json();

        if (statsData && !statsData.error) {
          setStats((prev: any) => ({
            ...prev,
            ...statsData,
            topProducts: Array.isArray(statsData.topProducts) ? statsData.topProducts : prev.topProducts,
            recentTransactions: Array.isArray(statsData.recentTransactions) ? statsData.recentTransactions : prev.recentTransactions,
            salesByDay: Array.isArray(statsData.salesByDay) ? statsData.salesByDay : prev.salesByDay,
            salesByEstablishment: Array.isArray(statsData.salesByEstablishment) ? statsData.salesByEstablishment : prev.salesByEstablishment,
            paymentMethods: Array.isArray(statsData.paymentMethods) ? statsData.paymentMethods : prev.paymentMethods
          }));
        }
        setEstablishments(Array.isArray(establishmentsData) ? establishmentsData : []);
      } catch (err) {
        console.error("Error fetching overview data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  const profit = stats.monthlySales - stats.totalExpenses;
  const profitMargin = stats.monthlySales > 0 ? (profit / stats.monthlySales) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Visão Geral do Negócio</h2>
          <p className="text-zinc-500">
            {user.role === 'owner' ? 'Resumo de desempenho de todos os seus estabelecimentos.' : 'Resumo de desempenho do seu estabelecimento gerido.'}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Estado Global</p>
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <Activity size={16} />
            <span>Operacional</span>
          </div>
        </div>
      </div>

      {stats.financialHealth?.enabled && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-4 rounded-2xl border flex items-center justify-between gap-4",
              stats.financialHealth.enoughForSalaries 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                : "bg-amber-50 border-amber-100 text-amber-800"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl",
                stats.financialHealth.enoughForSalaries ? "bg-emerald-100" : "bg-amber-100"
              )}>
                {stats.financialHealth.enoughForSalaries ? <CheckCircle2 className="text-emerald-600" size={20} /> : <AlertCircle className="text-amber-600" size={20} />}
              </div>
              <div>
                <p className="text-sm font-bold">Lembrete Financeiro</p>
                <p className="text-xs opacity-90">
                  {stats.financialHealth.enoughForSalaries 
                    ? `Parabéns! O saldo acumulado este mês (Kz ${(stats.financialHealth.monthlyIncome || 0).toLocaleString()}) é suficiente para cobrir os salários dos funcionários (Kz ${(stats.financialHealth.totalSalaries || 0).toLocaleString()}).`
                    : `Atenção: O saldo acumulado até agora (Kz ${(stats.financialHealth.monthlyIncome || 0).toLocaleString()}) ainda não é suficiente para cobrir os salários (Kz ${(stats.financialHealth.totalSalaries || 0).toLocaleString()}).`
                  }
                </p>
              </div>
            </div>
            <Link to="/owner/rh" className="text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
              Ir para RH <ChevronRight size={14} />
            </Link>
          </motion.div>
        </AnimatePresence>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Entradas Hoje" 
          value={`Kz ${(stats.todaySales || 0).toLocaleString()}`} 
          icon={ArrowUpCircle} 
          trend="+5.2%" 
          color="emerald"
          subtitle={`${stats.todayCount} vendas realizadas`}
        />
        <StatCard 
          label="Saídas Hoje" 
          value={`Kz ${(stats.todayExpense || 0).toLocaleString()}`} 
          icon={ArrowDownCircle} 
          color="rose" 
          subtitle="Total de despesas do dia"
        />
        <StatCard 
          label="Faturamento Mensal" 
          value={`Kz ${(stats.monthlySales || 0).toLocaleString()}`} 
          icon={DollarSign} 
          color="blue" 
          subtitle={`Estimativa de lucro: Kz ${(profit || 0).toLocaleString()}`}
        />
        <StatCard 
          label="Margem Operacional" 
          value={`${profitMargin.toFixed(1)}%`} 
          icon={Activity} 
          color="indigo" 
          subtitle="Baseado no faturamento mensal"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg">Tendência de Vendas</h3>
              <p className="text-xs text-zinc-500">Desempenho nos últimos 7 dias</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.salesByDay}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short' })}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickFormatter={(val) => `Kz ${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [`Kz ${(val || 0).toLocaleString()}`, 'Vendas']}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#18181b" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-6">Meios de Pagamento</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.paymentMethods || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(stats.paymentMethods || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [`Kz ${val.toLocaleString()}`, 'Total']}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {(stats.paymentMethods || []).map((pm: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">{pm.name}</span>
                <span className="font-bold">Kz {(pm.value || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-6">Desempenho por Estabelecimento</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.salesByEstablishment || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [`Kz ${val.toLocaleString()}`, 'Total']}
                />
                <Bar dataKey="total" fill="#18181b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-6">Top Produtos</h3>
          <div className="space-y-6">
            {stats.topProducts.length > 0 ? stats.topProducts.map((product: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 truncate max-w-[150px]">{product.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{product.total_qty} unidades vendidas</p>
                  </div>
                </div>
                <div className="w-16 h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-zinc-900" 
                    style={{ width: `${(product.total_qty / stats.topProducts[0].total_qty) * 100}%` }}
                  />
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                <Package size={32} className="mb-2 opacity-20" />
                <p className="text-xs font-medium">Sem dados de vendas</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-6">Estado das Licenças</h3>
          <div className="space-y-4">
            {establishments.map(establishment => {
              const expiryDate = new Date(establishment.license_expiry);
              const today = new Date();
              const diffTime = expiryDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isExpiring = diffDays < 30;
              const isExpired = diffDays <= 0;

              return (
                <div key={establishment.id} className="p-3 rounded-xl border border-zinc-100 bg-zinc-50">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-sm">{establishment.name}</p>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                      isExpired ? "bg-rose-100 text-rose-600" : (isExpiring ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600")
                    )}>
                      {isExpired ? 'Expirada' : (isExpiring ? 'Expira em breve' : 'Ativa')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar size={14} />
                    <span>Expira em: {expiryDate.toLocaleDateString('pt-AO')}</span>
                  </div>
                  {isExpiring && !isExpired && (
                    <p className="text-[10px] text-amber-600 font-bold mt-2 flex items-center gap-1">
                      <ShieldAlert size={12} />
                      Renove em {diffDays} dias
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <Link 
            to="/owner/settings" 
            className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors"
          >
            Renovar Licenças <ChevronRight size={16} />
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <h3 className="font-bold">Atividade Recente</h3>
            <div className="p-1.5 bg-zinc-100 rounded-lg text-zinc-500">
              <Clock size={16} />
            </div>
          </div>
          <div className="divide-y divide-zinc-100">
            {(stats.recentTransactions || []).length > 0 ? (stats.recentTransactions || []).map((tx: any) => (
              <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Venda Realizada</p>
                    <p className="text-xs text-zinc-500">{tx.establishment_name} • {new Date(tx.timestamp).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-emerald-600">+ Kz {(tx.total_amount || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{tx.payment_method}</p>
                </div>
              </div>
            )) : (
              <div className="p-12 text-center text-zinc-400">
                <Activity size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma atividade recente</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-zinc-900 text-white border-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BarChart3 size={120} />
          </div>
          <div className="p-8 relative z-10 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Análise Financeira</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Seu faturamento mensal é de Kz {(stats.monthlySales || 0).toLocaleString()}. 
                Considerando as despesas com compras e salários (Kz {(stats.totalExpenses || 0).toLocaleString()}), 
                sua margem operacional estimada é de {profitMargin.toFixed(1)}%.
              </p>
            </div>
            <Link 
              to="/owner/reports"
              className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-100 transition-colors w-fit"
            >
              Ver Relatórios Detalhados <ChevronRight size={18} />
            </Link>
          </div>
        </Card>
      </div>

      {stats.lowStockCount > 0 && (
        <Card className="bg-rose-50 border-rose-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-rose-900">Atenção ao Stock</h4>
            <p className="text-sm text-rose-700">Existem {stats.lowStockCount} produtos com stock abaixo do limite mínimo. Recomendamos a reposição imediata para evitar ruturas.</p>
          </div>
          <Link 
            to="/owner/purchases" 
            className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors whitespace-nowrap"
          >
            Fazer Pedido
          </Link>
        </Card>
      )}
    </div>
  );
};
