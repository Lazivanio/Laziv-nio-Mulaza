import React, { useState } from 'react';
import { Award, Plus, Trash2, Star, MessageSquare, X } from 'lucide-react';
import { Evaluation } from './types';
import { User } from '../../types';

interface Props {
  evaluations: Evaluation[];
  setEvaluations: React.Dispatch<React.SetStateAction<Evaluation[]>>;
  employees: User[];
}

export const EvaluationsTab = ({ evaluations, setEvaluations, employees }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    punctuality: 5,
    productivity: 5,
    behavior: 5,
    communication: 5,
    teamwork: 5,
    responsibility: 5,
    finalResult: 'Bom' as any,
    notes: ''
  });

  const getSuggestedResult = (avg: number) => {
    if (avg >= 4.5) return 'Excelente';
    if (avg >= 3.5) return 'Bom';
    if (avg >= 2.5) return 'Regular';
    return 'Ruim';
  };

  const handleScoreChange = (field: string, score: number) => {
    setForm(prev => {
      const updated = { ...prev, [field]: score };
      const avg = (updated.punctuality + updated.productivity + updated.behavior + updated.communication + updated.teamwork + updated.responsibility) / 6;
      return { ...updated, finalResult: getSuggestedResult(avg) };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id) return;

    const newEval: Evaluation = {
      id: Date.now().toString(),
      employee_id: form.employee_id,
      date: new Date().toISOString().split('T')[0],
      punctuality: form.punctuality,
      productivity: form.productivity,
      behavior: form.behavior,
      communication: form.communication,
      teamwork: form.teamwork,
      responsibility: form.responsibility,
      finalResult: form.finalResult,
      notes: form.notes
    };

    setEvaluations(prev => [newEval, ...prev]);
    setIsOpen(false);
    setForm({
      employee_id: '',
      punctuality: 5,
      productivity: 5,
      behavior: 5,
      communication: 5,
      teamwork: 5,
      responsibility: 5,
      finalResult: 'Bom',
      notes: ''
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente eliminar esta avaliação?')) {
      setEvaluations(prev => prev.filter(e => e.id !== id));
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
            <Award className="text-zinc-800" size={24} />
            <span>Avaliações de Desempenho</span>
          </h3>
          <p className="text-sm text-zinc-500">Registe o desempenho individual com base em critérios técnicos e comportamentais.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
        >
          <Plus size={16} />
          Nova Avaliação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {evaluations.map(evalu => {
          const avgScore = ((evalu.punctuality + evalu.productivity + evalu.behavior + evalu.communication + evalu.teamwork + evalu.responsibility) / 6).toFixed(1);
          return (
            <div key={evalu.id} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all relative group">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg text-zinc-900">{getEmpName(evalu.employee_id)}</h4>
                  <p className="text-xs text-zinc-400">Avaliado em: {new Date(evalu.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                    evalu.finalResult === 'Excelente' ? 'bg-emerald-100 text-emerald-800' :
                    evalu.finalResult === 'Bom' ? 'bg-blue-100 text-blue-800' :
                    evalu.finalResult === 'Regular' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {evalu.finalResult}
                  </span>
                  <button
                    onClick={() => handleDelete(evalu.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600">
                <div className="flex justify-between p-2 bg-zinc-50 rounded-lg">
                  <span>Pontualidade:</span>
                  <span className="font-bold">{evalu.punctuality}/5</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-50 rounded-lg">
                  <span>Produtividade:</span>
                  <span className="font-bold">{evalu.productivity}/5</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-50 rounded-lg">
                  <span>Comportamento:</span>
                  <span className="font-bold">{evalu.behavior}/5</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-50 rounded-lg">
                  <span>Comunicação:</span>
                  <span className="font-bold">{evalu.communication}/5</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-50 rounded-lg">
                  <span>Trabalho Equipa:</span>
                  <span className="font-bold">{evalu.teamwork}/5</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-50 rounded-lg">
                  <span>Responsabilidade:</span>
                  <span className="font-bold">{evalu.responsibility}/5</span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs text-zinc-500 border-t border-zinc-100">
                <span className="font-medium flex items-center gap-1">
                  <Star size={14} className="text-amber-500 fill-amber-500" /> Score Médio: <strong className="text-zinc-800">{avgScore}/5.0</strong>
                </span>
                {evalu.notes && (
                  <span className="truncate max-w-[200px] italic" title={evalu.notes}>&ldquo;{evalu.notes}&rdquo;</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Avaliação de Funcionário</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Funcionário Avaliado</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'punctuality', label: 'Pontualidade' },
                  { id: 'productivity', label: 'Produtividade' },
                  { id: 'behavior', label: 'Comportamento' },
                  { id: 'communication', label: 'Comunicação' },
                  { id: 'teamwork', label: 'Trabalho em equipa' },
                  { id: 'responsibility', label: 'Responsabilidade' }
                ].map(item => (
                  <div key={item.id} className="space-y-2 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-700">{item.label}</span>
                      <span className="text-xs font-black text-black bg-zinc-200 px-2 py-0.5 rounded-full">{(form as any)[item.id]}/5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={(form as any)[item.id]}
                      onChange={e => handleScoreChange(item.id, Number(e.target.value))}
                      className="w-full accent-black h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-950 text-white rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold uppercase text-zinc-400">Classificação Final</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Calculada com base na média dos critérios.</p>
                </div>
                <select
                  value={form.finalResult}
                  onChange={e => setForm({ ...form, finalResult: e.target.value as any })}
                  className="bg-zinc-800 text-white font-bold px-4 py-2 rounded-xl border border-zinc-700 focus:outline-none"
                >
                  <option value="Excelente">Excelente</option>
                  <option value="Bom">Bom</option>
                  <option value="Regular">Regular</option>
                  <option value="Ruim">Ruim</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Comentários do Gestor</label>
                <textarea
                  placeholder="Justifique as pontuações e aponte sugestões de crescimento..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
                />
              </div>

              <div className="flex gap-3">
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
                  Registar Avaliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
