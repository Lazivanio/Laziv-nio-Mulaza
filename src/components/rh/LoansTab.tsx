import React, { useState } from 'react';
import { Landmark, Plus, Trash2, Calendar, FileText, Check, X } from 'lucide-react';
import { Loan } from './types';
import { User } from '../../types';

interface Props {
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  employees: User[];
}

export const LoansTab = ({ loans, setLoans, employees }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    total_amount: '',
    installment: '',
    start_date: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.total_amount || !form.installment || !form.start_date) return;

    const newLoan: Loan = {
      id: Date.now().toString(),
      employee_id: form.employee_id,
      total_amount: Number(form.total_amount),
      installment: Number(form.installment),
      balance: Number(form.total_amount),
      start_date: form.start_date,
      status: 'Ativo'
    };

    setLoans(prev => [newLoan, ...prev]);
    setIsOpen(false);
    setForm({ employee_id: '', total_amount: '', installment: '', start_date: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que deseja cancelar ou anular este empréstimo?')) {
      setLoans(prev => prev.filter(l => l.id !== id));
    }
  };

  const handlePayInstallment = (id: string) => {
    setLoans(prev => prev.map(loan => {
      if (loan.id === id) {
        const nextBal = Math.max(0, loan.balance - loan.installment);
        return {
          ...loan,
          balance: nextBal,
          status: nextBal === 0 ? 'Liquidado' : 'Ativo'
        };
      }
      return loan;
    }));
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
            <Landmark className="text-zinc-800" size={24} />
            <span>Controle de Empréstimos Internos</span>
          </h3>
          <p className="text-sm text-zinc-500 font-medium font-medium">Gira financiamentos e empréstimos concedidos aos colaboradores com parcelamento mensal.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
        >
          <Plus size={16} /> Conceder Empréstimo
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-400 font-bold uppercase">
              <th className="p-4">Colaborador</th>
              <th className="p-4">Data Início</th>
              <th className="p-4">Montante Total</th>
              <th className="p-4">Mensalidade (Parcela)</th>
              <th className="p-4">Saldo Devedor</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-sm">
            {loans.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-400 italic">
                  Nenhum contrato de empréstimo financeiro ativo.
                </td>
              </tr>
            ) : (
              loans.map(loan => (
                <tr key={loan.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-4 font-bold text-zinc-900">{getEmpName(loan.employee_id)}</td>
                  <td className="p-4 text-zinc-600 font-medium">{new Date(loan.start_date).toLocaleDateString()}</td>
                  <td className="p-4 font-bold">Kz {loan.total_amount.toLocaleString()}</td>
                  <td className="p-4 text-rose-600 font-medium">Kz {loan.installment.toLocaleString()}/mês</td>
                  <td className="p-4 font-black text-indigo-600">Kz {loan.balance.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      loan.status === 'Ativo' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1.5">
                      {loan.status === 'Ativo' && (
                        <button
                          onClick={() => handlePayInstallment(loan.id)}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded hover:bg-emerald-100 transition-all"
                          title="Deduzir Parcela Mensal"
                        >
                          Pagar Parcela
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(loan.id)}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
              <h3 className="text-lg font-bold">Conceder Novo Empréstimo</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Colaborador Beneficiário</label>
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

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Montante do Empréstimo (Kz)</label>
                <input required type="number" placeholder="Ex: 120000" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Mensalidade / Parcela (Kz)</label>
                  <input required type="number" placeholder="Ex: 10000" value={form.installment} onChange={e => setForm({ ...form, installment: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Data de Início</label>
                  <input required type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-black text-white font-bold rounded-xl text-sm">Aprovar Empréstimo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
