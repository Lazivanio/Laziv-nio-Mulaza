import React, { useState } from 'react';
import { ShieldAlert, Plus, Trash2, Calendar, FileText, Check, X, AlertCircle } from 'lucide-react';
import { Leave } from './types';
import { User } from '../../types';

interface Props {
  leaves: Leave[];
  setLeaves: React.Dispatch<React.SetStateAction<Leave[]>>;
  employees: User[];
}

export const LeavesTab = ({ leaves, setLeaves, employees }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    type: 'Licença médica' as any,
    start_date: '',
    end_date: '',
    notes: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.start_date || !form.end_date) return;

    const newLeave: Leave = {
      id: Date.now().toString(),
      employee_id: form.employee_id,
      type: form.type,
      start_date: form.start_date,
      end_date: form.end_date,
      status: 'Pendente',
      notes: form.notes
    };

    setLeaves(prev => [newLeave, ...prev]);
    setIsOpen(false);
    setForm({
      employee_id: '',
      type: 'Licença médica',
      start_date: '',
      end_date: '',
      notes: ''
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que deseja remover este registo de licença?')) {
      setLeaves(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleStatus = (id: string, newStatus: 'Aprovado' | 'Rejeitado') => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
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
            <ShieldAlert className="text-zinc-800" size={24} />
            <span>Controlo de Licenças</span>
          </h3>
          <p className="text-sm text-zinc-500">Registe e aprove ausências justificadas ou licenças especiais.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
        >
          <Plus size={16} />
          Solicitar Licença
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leaves.map(leave => (
          <div key={leave.id} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all relative group">
            <div className="flex justify-between items-start">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                leave.status === 'Aprovado' ? 'bg-emerald-50 text-emerald-700' :
                leave.status === 'Rejeitado' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {leave.status}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                {leave.status === 'Pendente' && (
                  <>
                    <button
                      onClick={() => handleStatus(leave.id, 'Aprovado')}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      title="Aprovar"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => handleStatus(leave.id, 'Rejeitado')}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                      title="Rejeitar"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(leave.id)}
                  className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{leave.type}</p>
              <h4 className="font-bold text-lg text-zinc-900 mt-0.5">{getEmpName(leave.employee_id)}</h4>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 bg-zinc-50 p-2.5 rounded-xl">
              <Calendar size={14} className="text-zinc-400" />
              <span>{new Date(leave.start_date).toLocaleDateString()}</span>
              <span>-</span>
              <span>{new Date(leave.end_date).toLocaleDateString()}</span>
            </div>

            {leave.notes && (
              <p className="text-xs text-zinc-500 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/40">
                &ldquo;{leave.notes}&rdquo;
              </p>
            )}
          </div>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Lançar Nova Licença</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Funcionário</label>
                <select
                  required
                  value={form.employee_id}
                  onChange={e => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                >
                  <option value="">Escolher Funcionário...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Motivo / Tipo de Licença</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                >
                  <option value="Licença médica">Licença médica</option>
                  <option value="Licença de maternidade">Licença de maternidade</option>
                  <option value="Licença de paternidade">Licença de paternidade</option>
                  <option value="Licença sem vencimento">Licença sem vencimento</option>
                  <option value="Licença especial">Licença especial</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Data de Início</label>
                  <input
                    required
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Data de Fim</label>
                  <input
                    required
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Observações / Detalhes</label>
                <textarea
                  placeholder="Informações adicionais importantes..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-sm hover:bg-zinc-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-black text-white font-bold rounded-xl text-sm hover:bg-zinc-800 transition-all"
                >
                  Confirmar Licença
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
