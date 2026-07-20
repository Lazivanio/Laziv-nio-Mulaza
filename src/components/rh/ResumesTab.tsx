import React, { useState } from 'react';
import { Briefcase, Search, Plus, Trash2, Mail, Phone, ExternalLink, X } from 'lucide-react';
import { Candidate } from './types';

interface Props {
  candidates: Candidate[];
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>;
}

export const ResumesTab = ({ candidates, setCandidates }: Props) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', experience: '', notes: '' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;

    const newCand: Candidate = {
      id: Date.now().toString(),
      ...form,
      status: 'Banco de Currículos'
    };

    setCandidates(prev => [...prev, newCand]);
    setIsOpen(false);
    setForm({ name: '', email: '', phone: '', experience: '', notes: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover este currículo do banco?')) {
      setCandidates(prev => prev.filter(c => c.id !== id));
    }
  };

  const filteredCandidates = candidates
    .filter(c => c.status === 'Banco de Currículos')
    .filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.experience.toLowerCase().includes(search.toLowerCase()) ||
      c.notes.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-black text-xl flex items-center gap-2">
            <Briefcase className="text-zinc-800" size={24} />
            <span>Banco de Currículos</span>
          </h3>
          <p className="text-sm text-zinc-500 font-medium">Pesquise talentos guardados para futuras oportunidades e contratações.</p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
        >
          <Plus size={16} /> Adicionar Currículo
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder="Pesquisar por nome, experiência ou competências..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCandidates.length === 0 ? (
          <div className="col-span-2 p-12 bg-zinc-50 border border-dashed border-zinc-200 text-center rounded-2xl text-zinc-400 font-medium">
            Nenhum currículo encontrado com os critérios de busca.
          </div>
        ) : (
          filteredCandidates.map(cand => (
            <div key={cand.id} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all relative group">
              <button
                onClick={() => handleDelete(cand.id)}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-rose-600 rounded-lg transition-all"
                title="Remover do Banco"
              >
                <Trash2 size={16} />
              </button>

              <div>
                <h4 className="font-bold text-lg text-zinc-900">{cand.name}</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 mt-1">
                  <p className="flex items-center gap-1"><Phone size={12} /> {cand.phone || 'Sem telemóvel'}</p>
                  <p className="flex items-center gap-1"><Mail size={12} /> {cand.email}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Resumo de Experiência</p>
                <p className="text-xs text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-100/60 leading-relaxed font-medium">
                  {cand.experience || 'Nenhum detalhe técnico registado.'}
                </p>
              </div>

              {cand.notes && (
                <div className="text-xs text-zinc-500 italic bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/30">
                  <strong>Nota do Recrutador:</strong> {cand.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Adicionar Currículo</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Nome Completo</label>
                <input required type="text" placeholder="Ex: Isabel Antunes" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Email</label>
                  <input required type="email" placeholder="isabel@exemplo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Telemóvel</label>
                  <input required type="text" placeholder="9xxxxxxxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Experiência & Competências</label>
                <textarea required rows={3} placeholder="Escreva um resumo de qualificações, cargos anteriores..." value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Notas do Recrutador (Opcional)</label>
                <textarea rows={2} placeholder="Ex: Apresentou excelente postura técnica no contacto telefónico..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl resize-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-black text-white font-bold rounded-xl text-sm">Guardar Currículo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
