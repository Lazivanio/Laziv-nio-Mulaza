import React, { useState } from 'react';
import { 
  UserCheck, 
  Search, 
  Clock, 
  Building2, 
  CheckCircle2, 
  FileDown, 
  RefreshCw,
  Activity,
  Users,
  LogIn,
  LogOut
} from 'lucide-react';
import { HRAttendance, Establishment, User } from '../../types';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

interface SystemPresencesTabProps {
  attendance: HRAttendance[];
  establishments: Establishment[];
  employees: User[];
  onRefresh?: () => void;
}

export const SystemPresencesTab: React.FC<SystemPresencesTabProps> = ({
  attendance,
  establishments,
  onRefresh
}) => {
  const [search, setSearch] = useState('');
  const [selectedEstablishment, setSelectedEstablishment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'finished'>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('today');

  // Filter attendance for system entries (or entries recorded upon login)
  const systemEntries = attendance.filter(att => att.type === 'system' || !!att.entry_time);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredEntries = systemEntries.filter(att => {
    // Search
    const empName = (att.employee_name || '').toLowerCase();
    const empEmail = (att.employee_email || '').toLowerCase();
    const estName = (att.establishment_name || '').toLowerCase();
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || empName.includes(searchLower) || empEmail.includes(searchLower) || estName.includes(searchLower);

    // Establishment
    const matchesEst = selectedEstablishment === 'all' || att.establishment_id?.toString() === selectedEstablishment;

    // Session status
    const isActive = !att.exit_time && att.date === todayStr;
    const matchesStatus = selectedStatus === 'all' || (selectedStatus === 'active' && isActive) || (selectedStatus === 'finished' && !isActive);

    // Date filter
    let matchesDate = true;
    if (selectedDateFilter === 'today') {
      matchesDate = att.date === todayStr;
    } else if (selectedDateFilter === '7days') {
      const entryDate = new Date(att.date);
      const diffDays = (new Date().getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
      matchesDate = diffDays <= 7;
    } else if (selectedDateFilter === 'month') {
      const currentMonth = new Date().toISOString().slice(0, 7);
      matchesDate = (att.date || '').startsWith(currentMonth);
    }

    return matchesSearch && matchesEst && matchesStatus && matchesDate;
  });

  // KPIs
  const entriesToday = systemEntries.filter(a => a.date === todayStr);
  const activeNowCount = entriesToday.filter(a => !a.exit_time).length;
  const totalEmployeesWithAccess = new Set(systemEntries.map(a => a.user_id)).size;

  const handleExportCSV = () => {
    const headers = ["Data", "Hora Entrada", "Hora Saida", "Funcionario", "Email / Role", "Estabelecimento", "Estado"];
    const rows = filteredEntries.map(att => [
      att.date,
      att.entry_time ? new Date(att.entry_time).toLocaleTimeString() : '--:--',
      att.exit_time ? new Date(att.exit_time).toLocaleTimeString() : (att.date === todayStr ? 'Ativa' : '--:--'),
      `"${att.employee_name || 'Utilizador'}"`,
      `"${att.employee_email || att.employee_role || ''}"`,
      `"${att.establishment_name || 'Principal'}"`,
      !att.exit_time && att.date === todayStr ? 'Sessao Ativa (Online)' : 'Finalizada'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Presencas_Sistema_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-black text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Controlo Automático de Acessos ao Sistema
          </div>
          <h2 className="text-xl font-black">Presenças & Entradas dos Funcionários</h2>
          <p className="text-zinc-400 text-xs mt-1">
            Registo em tempo real das conexões de utilizadores nos estabelecimentos e postos de venda
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex-1 sm:flex-none justify-center px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-sm border border-white/10 cursor-pointer"
            >
              <RefreshCw size={14} />
              Atualizar
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none justify-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <FileDown size={15} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Acessos Hoje</p>
            <p className="text-2xl font-black text-zinc-900">{entriesToday.length}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Entradas registadas</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Activity size={22} className="animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sessões Ativas</p>
            <p className="text-2xl font-black text-blue-600">{activeNowCount}</p>
            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Funcionários online agora</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Colaboradores</p>
            <p className="text-2xl font-black text-zinc-900">{totalEmployeesWithAccess}</p>
            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Com presenças registadas</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Estabelecimentos</p>
            <p className="text-2xl font-black text-zinc-900">{establishments.length}</p>
            <p className="text-[10px] text-purple-600 font-semibold mt-0.5">Postos com histórico</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por nome do funcionário, email ou estabelecimento..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Date filter */}
            <select
              value={selectedDateFilter}
              onChange={e => setSelectedDateFilter(e.target.value as any)}
              className="w-full sm:w-auto px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-black/5"
            >
              <option value="today">Hoje ({new Date().toLocaleDateString('pt-PT')})</option>
              <option value="7days">Últimos 7 Dias</option>
              <option value="month">Este Mês</option>
              <option value="all">Todo o Histórico</option>
            </select>

            {/* Establishment filter */}
            <select
              value={selectedEstablishment}
              onChange={e => setSelectedEstablishment(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-black/5"
            >
              <option value="all">Todos os Estabelecimentos</option>
              {establishments.map(est => (
                <option key={est.id} value={est.id.toString()}>{est.name}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              className="w-full sm:w-auto px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-black/5"
            >
              <option value="all">Todos os Estados</option>
              <option value="active">Sessões Ativas (Online)</option>
              <option value="finished">Sessões Finalizadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100 text-[11px] font-black text-zinc-500 uppercase tracking-wider">
                <th className="px-6 py-4">Funcionário / Utilizador</th>
                <th className="px-6 py-4">Estabelecimento</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Entrada no Sistema</th>
                <th className="px-6 py-4">Saída / Estado</th>
                <th className="px-6 py-4 text-right">Status da Presença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs font-medium">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                    <LogIn size={32} className="mx-auto mb-2 opacity-40 text-zinc-300" />
                    <p className="font-bold text-sm text-zinc-600">Nenhum registo de entrada encontrado</p>
                    <p className="text-xs text-zinc-400 mt-0.5">As entradas de funcionários ao fazerem login no sistema aparecerão aqui automaticamente.</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((att) => {
                  const isToday = att.date === todayStr;
                  const isActive = !att.exit_time && isToday;

                  let formattedEntryTime = '--:--';
                  if (att.entry_time) {
                    try {
                      if (att.entry_time.includes('T') || att.entry_time.includes(':')) {
                        const d = new Date(att.entry_time.includes('Z') || att.entry_time.includes('T') ? att.entry_time : att.entry_time.replace(' ', 'T'));
                        formattedEntryTime = isNaN(d.getTime()) ? att.entry_time : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      } else {
                        formattedEntryTime = att.entry_time;
                      }
                    } catch (e) {
                      formattedEntryTime = att.entry_time;
                    }
                  }

                  let formattedExitTime = '--:--';
                  if (att.exit_time) {
                    try {
                      const d = new Date(att.exit_time.includes('Z') || att.exit_time.includes('T') ? att.exit_time : att.exit_time.replace(' ', 'T'));
                      formattedExitTime = isNaN(d.getTime()) ? att.exit_time : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    } catch (e) {
                      formattedExitTime = att.exit_time;
                    }
                  }

                  return (
                    <tr key={att.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                            isActive ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-zinc-100 text-zinc-700"
                          )}>
                            {(att.employee_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-zinc-900">{att.employee_name || 'Funcionário'}</p>
                              {att.employee_role && (
                                <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 text-[9px] font-black uppercase rounded tracking-wider border border-zinc-200/60">
                                  {att.employee_role === 'seller' ? 'PDV / Vendedor' : att.employee_role}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400">{att.employee_email || att.employee_username || 'Acesso Direto'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-zinc-700 font-semibold">
                          <Building2 size={13} className="text-zinc-400" />
                          <span>{att.establishment_name || 'Principal'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-bold text-zinc-800">
                        {att.date ? new Date(att.date + 'T00:00:00').toLocaleDateString('pt-PT') : '--'}
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 text-zinc-800 rounded-lg font-mono font-bold text-[11px]">
                          <LogIn size={12} className="text-emerald-600" />
                          <span>{formattedEntryTime}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isActive ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>Sessão Ativa (Online)</span>
                          </div>
                        ) : att.exit_time ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-lg font-mono font-bold text-[11px]">
                            <LogOut size={12} className="text-amber-600" />
                            <span>{formattedExitTime}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[11px] italic">Encerrado</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1",
                          isActive ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                        )}>
                          <CheckCircle2 size={11} className={isActive ? "text-emerald-600" : "text-zinc-400"} />
                          <span>{isActive ? 'Presente (Online)' : 'Registado'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
