import React, { useState } from 'react';
import { UserMinus, Plus, Trash2, Calendar, FileText, X } from 'lucide-react';
import { Resignation } from './types';
import { User } from '../../types';

interface Props {
  resignations: Resignation[];
  setResignations: React.Dispatch<React.SetStateAction<Resignation[]>>;
  employees: User[];
  onRemoveEmployee: (id: number) => void;
}

export const ResignationsTab = ({ resignations, setResignations, employees, onRemoveEmployee }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    type: 'Pedido de demissão' as any,
    date: '',
    reason: '',
    compensation: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.date) return;

    const newResignation: Resignation = {
      id: Date.now().toString(),
      employee_id: form.employee_id,
      type: form.type,
      date: form.date,
      reason: form.reason,
      compensation: Number(form.compensation) || 0,
      status: 'Concluído'
    };

    setResignations(prev => [newResignation, ...prev]);
    
    // Low-key mark the employee as inactive/suspended or prompt to archive
    if (confirm('Deseja suspender a conta deste funcionário do sistema para cessar acessos?')) {
      onRemoveEmployee(Number(form.employee_id));
    }

    setIsOpen(false);
    setForm({
      employee_id: '',
      type: 'Pedido de demissão',
      date: '',
      reason: '',
      compensation: ''
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja eliminar este registo de rescisão?')) {
      setResignations(prev => prev.filter(r => r.id !== id));
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
            <UserMinus className="text-zinc-800" size={24} />
            <span>Rescisões & Demissões</span>
          </h3>
          <p className="text-sm text-zinc-500 font-medium">Controle de desligamentos de pessoal, indemnizações, rescisões e pedidos de demissão.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
        >
          <Plus size={16} /> Processar Desligamento
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-400 font-bold uppercase">
              <th className="p-4">Colaborador</th>
              <th className="p-4">Tipo de Rescisão</th>
              <th className="p-4">Data Efetiva</th>
              <th className="p-4">Motivo / Causa</th>
              <th className="p-4">Indemnização</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-sm">
            {resignations.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-400 italic">
                  Nenhum desligamento ou rescisão registada recentemente.
                </td>
              </tr>
            ) : (
              resignations.map(res => (
                <tr key={res.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-4 font-bold text-zinc-900">{getEmpName(res.employee_id)}</td>
                  <td className="p-4"><span className="px-2.5 py-1 rounded bg-zinc-100 text-zinc-800 text-xs font-semibold">{res.type}</span></td>
                  <td className="p-4 font-medium text-zinc-600">{new Date(res.date).toLocaleDateString()}</td>
                  <td className="p-4 text-xs text-zinc-500 max-w-xs truncate">{res.reason || 'Sem justificativa detalhada.'}</td>
                  <td className="p-4 font-bold text-rose-600">Kz {res.compensation.toLocaleString()}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 uppercase">
                      {res.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDelete(res.id)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Processar Rescisão de Contrato</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Colaborador Desligado</label>
                <select
                  required
                  value={form.employee_id}
                  onChange={e => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                >
                  <option value="">Escolher Funcionário...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Tipo Desligamento</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <option value="Pedido de demissão">Pedido de demissão</option>
                    <option value="Rescisão por iniciativa da empresa">Rescisão (Empresa)</option>
                    <option value="Fim de contrato">Fim de contrato</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Data de Saída</label>
                  <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Indemnização Calculada (Kz)</label>
                <input type="number" placeholder="Ex: 500000" value={form.compensation} onChange={e => setForm({ ...form, compensation: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Motivo / Acordo de Desligamento</label>
                <textarea rows={3} placeholder="Escreva o acordo ou motivo da saída..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl resize-none" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-black text-white font-bold rounded-xl text-sm">Concluir Desligamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
