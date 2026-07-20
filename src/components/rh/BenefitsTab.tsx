import React, { useState } from 'react';
import { Heart, Plus, Trash2, Shield, Truck, Coffee, Home, Gift, Check, X } from 'lucide-react';
import { Benefit } from './types';
import { User } from '../../types';

interface Props {
  benefits: Benefit[];
  setBenefits: React.Dispatch<React.SetStateAction<Benefit[]>>;
  employees: User[];
}

export const BenefitsTab = ({ benefits, setBenefits, employees }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    healthPlan: true,
    insurance: true,
    transport: '25000',
    food: '35000',
    housing: '0',
    bonus: '0',
    others: '0'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id) return;

    const newBenefit: Benefit = {
      id: Date.now().toString(),
      employee_id: form.employee_id,
      healthPlan: form.healthPlan,
      insurance: form.insurance,
      transport: Number(form.transport) || 0,
      food: Number(form.food) || 0,
      housing: Number(form.housing) || 0,
      bonus: Number(form.bonus) || 0,
      others: Number(form.others) || 0
    };

    setBenefits(prev => [...prev.filter(b => b.employee_id !== form.employee_id), newBenefit]);
    setIsOpen(false);
    setForm({
      employee_id: '',
      healthPlan: true,
      insurance: true,
      transport: '25000',
      food: '35000',
      housing: '0',
      bonus: '0',
      others: '0'
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que deseja revogar este plano de benefícios?')) {
      setBenefits(prev => prev.filter(b => b.id !== id));
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
            <Heart className="text-rose-500 fill-rose-500" size={24} />
            <span>Benefícios & Regalias</span>
          </h3>
          <p className="text-sm text-zinc-500 font-medium">Controle de planos de saúde, seguros e subsídios sociais dos colaboradores.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
        >
          <Plus size={16} /> Configurar Benefícios
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map(benefit => {
          const totalBenefits = benefit.transport + benefit.food + benefit.housing + benefit.bonus + benefit.others;
          return (
            <div key={benefit.id} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all relative group">
              <button
                onClick={() => handleDelete(benefit.id)}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-rose-600 rounded-lg transition-all"
              >
                <Trash2 size={16} />
              </button>

              <div>
                <h4 className="font-bold text-lg text-zinc-900">{getEmpName(benefit.employee_id)}</h4>
                <p className="text-xs text-zinc-400 font-black mt-0.5">Plano Ativo</p>
              </div>

              <div className="space-y-2 border-t border-b border-zinc-100 py-3">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-zinc-600">
                    <Shield size={14} className="text-zinc-400" /> Plano de Saúde:
                  </span>
                  <span className={benefit.healthPlan ? "text-emerald-600 font-bold" : "text-zinc-400 font-medium"}>
                    {benefit.healthPlan ? "Incluído" : "Não incluído"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-zinc-600">
                    <Heart size={14} className="text-zinc-400" /> Seguro de Vida:
                  </span>
                  <span className={benefit.insurance ? "text-emerald-600 font-bold" : "text-zinc-400 font-medium"}>
                    {benefit.insurance ? "Incluído" : "Não incluído"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-zinc-600">
                    <Truck size={14} className="text-zinc-400" /> Subsídio Transporte:
                  </span>
                  <span className="font-black text-zinc-900">Kz {benefit.transport.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-zinc-600">
                    <Coffee size={14} className="text-zinc-400" /> Subsídio Alimentação:
                  </span>
                  <span className="font-black text-zinc-900">Kz {benefit.food.toLocaleString()}</span>
                </div>
                {benefit.housing > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-zinc-600">
                      <Home size={14} className="text-zinc-400" /> Apoio à Habitação:
                    </span>
                    <span className="font-black text-zinc-900">Kz {benefit.housing.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 text-xs">
                <span className="font-bold text-zinc-500 uppercase">Apoio Financeiro Total:</span>
                <span className="text-sm font-black text-emerald-600">Kz {totalBenefits.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Configurar Benefícios</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Colaborador</label>
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

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <input
                    type="checkbox"
                    checked={form.healthPlan}
                    onChange={e => setForm({ ...form, healthPlan: e.target.checked })}
                    className="w-4 h-4 rounded text-black focus:ring-black"
                  />
                  <span className="text-xs font-bold text-zinc-700">Plano de Saúde</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <input
                    type="checkbox"
                    checked={form.insurance}
                    onChange={e => setForm({ ...form, insurance: e.target.checked })}
                    className="w-4 h-4 rounded text-black focus:ring-black"
                  />
                  <span className="text-xs font-bold text-zinc-700">Seguro de Vida</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Apoio Transporte (Kz)</label>
                  <input type="number" value={form.transport} onChange={e => setForm({ ...form, transport: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Apoio Alimentação (Kz)</label>
                  <input type="number" value={form.food} onChange={e => setForm({ ...form, food: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Apoio Habitação (Kz)</label>
                  <input type="number" value={form.housing} onChange={e => setForm({ ...form, housing: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Outros Apoios (Kz)</label>
                  <input type="number" value={form.others} onChange={e => setForm({ ...form, others: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-black text-white font-bold rounded-xl text-sm">Aplicar Plano</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
