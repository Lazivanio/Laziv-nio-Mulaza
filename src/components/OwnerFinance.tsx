import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Plus, 
  Filter, 
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ChevronRight,
  PieChart as PieChartIcon,
  Download,
  FileText,
  Coins,
  FileBarChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { User, Establishment, FinancialTransaction, AccountReceivable, AccountPayable } from '../types';
import { OwnerCurrencies } from './OwnerCurrencies';

interface OwnerFinanceProps {
  user: User;
  defaultTab?: 'summary' | 'incomes' | 'expenses' | 'receivable' | 'payable' | 'currencies' | 'billing';
}

interface FinancialSummary {
  today: { income: number; expense: number; profit: number };
  month: { income: number; expense: number; profit: number };
  balances: { cash: number; bank: number };
  pending: { receivable: number; payable: number };
}

export const OwnerFinance: React.FC<OwnerFinanceProps> = ({ user, defaultTab = 'summary' }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'incomes' | 'expenses' | 'receivable' | 'payable' | 'currencies' | 'billing'>(defaultTab);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [billing, setBilling] = useState<any[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense' | 'receivable' | 'payable'>('income');

  // Product sales profit calculation output from API
  const [productProfit, setProductProfit] = useState<{ revenue: number; cost: number; profit: number }>({
    revenue: 0,
    cost: 0,
    profit: 0
  });

  // Billing filters
  const [billingFilters, setBillingFilters] = useState({
    startDate: '',
    endDate: '',
    type: ''
  });

  // Profit calculations date filters
  const [profitStartDate, setProfitStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [profitEndDate, setProfitEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Form states
  const [formData, setFormData] = useState({
    establishment_id: '',
    type: 'income',
    category: '',
    amount: '',
    payment_method: 'cash',
    description: '',
    date: new Date().toISOString().split('T')[0],
    client_name: '',
    supplier_name: '',
    due_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [user.id, selectedEstablishmentId, billingFilters, profitStartDate, profitEndDate]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/owner/settings/${user.id}`);
      const data = await response.json();
      if (data && data.billing_config) {
        const config = typeof data.billing_config === 'string' ? JSON.parse(data.billing_config) : data.billing_config;
        setBillingFilters(prev => ({
          ...prev,
          ...config
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveBillingSettings = async (newConfig: any) => {
    try {
      await fetch('/api/owner/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: user.id,
          billing_config: newConfig
        })
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const updateBillingFilters = (updates: Partial<typeof billingFilters>) => {
    const newFilters = { ...billingFilters, ...updates };
    setBillingFilters(newFilters);
    saveBillingSettings(newFilters);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = selectedEstablishmentId ? `?establishmentId=${selectedEstablishmentId}` : '';
      
      let billingQuery = queryParams;
      if (billingFilters.startDate) billingQuery += (billingQuery ? '&' : '?') + `startDate=${billingFilters.startDate}`;
      if (billingFilters.endDate) billingQuery += (billingQuery ? '&' : '?') + `endDate=${billingFilters.endDate}`;
      if (billingFilters.type) billingQuery += (billingQuery ? '&' : '?') + `type=${billingFilters.type}`;

      let profitQuery = queryParams;
      if (profitStartDate) profitQuery += (profitQuery ? '&' : '?') + `startDate=${profitStartDate}`;
      if (profitEndDate) profitQuery += (profitQuery ? '&' : '?') + `endDate=${profitEndDate}`;

      const endpoints = [
        `/api/owner/financial/summary/${user.id}${queryParams}`,
        `/api/owner/financial/transactions/${user.id}${queryParams}`,
        `/api/owner/financial/receivable/${user.id}${queryParams}`,
        `/api/owner/financial/payable/${user.id}${queryParams}`,
        `/api/owner/establishments/${user.id}`,
        `/api/owner/billing/${user.id}${billingQuery}`,
        `/api/owner/financial/product-profit/${user.id}${profitQuery}`
      ];

      const responses = await Promise.all(endpoints.map(url => fetch(url)));
      
      const data = await Promise.all(responses.map(async (res, index) => {
        if (!res.ok) {
          const text = await res.text();
          console.error(`Error fetching ${endpoints[index]}: ${res.status} ${res.statusText}`, text);
          return null;
        }
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          return res.json();
        } else {
          const text = await res.text();
          console.error(`Non-JSON response from ${endpoints[index]}:`, text);
          return null;
        }
      }));

      const [summaryData, transData, recData, payData, establishmentsData, billingData, profitData] = data;

      if (summaryData) setSummary(summaryData);
      if (transData) setTransactions(transData);
      if (recData) setReceivables(recData);
      if (payData) setPayables(payData);
      if (establishmentsData) setEstablishments(Array.isArray(establishmentsData) ? establishmentsData : []);
      if (billingData) setBilling(Array.isArray(billingData) ? billingData : []);
      if (profitData) setProductProfit(profitData);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let endpoint = '';
    let body: any = { ...formData, owner_id: user.id };

    if (modalType === 'income' || modalType === 'expense') {
      endpoint = '/api/owner/financial/transactions';
      body.type = modalType;
    } else if (modalType === 'receivable') {
      endpoint = '/api/owner/financial/receivable';
    } else if (modalType === 'payable') {
      endpoint = '/api/owner/financial/payable';
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
        // Reset form
        setFormData({
          establishment_id: '',
          type: 'income',
          category: '',
          amount: '',
          payment_method: 'cash',
          description: '',
          date: new Date().toISOString().split('T')[0],
          client_name: '',
          supplier_name: '',
          due_date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Error saving financial record:', error);
    }
  };

  const handleStatusUpdate = async (type: 'receivable' | 'payable', id: number, status: string) => {
    try {
      await fetch(`/api/owner/financial/${type}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(value);
  };

  const renderSummary = () => {
    if (!summary) return null;

    return (
      <div className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Entradas (Hoje)" 
            value={formatCurrency(summary.today.income)} 
            icon={ArrowUpCircle} 
            color="text-emerald-600" 
            bgColor="bg-emerald-50"
          />
          <StatCard 
            title="Saídas (Hoje)" 
            value={formatCurrency(summary.today.expense)} 
            icon={ArrowDownCircle} 
            color="text-rose-600" 
            bgColor="bg-rose-50"
          />
          <StatCard 
            title="Lucro Líquido" 
            value={formatCurrency(summary.today.profit)} 
            icon={TrendingUp} 
            color={summary.today.profit >= 0 ? "text-blue-600" : "text-rose-600"} 
            bgColor="bg-blue-50"
          />
          <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Margem de Lucro</span>
              <PieChartIcon size={16} className="text-indigo-500" />
            </div>
            <div>
              <div className="text-xl font-black text-zinc-900">
                {summary.month.income > 0 ? ((summary.month.profit / summary.month.income) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-[10px] text-zinc-500 font-medium">Global do Mês</p>
            </div>
          </div>
        </div>

        {/* Balances & Pending */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-500" />
                Resumo de Saldos
              </h3>
              <span className="px-2 py-1 bg-zinc-100 text-[10px] font-bold rounded-lg text-zinc-500 uppercase tracking-tighter">Tempo Real</span>
            </div>
            <div className="space-y-4">
              <div className="group flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100/80 rounded-xl transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-tight">Total em Caixa</p>
                    <p className="text-xl font-black text-zinc-900 tracking-tight">{formatCurrency(summary.balances.cash)}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
              </div>
              <div className="group flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100/80 rounded-xl transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-tight">Total em Banco</p>
                    <p className="text-xl font-black text-zinc-900 tracking-tight">{formatCurrency(summary.balances.bank)}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Compromissos Financeiros
              </h3>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-zinc-400">Pendente</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-orange-50/50 border border-orange-100 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <ArrowUpCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-tight">A Receber</p>
                    <p className="text-xl font-black text-orange-700 tracking-tight">{formatCurrency(summary.pending.receivable)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('receivable')}
                  className="px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-black rounded-lg hover:bg-orange-200 transition-all uppercase"
                >
                  Ver Lista
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-rose-50/50 border border-rose-100 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <ArrowDownCircle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-tight">A Pagar</p>
                    <p className="text-xl font-black text-rose-700 tracking-tight">{formatCurrency(summary.pending.payable)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('payable')}
                  className="px-3 py-1 bg-rose-100 text-rose-700 text-[10px] font-black rounded-lg hover:bg-rose-200 transition-all uppercase"
                >
                  Ver Lista
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profit by Date Filter Block */}
        {(() => {
          const revenue = productProfit.revenue || 0;
          const cost = productProfit.cost || 0;
          const profit = productProfit.profit || 0;
          const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

          return (
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-orange-500" />
                    Quadro de Lucros por Período
                  </h3>
                  <p className="text-xs text-zinc-500">Filtragem de lucros reais baseada nos preços de venda menos os preços de compra dos produtos (Kz).</p>
                </div>
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg p-2 self-start md:self-auto">
                  <Calendar size={14} className="text-zinc-400" />
                  <input 
                    type="date" 
                    className="text-xs outline-none bg-transparent text-zinc-600 font-medium"
                    value={profitStartDate}
                    onChange={e => setProfitStartDate(e.target.value)}
                  />
                  <span className="text-zinc-400 text-xs font-bold">até</span>
                  <input 
                    type="date" 
                    className="text-xs outline-none bg-transparent text-zinc-600 font-medium"
                    value={profitEndDate}
                    onChange={e => setProfitEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Receipts */}
                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block mb-1">Preço Total de Venda</span>
                  <p className="text-2xl font-black text-emerald-900">{formatCurrency(revenue)}</p>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-2">
                    Soma das vendas brutas de produtos no período
                  </span>
                </div>

                {/* Dynamic Net Profit */}
                <div className={cn(
                  "p-5 rounded-xl border",
                  profit >= 0 
                    ? "bg-blue-50/60 border-blue-100 text-blue-900" 
                    : "bg-red-50/60 border-red-100 text-red-900"
                )}>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider block mb-1",
                    profit >= 0 ? "text-blue-800" : "text-red-800"
                  )}>
                    Lucro Líquido Real
                  </span>
                  <p className={cn(
                    "text-2xl font-black animate-fade-in",
                    profit >= 0 ? "text-blue-950" : "text-red-950"
                  )}>
                    {formatCurrency(profit)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded",
                      profit >= 0 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
                    )}>
                      {profitMargin >= 0 ? '+' : ''}{profitMargin.toFixed(1)}% de Rentabilidade
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Transações Recentes</h3>
            <button 
              onClick={() => setActiveTab('incomes')}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Ver Tudo
            </button>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3">Categoria</th>
                  <th className="px-6 py-3">Método</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.slice(0, 5).map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.description}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{t.payment_method}</td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Transactions List */}
          <div className="md:hidden divide-y divide-zinc-100 px-4">
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} className="py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl",
                    t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 line-clamp-1">{t.description}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t.category} • {new Date(t.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={cn(
                  "text-right font-black text-sm",
                  t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                )}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTransactions = (type: 'income' | 'expense') => {
    const filtered = transactions.filter(t => t.type === type);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {type === 'income' ? <TrendingUp className="text-emerald-600" /> : <TrendingDown className="text-rose-600" />}
            {type === 'income' ? 'Entradas (Receitas)' : 'Saídas (Despesas)'}
          </h2>
          <button 
            onClick={() => {
              setModalType(type);
              setFormData(prev => ({ ...prev, establishment_id: selectedEstablishmentId }));
              setShowModal(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors ${type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
          >
            <Plus className="w-4 h-4" />
            Nova {type === 'income' ? 'Receita' : 'Despesa'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3">Categoria</th>
                  <th className="px-6 py-3">Método</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.description}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{t.payment_method}</td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Nenhuma {type === 'income' ? 'receita' : 'despesa'} encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderReceivables = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowUpCircle className="text-orange-600" />
          Contas a Receber
        </h2>
        <button 
          onClick={() => {
            setModalType('receivable');
            setFormData(prev => ({ ...prev, establishment_id: selectedEstablishmentId }));
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Registro
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Vencimento</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Valor</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receivables.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(r.due_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.client_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                      r.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {r.status === 'paid' ? 'Liquidado' : r.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-gray-900">
                    {formatCurrency(r.amount)}
                  </td>
                  <td className="px-6 py-4">
                    {/* Manual liquidation removed as per user request */}
                  </td>
                </tr>
              ))}
              {receivables.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma conta a receber encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPayables = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowDownCircle className="text-rose-600" />
          Contas a Pagar
        </h2>
        <button 
          onClick={() => {
            setModalType('payable');
            setFormData(prev => ({ ...prev, establishment_id: selectedEstablishmentId }));
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Registro
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Vencimento</th>
                <th className="px-6 py-3">Fornecedor</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Valor</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payables.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(p.due_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.supplier_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                      p.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {p.status === 'paid' ? 'Liquidado' : p.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-gray-900">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-6 py-4">
                    {/* Manual liquidation removed as per user request */}
                  </td>
                </tr>
              ))}
              {payables.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma conta a pagar encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileBarChart className="text-indigo-600" />
          Faturação e Documentos
        </h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-zinc-200 rounded-lg">
            <Calendar size={14} className="text-zinc-400" />
            <input 
              type="date" 
              className="text-xs outline-none bg-transparent"
              value={billingFilters.startDate}
              onChange={e => updateBillingFilters({ startDate: e.target.value })}
            />
            <span className="text-zinc-300">até</span>
            <input 
              type="date" 
              className="text-xs outline-none bg-transparent"
              value={billingFilters.endDate}
              onChange={e => updateBillingFilters({ endDate: e.target.value })}
            />
          </div>

          <select 
            className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
            value={billingFilters.type}
            onChange={e => updateBillingFilters({ type: e.target.value })}
          >
            <option value="">Todos os Tipos</option>
            <option value="FT">Fatura (FT)</option>
            <option value="FR">Fatura Recibo (FR)</option>
            <option value="NC">Nota de Crédito (NC)</option>
            <option value="ND">Nota de Débito (ND)</option>
            <option value="PP">Fatura Proforma (PP)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Número</th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Método</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {billing.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-black text-indigo-600">{item.invoice_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(item.invoice_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.client_name}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider",
                      item.doc_type === 'NC' ? "bg-rose-50 text-rose-600" :
                      item.doc_type === 'PP' ? "bg-zinc-100 text-zinc-600" :
                      "bg-emerald-50 text-emerald-600"
                    )}>
                      {item.doc_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">{item.payment_method || '---'}</td>
                  <td className={cn(
                    "px-6 py-4 text-sm font-black text-right",
                    item.doc_type === 'NC' ? "text-rose-600" : "text-zinc-900"
                  )}>
                    {item.doc_type === 'NC' ? '-' : ''}{formatCurrency(item.total_amount)}
                  </td>
                </tr>
              ))}
              {billing.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                    Nenhum registro de faturação encontrado para os critérios selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão Financeira</h1>
          <p className="text-gray-500">Controle total de receitas, despesas e fluxo de caixa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {establishments.length > 1 && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
              <button
                onClick={() => setSelectedEstablishmentId('')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  selectedEstablishmentId === '' 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Todos os Estabelecimentos
              </button>
              {establishments.map(establishment => (
                <button
                  key={establishment.id}
                  onClick={() => setSelectedEstablishmentId(establishment.id.toString())}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    selectedEstablishmentId === establishment.id.toString()
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {establishment.name}
                </button>
              ))}
            </div>
          )}
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar Relatório
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto">
        <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={LayoutDashboard} label="Resumo" />
        <TabButton active={activeTab === 'incomes'} onClick={() => setActiveTab('incomes')} icon={TrendingUp} label="Entradas" />
        <TabButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={TrendingDown} label="Saídas" />
        <TabButton active={activeTab === 'receivable'} onClick={() => setActiveTab('receivable')} icon={ArrowUpCircle} label="A Receber" />
        <TabButton active={activeTab === 'payable'} onClick={() => setActiveTab('payable')} icon={ArrowDownCircle} label="A Pagar" />
        <TabButton active={activeTab === 'currencies'} onClick={() => setActiveTab('currencies')} icon={Coins} label="Moedas" />
        <TabButton active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} icon={FileBarChart} label="Faturação" />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'summary' && renderSummary()}
          {activeTab === 'billing' && renderBilling()}
          {activeTab === 'incomes' && renderTransactions('income')}
          {activeTab === 'expenses' && renderTransactions('expense')}
          {activeTab === 'receivable' && renderReceivables()}
          {activeTab === 'payable' && renderPayables()}
          {activeTab === 'currencies' && <OwnerCurrencies user={user} />}
        </motion.div>
      </AnimatePresence>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 capitalize">
                Novo Registro: {modalType === 'income' ? 'Receita' : modalType === 'expense' ? 'Despesa' : modalType === 'receivable' ? 'Conta a Receber' : 'Conta a Pagar'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estabelecimento</label>
                  <select 
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.establishment_id}
                    onChange={e => setFormData({...formData, establishment_id: e.target.value})}
                  >
                    <option value="">Selecione o Estabelecimento</option>
                    {establishments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {(modalType === 'income' || modalType === 'expense') && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select 
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="">Selecione a Categoria</option>
                      {modalType === 'income' ? (
                        <>
                          <option value="Venda">Venda</option>
                          <option value="Transferência">Transferência</option>
                          <option value="Multicaixa">Multicaixa</option>
                          <option value="Serviço">Serviço</option>
                          <option value="Outros">Outros</option>
                        </>
                      ) : (
                        <>
                          <option value="Fornecedor">Fornecedor</option>
                          <option value="Materiais">Materiais</option>
                          <option value="Salário">Salário</option>
                          <option value="Aluguel">Aluguel</option>
                          <option value="Energia">Energia</option>
                          <option value="Água">Água</option>
                          <option value="Internet">Internet</option>
                          <option value="Manutenção">Manutenção</option>
                          <option value="Transporte">Transporte</option>
                          <option value="Outros">Outros</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {modalType === 'receivable' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                    <input 
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.client_name}
                      onChange={e => setFormData({...formData, client_name: e.target.value})}
                    />
                  </div>
                )}

                {modalType === 'payable' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Fornecedor</label>
                    <input 
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.supplier_name}
                      onChange={e => setFormData({...formData, supplier_name: e.target.value})}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (AOA)</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {modalType === 'receivable' || modalType === 'payable' ? 'Vencimento' : 'Data'}
                  </label>
                  <input 
                    type="date"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={modalType === 'receivable' || modalType === 'payable' ? formData.due_date : formData.date}
                    onChange={e => setFormData({...formData, [modalType === 'receivable' || modalType === 'payable' ? 'due_date' : 'date']: e.target.value})}
                  />
                </div>

                {(modalType === 'income' || modalType === 'expense') && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pagamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['cash', 'transfer', 'multicaixa', 'other'].map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setFormData({...formData, payment_method: method as any})}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                            formData.payment_method === method 
                              ? 'bg-indigo-600 border-indigo-600 text-white' 
                              : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'
                          }`}
                        >
                          {method === 'cash' ? 'Dinheiro' : method === 'transfer' ? 'Transferência' : method === 'multicaixa' ? 'Multicaixa' : 'Outro'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Observações</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: any; color: string; bgColor: string }> = ({ title, value, icon: Icon, color, bgColor }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <div className={`p-2 ${bgColor} rounded-lg`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
    <p className="text-sm text-gray-500 font-medium">{title}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      active 
        ? 'bg-white text-indigo-600 shadow-sm' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const LayoutDashboard = (props: any) => <PieChartIcon {...props} />;
const X = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
