import React, { useState } from 'react';
import { Building2, Plus, Trash2, Users, DollarSign, X } from 'lucide-react';
import { Department } from './types';
import { User } from '../../types';

interface Props {
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  employees: User[];
  employeeDepartments: { [employeeId: string]: string };
}

export const DepartmentsTab = ({ departments, setDepartments, employees, employeeDepartments }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', budget: '' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const newDept: Department = {
      id: Date.now().toString(),
      name: form.name.trim(),
      description: form.description.trim(),
      budget: form.budget || '0'
    };

    setDepartments(prev => [...prev, newDept]);
    setForm({ name: '', description: '', budget: '' });
    setIsOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que deseja eliminar este departamento?')) {
      setDepartments(prev => prev.filter(d => d.id !== id));
    }
  };

  const getEmpCount = (deptId: string) => {
    return employees.filter(emp => employeeDepartments[emp.id.toString()] === deptId).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-black text-xl flex items-center gap-2">
            <Building2 className="text-zinc-800" size={24} />
            <span>Departamentos da Empresa</span>
          </h3>
          <p className="text-sm text-zinc-500">Gira os sectores e departamentos internos da sua empresa.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
        >
          <Plus size={16} />
          Criar Departamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map(dept => {
          const empCount = getEmpCount(dept.id);
          return (
            <div key={dept.id} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all relative group">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-zinc-100 rounded-xl text-zinc-800">
                  <Building2 size={24} />
                </div>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  title="Eliminar Departamento"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div>
                <h4 className="font-bold text-lg text-zinc-900 truncate">{dept.name}</h4>
                <p className="text-sm text-zinc-500 line-clamp-2 h-10 mt-1">{dept.description || 'Sem descrição definida.'}</p>
              </div>

              <div className="border-t border-zinc-100 pt-4 flex justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-1.5 font-bold text-zinc-700">
                  <Users size={14} className="text-zinc-400" />
                  <span>{empCount} {empCount === 1 ? 'Colaborador' : 'Colaboradores'}</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                  <DollarSign size={14} />
                  <span>Orçamento: Kz {Number(dept.budget).toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Criar Novo Departamento</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Nome do Departamento</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Comercial, TI, Logística..."
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Descrição</label>
                <textarea
                  placeholder="Descreva as responsabilidades deste sector..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Orçamento Mensal Estimado (Kz)</label>
                <input
                  type="number"
                  placeholder="Ex: 500000"
                  value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
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
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
