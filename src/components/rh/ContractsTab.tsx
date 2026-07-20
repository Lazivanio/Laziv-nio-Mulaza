import React, { useState } from 'react';
import { FileText, Plus, Trash2, Calendar, DollarSign, Clock, X, Check, AlertCircle } from 'lucide-react';
import { Contract } from './types';
import { User } from '../../types';

interface Props {
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  employees: User[];
}

export const ContractsTab = ({ contracts, setContracts, employees }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    type: 'Efetivo' as any,
    start_date: '',
    end_date: '',
    renewal: true,
    salary: '',
    schedule: '08:00 - 17:00'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.start_date || !form.salary) return;

    const newContract: Contract = {
      id: Date.now().toString(),
      employee_id: form.employee_id,
      type: form.type,
      start_date: form.start_date,
      end_date: form.end_date || undefined,
      renewal: form.renewal,
      salary: Number(form.salary),
      schedule: form.schedule,
      status: 'Ativo'
    };

    setContracts(prev => [...prev, newContract]);
    setIsOpen(false);
    setForm({
      employee_id: '',
      type: 'Efetivo',
      start_date: '',
      end_date: '',
      renewal: true,
      salary: '',
      schedule: '08:00 - 17:00'
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que deseja revogar ou eliminar este contrato?')) {
      setContracts(prev => prev.filter(c => c.id !== id));
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
            <FileText className="text-zinc-800" size={24} />
            <span>Contratos de Trabalho</span>
          </h3>
          <p className="text-sm text-zinc-500">Controle de contratos, vencimentos, renovações e horários de trabalho.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
        >
          <Plus size={16} />
          Registrar Contrato
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-400 font-bold uppercase tracking-wider">
                <th className="p-4">Funcionário</th>
                <th className="p-4">Tipo de Contrato</th>
                <th className="p-4">Duração / Início</th>
                <th className="p-4">Horário</th>
                <th className="p-4">Salário Contratual</th>
                <th className="p-4">Renovação Auto</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-400 italic">
                    Nenhum contrato ativo registrado no sistema.
                  </td>
                </tr>
              ) : (
                contracts.map(contract => (
                  <tr key={contract.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-4 font-bold text-zinc-900">
                      {getEmpName(contract.employee_id)}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                        {contract.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-zinc-800">Início: {new Date(contract.start_date).toLocaleDateString()}</span>
                        {contract.end_date ? (
                          <span className="text-xs text-zinc-400">Fim: {new Date(contract.end_date).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">Sem termo definido</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-zinc-600 font-medium">
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-zinc-400" />
                        <span>{contract.schedule}</span>
                      </div>
                    </td>
                    <td className="p-4 font-black text-zinc-900">
                      Kz {contract.salary.toLocaleString()}
                    </td>
                    <td className="p-4">
                      {contract.renewal ? (
                        <span className="text-emerald-600 flex items-center gap-1 text-xs font-bold">
                          <Check size={16} /> Sim
                        </span>
                      ) : (
                        <span className="text-zinc-400 flex items-center gap-1 text-xs font-medium">
                          <X size={16} /> Não
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 uppercase">
                        {contract.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(contract.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Eliminar Contrato"
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
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Vincular Novo Contrato</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Selecionar Funcionário</label>
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
                  <label className="text-xs font-bold text-zinc-500 uppercase">Tipo de Contrato</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as any })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                  >
                    <option value="Efetivo">Efetivo</option>
                    <option value="Temporário">Temporário</option>
                    <option value="Estágio">Estágio</option>
                    <option value="Prestação de serviços">Prestação de serviços</option>
                    <option value="Tempo parcial">Tempo parcial</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Salário Contratual (Kz)</label>
                  <input
                    required
                    type="number"
                    placeholder="Ex: 150000"
                    value={form.salary}
                    onChange={e => setForm({ ...form, salary: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>

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
                  <label className="text-xs font-bold text-zinc-500 uppercase">Data de Fim (Opcional)</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Horário de Trabalho</label>
                  <input
                    type="text"
                    placeholder="Ex: 08:00 - 17:00, Turnos"
                    value={form.schedule}
                    onChange={e => setForm({ ...form, schedule: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>

                <div className="space-y-2 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <input
                      type="checkbox"
                      checked={form.renewal}
                      onChange={e => setForm({ ...form, renewal: e.target.checked })}
                      className="w-4 h-4 rounded text-black focus:ring-black"
                    />
                    <span className="text-xs font-bold text-zinc-700">Renovação Automática</span>
                  </label>
                </div>
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
                  Emitir Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
