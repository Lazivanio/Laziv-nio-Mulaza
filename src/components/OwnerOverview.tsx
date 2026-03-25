import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  TrendingUp, 
  Package, 
  Users, 
  ChevronRight, 
  Store, 
  BarChart3 
} from 'lucide-react';
import { User, Store as StoreType } from '../types';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div {...props} className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

const StatCard = ({ label, value, icon: Icon, trend, color }: any) => {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600"
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl", colors[color] || colors.blue)}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-lg",
            trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-zinc-900">{value}</p>
      </div>
    </Card>
  );
};

export const OwnerOverview = ({ user }: { user: User }) => {
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Visão Geral do Negócio</h2>
          <p className="text-zinc-500">Resumo de desempenho de todas as suas unidades.</p>
        </div>
        <div className="text-left md:text-right">
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
          value={`Kz ${(stats.todaySales || 0).toLocaleString()}`} 
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
                      <img src={store.logo_url || undefined} alt="" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
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
