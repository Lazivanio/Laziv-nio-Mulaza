import React, { useState } from 'react';
import { AlertTriangle, Plus, Trash2, Calendar, FileText, UserMinus, X } from 'lucide-react';
import { Warning } from './types';
import { User } from '../../types';

interface Props {
  warnings: Warning[];
  setWarnings: React.Dispatch<React.SetStateAction<Warning[]>>;
  employees: User[];
}

export const WarningsTab = ({ warnings, setWarnings, employees }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    type: 'Advertência verbal' as any,
    date: '',
    description: '',
    severity: 'Leve' as any
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.date || !form.description) return;

    const newWarning: Warning = {
      id: Date.now().toString(),
      employee_id: form.employee_id,
      type: form.type,
      date: form.date,
      description: form.description,
      severity: form.severity
    };

    setWarnings(prev => [newWarning, ...prev]);
    setIsOpen(false);
    setForm({
      employee_id: '',
      type: 'Advertência verbal',
      date: '',
      description: '',
      severity: 'Leve'
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que deseja expurgar esta advertência disciplinar?')) {
      setWarnings(prev => prev.filter(w => w.id !== id));
    }
  };

  const getEmpName = (empId: string) => {
    const emp = employees.find(e => e.id.toString() === empId);
    return emp ? emp.name : 'Desconhecido';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-black text-xl flex items-center gap-2">
            <AlertTriangle className="text-zinc-800" size={24} />
            <span>Registo de Advertências Disciplinares</span>
          </h3>
          <p className="text-sm text-zinc-500 font-medium">Historial disciplinar, ocorrências de faltas graves, suspensões ou advertências formais.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
        >
          <Plus size={16} /> Emitir Advertência
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warnings.length === 0 ? (
          <div className="col-span-full p-12 bg-zinc-50 border border-dashed border-zinc-200 text-center rounded-2xl text-zinc-400 font-medium">
            Nenhuma ocorrência ou advertência registrada na empresa.
          </div>
        ) : (
          warnings.map(warning => (
            <div key={warning.id} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all relative group">
              <button
                onClick={() => handleDelete(warning.id)}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-rose-600 rounded-lg transition-all"
              >
                <Trash2 size={16} />
              </button>

              <div className="flex justify-between items-start">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                  warning.severity === 'Grave' ? 'bg-rose-50 text-rose-700' :
                  warning.severity === 'Média' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-700'
                }`}>
                  Severidade: {warning.severity}
                </span>
              </div>

              <div>
                <p className="text-xs text-zinc-400 font-black uppercase tracking-wider">{warning.type}</p>
                <h4 className="font-bold text-lg text-zinc-900 mt-0.5">{getEmpName(warning.employee_id)}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Emitido em: {new Date(warning.date).toLocaleDateString()}</p>
              </div>

              <p className="text-xs text-zinc-700 bg-zinc-50 p-3.5 rounded-xl border border-zinc-100 leading-relaxed font-medium">
                {warning.description}
              </p>
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Lançar Medida Disciplinar</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Colaborador</label>
                <select
                  required
                  value={form.employee_id}
                  onChange={e => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl animate-in"
                >
                  <option value="">Escolher Funcionário...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Medida / Tipo</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <option value="Advertência verbal">Advertência verbal</option>
                    <option value="Advertência escrita">Advertência escrita</option>
                    <option value="Suspensão">Suspensão</option>
                    <option value="Ocorrência">Ocorrência Geral</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Grau de Gravidade</label>
                  <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as any })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <option value="Leve">Leve</option>
                    <option value="Média">Média</option>
                    <option value="Grave">Grave</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Data da Ocorrência</label>
                <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Descrição pormenorizada</label>
                <textarea required rows={4} placeholder="Descreva os fatos e motivos da advertência..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl resize-none" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-black text-white font-bold rounded-xl text-sm">Registrar Medida</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
