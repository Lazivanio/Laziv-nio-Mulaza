import React, { useState, useEffect } from 'react';
import { 
  Coins, Plus, Search, Filter, Calendar, TrendingUp, RefreshCw, 
  Trash2, Edit2, CheckCircle, AlertTriangle, ArrowRightLeft, 
  History, Info, DollarSign, Globe, Save, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { User } from '../types';

interface Currency {
  id: number;
  code: string;
  symbol: string;
  name: string;
  is_base: boolean;
  created_at: string;
}

interface ExchangeRate {
  id: number;
  currency_id: number;
  code: string;
  symbol: string;
  rate: number;
  rate_date: string;
  created_at: string;
}

export const OwnerCurrencies = ({ user }: { user: User }) => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  
  const [newCurrency, setNewCurrency] = useState({
    code: '',
    symbol: '',
    name: '',
    is_base: false
  });

  const [newRate, setNewRate] = useState({
    currency_id: '',
    rate: '',
    rate_date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [cRes, rRes] = await Promise.all([
        fetch(`/api/owner/currencies/${user.id}`),
        fetch(`/api/owner/exchange-rates/${user.id}`)
      ]);
      const [cData, rData] = await Promise.all([cRes.json(), rRes.json()]);
      setCurrencies(cData);
      setRates(rData);
    } catch (e) {
      console.error("Error fetching multi-currency data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCurrency ? `/api/owner/currencies/${editingCurrency.id}` : '/api/owner/currencies';
      const method = editingCurrency ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCurrency, owner_id: user.id })
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setEditingCurrency(null);
        setNewCurrency({ code: '', symbol: '', name: '', is_base: false });
        fetchData();
      }
    } catch (e) {
      console.error("Error saving currency:", e);
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/owner/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          owner_id: user.id, 
          currency_id: Number(newRate.currency_id),
          rate: Number(newRate.rate),
          rate_date: newRate.rate_date,
          created_by: user.id
        })
      });
      
      if (res.ok) {
        setIsRateModalOpen(false);
        setNewRate({ currency_id: '', rate: '', rate_date: format(new Date(), 'yyyy-MM-dd') });
        fetchData();
      }
    } catch (e) {
      console.error("Error saving rate:", e);
    }
  };

  const baseCurrency = currencies.find(c => c.is_base);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Gestão de Moedas</h2>
          <p className="text-zinc-500 text-sm font-medium">Configure sua moeda base e taxas de câmbio.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setEditingCurrency(null); setNewCurrency({ code: '', symbol: '', name: '', is_base: false }); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all"
          >
            <Plus size={18} />
            Nova Moeda
          </button>
          <button 
            onClick={() => setIsRateModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-900 px-4 py-2 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all"
          >
            <RefreshCw size={18} />
            Atualizar Câmbio
          </button>
        </div>
      </div>

      {!baseCurrency && !isLoading && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="text-amber-600 mt-1" size={20} />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Configuração Obrigatória</h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              Você ainda não definiu uma moeda base para sua empresa. É obrigatório ter uma moeda padrão para todos os cálculos financeiros.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Currencies Table */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-900">Moedas Habilitadas</h3>
              <Globe className="text-zinc-400" size={18} />
            </div>
            <div className="divide-y divide-zinc-100">
              {currencies.map(currency => (
                <div key={currency.id} className="p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-900 font-bold">
                      {currency.symbol}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900">{currency.code}</span>
                        {currency.is_base && (
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">BASE</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-medium">{currency.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setEditingCurrency(currency); setNewCurrency({ ...currency }); setIsModalOpen(true); }}
                    className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              ))}
              {currencies.length === 0 && !isLoading && (
                <div className="p-12 text-center">
                  <p className="text-sm text-zinc-400 italic">Nenhuma moeda cadastrada.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rates History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-900">Histórico de Taxas de Câmbio</h3>
              <TrendingUp className="text-zinc-400" size={18} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Moeda</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Taxa (Base)</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Data da Taxa</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Referência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {rates.map(rate => (
                    <tr key={rate.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 leading-none">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-900">{rate.code}</span>
                          <span className="text-xs text-zinc-400">{rate.symbol}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-zinc-900">
                          1 {rate.code} = {rate.rate} {baseCurrency?.code || 'BASE'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-600">
                          <Calendar size={14} className="text-zinc-400" />
                          {format(new Date(rate.rate_date), 'dd/MM/yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Manual</span>
                      </td>
                    </tr>
                  ))}
                  {rates.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 italic">
                        Nenhum histórico de taxas encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Currency Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-zinc-900">{editingCurrency ? 'Editar Moeda' : 'Nova Moeda'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-400 hover:bg-zinc-50 rounded-xl">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveCurrency} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Código (ex: USD)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="USD"
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none font-bold uppercase"
                      value={newCurrency.code}
                      onChange={e => setNewCurrency({...newCurrency, code: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Símbolo (ex: $)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="$"
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none font-bold"
                      value={newCurrency.symbol}
                      onChange={e => setNewCurrency({...newCurrency, symbol: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nome da Moeda</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Dólar Americano"
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none font-medium"
                    value={newCurrency.name}
                    onChange={e => setNewCurrency({...newCurrency, name: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                  <input 
                    type="checkbox" 
                    id="is_base"
                    className="w-5 h-5 rounded-lg text-zinc-900 focus:ring-zinc-900 border-zinc-200"
                    checked={newCurrency.is_base}
                    onChange={e => setNewCurrency({...newCurrency, is_base: e.target.checked})}
                  />
                  <label htmlFor="is_base" className="text-sm font-bold text-zinc-700">Definir como Moeda Base</label>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-zinc-900 text-white py-3 rounded-2xl font-black text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <Save size={18} />
                  Salvar Moeda
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rate Modal */}
      <AnimatePresence>
        {isRateModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-zinc-900">Atualizar Câmbio</h3>
                <button onClick={() => setIsRateModalOpen(false)} className="p-2 text-zinc-400 hover:bg-zinc-50 rounded-xl">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveRate} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Moeda Adicional</label>
                  <select 
                    required
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none font-bold bg-white"
                    value={newRate.currency_id}
                    onChange={e => setNewRate({...newRate, currency_id: e.target.value})}
                  >
                    <option value="">Selecionar Moeda...</option>
                    {currencies.filter(c => !c.is_base).map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Taxa (1 UNIDADE = X {baseCurrency?.code || 'BASE'})</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.0001"
                      required
                      placeholder="850.0000"
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none font-bold"
                      value={newRate.rate}
                      onChange={e => setNewRate({...newRate, rate: e.target.value})}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                      {baseCurrency?.code || 'BASE'}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Data da Taxa (Referência)</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none font-bold"
                    value={newRate.rate_date}
                    onChange={e => setNewRate({...newRate, rate_date: e.target.value})}
                  />
                </div>
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-start gap-3">
                  <Info className="text-zinc-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                    A taxa informada será usada como referência para novos documentos e cálculos a partir desta data. Documentos já emitidos não serão afetados.
                  </p>
                </div>
                <button 
                  type="submit"
                  disabled={!newRate.currency_id}
                  className="w-full bg-zinc-900 text-white py-3 rounded-2xl font-black text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  Registrar Taxa
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
