import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Calendar, User, Building, Shield, Activity, 
  ChevronLeft, ChevronRight, Download, Eye, FileText, Info,
  AlertTriangle, AlertCircle, CheckCircle, Database, Globe, Smartphone,
  X, BarChart3, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface SystemLog {
  id: number;
  user_id: number;
  owner_id: number;
  establishment_id: number;
  module: string;
  action_type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  entity_type: string;
  entity_id: string;
  old_value: string;
  new_value: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure';
  created_at: string;
  user_name: string;
  owner_name: string;
}

const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [limit] = useState(25);

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    ownerId: '',
    module: '',
    actionType: '',
    severity: '',
    search: '',
    entityType: ''
  });

  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      const response = await fetch(`/api/platform/logs?${queryParams}`);
      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchLogs();
  };

  const handleExport = () => {
    const queryParams = new URLSearchParams({
      startDate: filters.startDate,
      endDate: filters.endDate,
      ownerId: filters.ownerId
    });
    window.open(`/api/platform/logs/export?${queryParams}`, '_blank');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-amber-600 bg-amber-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      default: return Activity;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'success' 
      ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
      : 'text-rose-600 bg-rose-50 border-rose-100';
  };

  const renderDiff = (oldVal: string, newVal: string) => {
    try {
      if (!oldVal && !newVal) return <span className="text-gray-400 italic">Sem alterações detalhadas</span>;
      
      const oldObj = oldVal ? JSON.parse(oldVal) : {};
      const newObj = newVal ? JSON.parse(newVal) : {};
      
      const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
      
      return (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {keys.map(key => {
            const isDifferent = JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key]);
            if (!isDifferent) return null;
            
            return (
              <div key={key} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{key}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <div className="text-[10px] text-red-400 font-bold mb-1">ANTES</div>
                    <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
                      {oldObj[key] === undefined ? '(nulo)' : JSON.stringify(oldObj[key], null, 2)}
                    </pre>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <div className="text-[10px] text-emerald-400 font-bold mb-1">DEPOIS</div>
                    <pre className="text-xs text-emerald-700 whitespace-pre-wrap font-mono">
                      {newObj[key] === undefined ? '(nulo)' : JSON.stringify(newObj[key], null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    } catch (e) {
      return (
        <div className="grid grid-cols-2 gap-4">
          <pre className="p-3 bg-gray-50 rounded-lg text-xs">{oldVal || '(vazio)'}</pre>
          <pre className="p-3 bg-gray-50 rounded-lg text-xs">{newVal || '(vazio)'}</pre>
        </div>
      );
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-zinc-400" />
            Auditoria e Logs do Sistema
          </h1>
          <p className="text-zinc-500 text-sm">Monitorização de ações críticas e segurança da plataforma</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 transition-all text-sm font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium shadow-sm ${
              showFilters ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Recolher Filtros' : 'Filtros Avançados'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6 shadow-sm">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Busca Livre</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="text" 
                      placeholder="Descrição, ID..." 
                      className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                      value={filters.search}
                      onChange={e => setFilters({...filters, search: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Módulo</label>
                  <select 
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none bg-white font-medium"
                    value={filters.module}
                    onChange={e => setFilters({...filters, module: e.target.value})}
                  >
                    <option value="">Todos os Módulos</option>
                    <option value="AUTH">Autenticação</option>
                    <option value="FISCAL">Fiscal / Regime</option>
                    <option value="PROFILE">Perfil / Conta</option>
                    <option value="ESTABLISHMENT">Estabelecimento</option>
                    <option value="HR">Recursos Humanos</option>
                    <option value="FINANCE">Financeiro</option>
                    <option value="STOCK">Stock / Produtos</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Severidade</label>
                  <select 
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none bg-white font-medium"
                    value={filters.severity}
                    onChange={e => setFilters({...filters, severity: e.target.value})}
                  >
                    <option value="">Todas</option>
                    <option value="info">Informativo</option>
                    <option value="warning">Aviso</option>
                    <option value="critical">Crítico / Sensível</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Início do Período</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                    value={filters.startDate}
                    onChange={e => setFilters({...filters, startDate: e.target.value})}
                  />
                </div>

                <div className="md:col-span-3 lg:col-span-4 flex justify-end gap-3 pt-2">
                  <button 
                    onClick={() => {
                      setFilters({
                        startDate: '', endDate: '', userId: '', ownerId: '',
                        module: '', actionType: '', severity: '', search: '', entityType: ''
                      });
                      setPage(1);
                    }}
                    className="px-4 py-2 text-zinc-500 hover:text-zinc-900 text-sm font-medium"
                  >
                    Limpar Tudo
                  </button>
                  <button 
                    onClick={handleApplyFilters}
                    className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logs Table */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Evento / Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Utilizador / Empresa</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Módulo / Ação</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Severidade</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Sessão</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-8 h-20 bg-zinc-50/20"></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                          <Activity className="w-8 h-8 text-zinc-200" />
                        </div>
                        <p className="text-zinc-400 font-medium">Nenhum registo encontrado para os filtros selecionados.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const SeverityIcon = getSeverityIcon(log.severity);
                    return (
                      <motion.tr 
                        key={log.id} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-zinc-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-zinc-900 line-clamp-1">{log.description}</span>
                            <span className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: pt })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-zinc-400" />
                              <span className="text-sm font-medium text-zinc-700">{log.user_name || 'Sistema'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Building className="w-3 h-3 text-zinc-400" />
                              <span className="text-xs text-zinc-400">{log.owner_name || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{log.module}</span>
                            <span className="text-sm text-zinc-600 font-medium">{log.action_type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${getSeverityColor(log.severity)}`}>
                            <SeverityIcon className="w-3.5 h-3.5" />
                            {log.severity.toUpperCase()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                              <Globe className="w-3 h-3" />
                              {log.ip_address || '---'}
                            </div>
                            <div className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(log.status)}`}>
                              {log.status === 'success' ? 'Sucesso' : 'Falha'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedLog(log)}
                            className="p-2 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-900 hover:text-white transition-all shadow-sm"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              Mostrando {logs.length} de {total} registos
            </span>
            
            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 border border-zinc-200 rounded-xl bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 px-3 py-2 bg-white border border-zinc-200 rounded-xl min-w-[100px] justify-center">
                <span className="text-xs font-bold text-zinc-900">{page}</span>
                <span className="text-[10px] font-bold text-zinc-400">/ {totalPages || 1}</span>
              </div>
              <button 
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 border border-zinc-200 rounded-xl bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition-all shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Log Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl shadow-zinc-900/20 flex flex-col overflow-hidden max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${getSeverityColor(selectedLog.severity)}`}>
                    {React.createElement(getSeverityIcon(selectedLog.severity), { className: "w-6 h-6" })}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900">Detalhes do Evento</h3>
                    <p className="text-sm text-zinc-500 font-medium">#{selectedLog.id} • {selectedLog.action_type}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                {/* Meta Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Data e Hora
                      </span>
                      <span className="text-sm font-bold text-zinc-800">
                        {format(new Date(selectedLog.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: pt })}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <User className="w-3 h-3" /> Utilizador
                      </span>
                      <span className="text-sm font-bold text-zinc-800">{selectedLog.user_name || 'Sistema (Automático)'}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Globe className="w-3 h-3" /> Endereço IP
                      </span>
                      <span className="text-sm font-bold text-zinc-800 font-mono">{selectedLog.ip_address || 'Não registado'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Building className="w-3 h-3" /> Empresa/Owner
                      </span>
                      <span className="text-sm font-bold text-zinc-800">{selectedLog.owner_name || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Activity className="w-3 h-3" /> Módulo / Status
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-zinc-100 rounded-md font-bold text-zinc-600 uppercase tracking-tighter">
                          {selectedLog.module}
                        </span>
                        <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${getStatusBadge(selectedLog.status)}`}>
                          {selectedLog.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Entidade Afetada</span>
                      <span className="text-sm font-bold text-zinc-800">
                        {selectedLog.entity_type ? `${selectedLog.entity_type} (#${selectedLog.entity_id})` : 'Nenhuma'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-zinc-100 w-full" />

                {/* Device Info */}
                <div className="bg-zinc-50 rounded-2xl p-4 flex items-start gap-3 border border-zinc-100">
                  <Smartphone className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Informação do Dispositivo</span>
                    <p className="text-xs text-zinc-600 leading-relaxed font-medium">{selectedLog.user_agent}</p>
                  </div>
                </div>

                {/* Values Diff Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                       <BarChart3 className="w-4 h-4 text-zinc-400" />
                       Análise de Alterações
                    </h4>
                  </div>
                  
                  {renderDiff(selectedLog.old_value, selectedLog.new_value)}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-6 bg-zinc-50/50 border-t border-zinc-100 flex justify-end">
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="px-8 py-2 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e4e4e7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d8;
        }
      `}</style>
    </div>
  );
};

export default AdminAuditLogs;
