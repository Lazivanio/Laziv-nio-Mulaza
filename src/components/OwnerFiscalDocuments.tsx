import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Store, 
  FileCode, 
  FileSpreadsheet, 
  File as FileIcon,
  History,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { User, Store as StoreType } from '../types';

interface GeneratedFile {
  id: number;
  name: string;
  type: string;
  generated_by: string;
  created_at: string;
}

const OwnerFiscalDocuments = ({ user }: { user: User }) => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [history, setHistory] = useState<GeneratedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // SAFT Form
  const [saftForm, setSaftForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    storeId: '',
    docType: ''
  });

  useEffect(() => {
    fetchStores();
    fetchHistory();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await fetch(`/api/owner/stores/${user.id}`);
      const data = await response.json();
      setStores(data);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/owner/generated-files/${user.id}`);
      const data = await response.json();
      setHistory(data);
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
          store_id: saftForm.storeId,
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

  const handleExport = async (type: string, storeId?: string) => {
    setGenerating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/owner/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: user.id,
          export_type: type,
          store_id: storeId || stores[0]?.id,
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
                    onChange={(e) => setSaftForm({ ...saftForm, startDate: e.target.value })}
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
                    onChange={(e) => setSaftForm({ ...saftForm, endDate: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Loja (Opcional)</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <select 
                  value={saftForm.storeId}
                  onChange={(e) => setSaftForm({ ...saftForm, storeId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none"
                >
                  <option value="">Todas as Lojas</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
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
                  onChange={(e) => setSaftForm({ ...saftForm, docType: e.target.value })}
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
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 text-zinc-600 rounded-lg">
              <History size={20} />
            </div>
            <h2 className="text-lg font-bold">Histórico de Ficheiros Gerados</h2>
          </div>
          <button 
            onClick={fetchHistory}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-lg transition-all"
          >
            <Search size={20} />
          </button>
        </div>

        <div className="overflow-x-auto">
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
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum ficheiro gerado ainda.
                  </td>
                </tr>
              ) : (
                history.map((file) => (
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
    violet: 'bg-violet-50 text-violet-600 hover:bg-violet-100 border-violet-100'
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
