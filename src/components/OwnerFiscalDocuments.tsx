import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Building2 as EstablishmentIcon, 
  FileCode, 
  FileSpreadsheet, 
  File as FileIcon,
  History,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';
import { User, Establishment as EstablishmentType } from '../types';

interface GeneratedFile {
  id: number;
  name: string;
  type: string;
  generated_by: string;
  created_at: string;
}

const OwnerFiscalDocuments = ({ user }: { user: User }) => {
  const [establishments, setEstablishments] = useState<EstablishmentType[]>([]);
  const [history, setHistory] = useState<GeneratedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [selectedEstablishmentForSeries, setSelectedEstablishmentForSeries] = useState<string>('');
  const [previewXml, setPreviewXml] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Filters for History
  const [filterType, setFilterType] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  // SAFT Form
  const [saftForm, setSaftForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    establishmentId: '',
    docType: ''
  });

  useEffect(() => {
    fetchEstablishments();
    fetchHistory();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/owner/settings/${user.id}`);
      const data = await response.json();
      if (data && data.saft_config) {
        const config = typeof data.saft_config === 'string' ? JSON.parse(data.saft_config) : data.saft_config;
        setSaftForm(prev => ({
          ...prev,
          ...config
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSaftSettings = async (newConfig: any) => {
    try {
      await fetch('/api/owner/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: user.id,
          saft_config: newConfig
        })
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  useEffect(() => {
    if (series.length === 0) return; // Wait for initial load if needed, but actually we want to save when user changes it
  }, [saftForm]);

  const updateSaftForm = (updates: Partial<typeof saftForm>) => {
    const newForm = { ...saftForm, ...updates };
    setSaftForm(newForm);
    saveSaftSettings(newForm);
  };

  useEffect(() => {
    if (selectedEstablishmentForSeries) {
      fetchSeries(selectedEstablishmentForSeries);
    }
  }, [selectedEstablishmentForSeries]);

  const fetchSeries = async (establishmentId: string) => {
    try {
      const response = await fetch(`/api/owner/establishments/${establishmentId}/invoice-series`);
      const data = await response.json();
      setSeries(data);
    } catch (error) {
      console.error('Error fetching series:', error);
    }
  };

  const handleRequestApproval = async (seriesId: number) => {
    try {
      const response = await fetch(`/api/owner/invoice-series/${seriesId}/request-approval`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchSeries(selectedEstablishmentForSeries);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao solicitar aprovação' });
    }
  };

  const fetchEstablishments = async () => {
    try {
      const response = await fetch(`/api/owner/establishments/${user.id}`);
      const data = await response.json();
      setEstablishments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching establishments:', error);
      alert("Erro ao carregar estabelecimentos. Verifique sua conexão ou tente novamente.");
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/owner/generated-files/${user.id}`);
      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSaft = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/owner/generate-saft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: user.id,
          establishment_id: saftForm.establishmentId,
          start_date: saftForm.startDate,
          end_date: saftForm.endDate,
          doc_type: saftForm.docType,
          user_name: user.name
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `SAFT gerado com sucesso: ${data.fileName}` });
        fetchHistory();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao gerar SAFT' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro na conexão com o servidor' });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAgtXml = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/owner/generate-agt-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: user.id,
          establishment_id: saftForm.establishmentId,
          start_date: saftForm.startDate,
          end_date: saftForm.endDate,
          doc_type: saftForm.docType,
          user_name: user.name
        })
      });
      const data = await response.json();
      if (data.success) {
        setPreviewXml(data.xml);
        setShowPreviewModal(true);
        setMessage({ type: 'success', text: `XML AGT gerado para pré-visualização.` });
        fetchHistory();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao gerar XML AGT' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro na conexão com o servidor' });
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (type: string, establishmentId?: string) => {
    setGenerating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/owner/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: user.id,
          export_type: type,
          establishment_id: establishmentId || establishments[0]?.id,
          user_name: user.name
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Exportação concluída: ${data.fileName}` });
        fetchHistory();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro na exportação' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro na conexão com o servidor' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (fileId: number) => {
    window.open(`/api/owner/download-file/${fileId}`, '_blank');
  };

  const filteredHistory = history.filter(file => {
    const matchesType = filterType === '' || file.type === filterType;
    const matchesDate = filterDate === '' || file.created_at.startsWith(filterDate);
    return matchesType && matchesDate;
  });

  const handleExportProfitSheet = () => {
    const url = `/api/owner/reports/profit-sheet?ownerId=${user.id}&establishmentId=${saftForm.establishmentId}&startDate=${saftForm.startDate}&endDate=${saftForm.endDate}&userName=${encodeURIComponent(user.name)}`;
    window.open(url, '_blank');
    
    // Refresh history after a short delay since we don't know exactly when it finishes in the other tab
    setTimeout(() => {
      fetchHistory();
    }, 3000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Documentos</h1>
          <p className="text-zinc-500">Gestão de SAFT, exportações e histórico de ficheiros</p>
        </div>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-medium">{message.text}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SAFT Generation */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <FileCode size={20} />
            </div>
            <h2 className="text-lg font-bold">Gerar SAFT (XML)</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Data Inicial</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="date"
                    value={saftForm.startDate}
                    onChange={(e) => updateSaftForm({ startDate: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Data Final</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="date"
                    value={saftForm.endDate}
                    onChange={(e) => updateSaftForm({ endDate: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Estabelecimento (Opcional)</label>
              <div className="relative">
                <EstablishmentIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <select 
                  value={saftForm.establishmentId}
                  onChange={(e) => updateSaftForm({ establishmentId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none"
                >
                  <option value="">Todos os Estabelecimentos</option>
                  {establishments.map(establishment => (
                    <option key={establishment.id} value={establishment.id}>{establishment.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Tipo de Documento (Opcional)</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <select 
                  value={saftForm.docType}
                  onChange={(e) => updateSaftForm({ docType: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none"
                >
                  <option value="">Todos os Documentos</option>
                  <option value="FT">Fatura</option>
                  <option value="FR">Fatura Recibo</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleGenerateSaft}
              disabled={generating}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
              Gerar SAFT (XML)
            </button>

            <button 
              onClick={handleGenerateAgtXml}
              disabled={generating}
              className="w-full py-3 bg-zinc-900 hover:bg-black disabled:bg-zinc-400 text-white font-bold rounded-xl shadow-lg shadow-black/20 transition-all flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="animate-spin" size={20} /> : <FileCode size={20} />}
              Exportação AGT (XML)
            </button>
          </div>
        </div>

        {/* Exportations */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileSpreadsheet size={20} />
            </div>
            <h2 className="text-lg font-bold">Exportações</h2>
          </div>

          <div className="mb-6 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
            <p className="text-xs text-zinc-500 flex items-center gap-2">
              <Calendar size={14} className="text-zinc-400" />
              <span>O relatório <b>Folha de Lucro</b> utiliza as datas e estabelecimento definidos na secção SAFT.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ExportCard 
              title="Faturas em PDF" 
              icon={<FileIcon size={24} />} 
              color="rose" 
              onClick={() => handleExport('invoices')}
              disabled={generating}
            />
            <ExportCard 
              title="Vendas em Excel" 
              icon={<FileSpreadsheet size={24} />} 
              color="emerald" 
              onClick={() => handleExport('sales')}
              disabled={generating}
            />
            <ExportCard 
              title="Compras em Excel" 
              icon={<FileSpreadsheet size={24} />} 
              color="amber" 
              onClick={() => handleExport('purchases')}
              disabled={generating}
            />
            <ExportCard 
              title="Clientes em Excel" 
              icon={<FileSpreadsheet size={24} />} 
              color="indigo" 
              onClick={() => handleExport('clients')}
              disabled={generating}
            />
            <ExportCard 
              title="Produtos em Excel" 
              icon={<FileSpreadsheet size={24} />} 
              color="violet" 
              onClick={() => handleExport('products')}
              disabled={generating}
            />
            <ExportCard 
              title="Folha de Lucro (PDF)" 
              icon={<DollarSign size={24} />} 
              color="emerald" 
              onClick={handleExportProfitSheet}
              disabled={generating}
            />
          </div>
        </div>

        {/* HR Reports */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Users size={20} />
            </div>
            <h2 className="text-lg font-bold">Relatórios de Recursos Humanos (RH)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ExportCard 
              title="Lista de Funcionários" 
              icon={<Users size={24} />} 
              color="purple" 
              onClick={() => handleExport('hr_employees')}
              disabled={generating}
            />
            <ExportCard 
              title="Presenças (Entradas/Saídas)" 
              icon={<Clock size={24} />} 
              color="blue" 
              onClick={() => handleExport('hr_attendance')}
              disabled={generating}
            />
            <ExportCard 
              title="Pagamentos de Salários" 
              icon={<DollarSign size={24} />} 
              color="emerald" 
              onClick={() => handleExport('hr_salaries')}
              disabled={generating}
            />
            <ExportCard 
              title="Férias Atribuídas" 
              icon={<Calendar size={24} />} 
              color="orange" 
              onClick={() => handleExport('hr_vacations')}
              disabled={generating}
            />
          </div>
        </div>
      </div>

      {/* XML Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPreviewModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Pré-visualização do XML AGT</h3>
                <p className="text-sm text-zinc-500">Valide a estrutura antes de submeter à AGT</p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-all">
                <XCircle size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-zinc-900">
              <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">
                {previewXml}
              </pre>
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle size={20} />
                <span className="text-sm font-bold uppercase tracking-wider">Estrutura Validada (SAF-T AO 1.01_01)</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="px-6 py-2 text-zinc-600 font-bold hover:bg-zinc-200 rounded-xl transition-all"
                >
                  Fechar
                </button>
                <button 
                  onClick={() => {
                    const blob = new Blob([previewXml || ''], { type: 'text/xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Vendas_AGT_${new Date().toISOString().split('T')[0]}.xml`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2"
                >
                  <Download size={20} />
                  Descarregar XML
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 text-zinc-600 rounded-lg">
              <History size={20} />
            </div>
            <h2 className="text-lg font-bold">Histórico de Ficheiros Gerados</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-3 pr-8 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">Todos os Tipos</option>
              <option value="SAFT">SAFT (XML)</option>
              <option value="Excel">Excel (.xlsx)</option>
              <option value="PDF">PDF (.pdf)</option>
              <option value="Folha de Lucro">Folha de Lucro</option>
            </select>

            <button 
              onClick={() => {
                setFilterDate('');
                setFilterType('');
                fetchHistory();
              }}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-lg transition-all"
              title="Limpar filtros e actualizar"
            >
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Nome do Ficheiro</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Data de Geração</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Quem Gerou</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-zinc-300" size={32} />
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    {history.length === 0 ? "Nenhum ficheiro gerado ainda." : "Nenhum ficheiro corresponde aos filtros seleccionados."}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((file) => (
                  <tr key={file.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          file.type === 'SAFT' ? 'bg-orange-50 text-orange-600' : 
                          file.type === 'Excel' ? 'bg-emerald-50 text-emerald-600' : 
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {file.type === 'SAFT' ? <FileCode size={18} /> : 
                           file.type === 'Excel' ? <FileSpreadsheet size={18} /> : 
                           <FileIcon size={18} />}
                        </div>
                        <span className="font-medium text-zinc-900">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        file.type === 'SAFT' ? 'bg-orange-100 text-orange-700' : 
                        file.type === 'Excel' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {file.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {new Date(file.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 font-medium">
                      {file.generated_by}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDownload(file.id)}
                        className="p-2 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        title="Descarregar"
                      >
                        <Download size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-100">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-zinc-300" size={32} />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              Nenhum ficheiro encontrado.
            </div>
          ) : (
            filteredHistory.map((file) => (
              <div key={file.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      file.type === 'SAFT' ? 'bg-orange-50 text-orange-600' : 
                      file.type === 'Excel' ? 'bg-emerald-50 text-emerald-600' : 
                      'bg-rose-50 text-rose-600'
                    }`}>
                      {file.type === 'SAFT' ? <FileCode size={18} /> : 
                       file.type === 'Excel' ? <FileSpreadsheet size={18} /> : 
                       <FileIcon size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-zinc-900 truncate max-w-[200px]">{file.name}</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{file.type}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownload(file.id)}
                    className="p-2 bg-orange-50 text-orange-600 rounded-xl"
                  >
                    <Download size={18} />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2 text-zinc-500 font-medium">
                    <Calendar size={12} />
                    {new Date(file.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 font-medium">
                    <Users size={12} />
                    {file.generated_by}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const ExportCard = ({ title, icon, color, onClick, disabled }: { title: string, icon: React.ReactNode, color: string, onClick: () => void, disabled?: boolean }) => {
  const colors: Record<string, string> = {
    rose: 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-100',
    emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100',
    violet: 'bg-violet-50 text-violet-600 hover:bg-violet-100 border-violet-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-100',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-100'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${colors[color]}`}
    >
      {icon}
      <span className="text-sm font-bold">{title}</span>
    </button>
  );
};

export default OwnerFiscalDocuments;
