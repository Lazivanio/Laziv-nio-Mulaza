import React, { useState } from 'react';
import { UserPlus, Plus, Trash2, Calendar, Phone, Mail, Building, Briefcase, CheckCircle, Clock, X, Check } from 'lucide-react';
import { Vacancy, Candidate, Interview } from './types';

interface Props {
  vacancies: Vacancy[];
  setVacancies: React.Dispatch<React.SetStateAction<Vacancy[]>>;
  candidates: Candidate[];
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>;
  interviews: Interview[];
  setInterviews: React.Dispatch<React.SetStateAction<Interview[]>>;
}

export const RecruitmentTab = ({ vacancies, setVacancies, candidates, setCandidates, interviews, setInterviews }: Props) => {
  const [activeSubTab, setActiveSubTab] = useState<'vacancies' | 'candidates' | 'interviews'>('vacancies');
  
  // Modals
  const [isVacancyOpen, setIsVacancyOpen] = useState(false);
  const [isCandidateOpen, setIsCandidateOpen] = useState(false);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);

  // Forms
  const [vacancyForm, setVacancyForm] = useState({ title: '', department: '', salary: '', description: '', status: 'Aberta' as any });
  const [candidateForm, setCandidateForm] = useState({ name: '', email: '', phone: '', vacancy_id: '', status: 'Triagem' as any, experience: '', notes: '' });
  const [interviewForm, setInterviewForm] = useState({ candidate_id: '', date: '', time: '', interviewer: '', status: 'Agendada' as any, notes: '' });

  // Saves
  const handleSaveVacancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacancyForm.title || !vacancyForm.department) return;

    const newVac: Vacancy = {
      id: Date.now().toString(),
      ...vacancyForm
    };

    setVacancies(prev => [...prev, newVac]);
    setIsVacancyOpen(false);
    setVacancyForm({ title: '', department: '', salary: '', description: '', status: 'Aberta' });
  };

  const handleSaveCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateForm.name || !candidateForm.email) return;

    const newCand: Candidate = {
      id: Date.now().toString(),
      ...candidateForm
    };

    setCandidates(prev => [...prev, newCand]);
    setIsCandidateOpen(false);
    setCandidateForm({ name: '', email: '', phone: '', vacancy_id: '', status: 'Triagem', experience: '', notes: '' });
  };

  const handleSaveInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewForm.candidate_id || !interviewForm.date || !interviewForm.time) return;

    const newInt: Interview = {
      id: Date.now().toString(),
      ...interviewForm
    };

    setInterviews(prev => [...prev, newInt]);
    setIsInterviewOpen(false);
    setInterviewForm({ candidate_id: '', date: '', time: '', interviewer: '', status: 'Agendada', notes: '' });
  };

  // Deletes
  const handleDeleteVacancy = (id: string) => {
    if (confirm('Tem a certeza que deseja fechar ou remover esta vaga?')) {
      setVacancies(prev => prev.filter(v => v.id !== id));
    }
  };

  const handleDeleteCandidate = (id: string) => {
    if (confirm('Deseja eliminar esta candidatura?')) {
      setCandidates(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleDeleteInterview = (id: string) => {
    if (confirm('Deseja desmarcar esta entrevista?')) {
      setInterviews(prev => prev.filter(i => i.id !== id));
    }
  };

  const getCandidateName = (id: string) => {
    const cand = candidates.find(c => c.id === id);
    return cand ? cand.name : 'Desconhecido';
  };

  const getVacancyTitle = (id: string) => {
    const vac = vacancies.find(v => v.id === id);
    return vac ? vac.title : 'Banco de Currículos / Candidato Geral';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-black text-xl flex items-center gap-2">
            <UserPlus className="text-zinc-800" size={24} />
            <span>Processo de Recrutamento</span>
          </h3>
          <p className="text-sm text-zinc-500">Controle vagas abertas, avalie candidatos e planeie entrevistas de contratação.</p>
        </div>

        <div className="flex bg-zinc-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('vacancies')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'vacancies' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Vagas ({vacancies.length})
          </button>
          <button
            onClick={() => setActiveSubTab('candidates')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'candidates' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Candidatos ({candidates.filter(c => c.status !== 'Banco de Currículos').length})
          </button>
          <button
            onClick={() => setActiveSubTab('interviews')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'interviews' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Entrevistas ({interviews.length})
          </button>
        </div>
      </div>

      {/* Vacancies Tab */}
      {activeSubTab === 'vacancies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsVacancyOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
            >
              <Plus size={14} /> Abrir Nova Vaga
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vacancies.map(vac => (
              <div key={vac.id} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all relative group">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    vac.status === 'Aberta' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {vac.status}
                  </span>
                  <button
                    onClick={() => handleDeleteVacancy(vac.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <h4 className="font-bold text-lg text-zinc-900">{vac.title}</h4>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                    <Building size={12} /> {vac.department}
                  </p>
                </div>

                <p className="text-xs text-zinc-600 line-clamp-3 bg-zinc-50 p-3 rounded-xl">
                  {vac.description || 'Sem descrição.'}
                </p>

                <div className="pt-2 flex justify-between items-center text-xs font-bold border-t border-zinc-100 text-zinc-700">
                  <span>Remuneração:</span>
                  <span className="text-black">{vac.salary || 'A discutir'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidates Tab */}
      {activeSubTab === 'candidates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsCandidateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
            >
              <Plus size={14} /> Registar Candidatura
            </button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-400 font-bold uppercase">
                  <th className="p-4">Candidato</th>
                  <th className="p-4">Contactos</th>
                  <th className="p-4">Vaga Pretendida</th>
                  <th className="p-4">Experiência</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {candidates.filter(c => c.status !== 'Banco de Currículos').map(cand => (
                  <tr key={cand.id} className="hover:bg-zinc-50">
                    <td className="p-4 font-bold text-zinc-900">{cand.name}</td>
                    <td className="p-4 space-y-0.5 text-xs text-zinc-500">
                      <p className="flex items-center gap-1"><Phone size={12} /> {cand.phone}</p>
                      <p className="flex items-center gap-1"><Mail size={12} /> {cand.email}</p>
                    </td>
                    <td className="p-4 text-zinc-600 font-medium">{getVacancyTitle(cand.vacancy_id || '')}</td>
                    <td className="p-4 text-xs text-zinc-500 max-w-xs truncate">{cand.experience}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                        cand.status === 'Aprovado' ? 'bg-emerald-50 text-emerald-700' :
                        cand.status === 'Rejeitado' ? 'bg-rose-50 text-rose-700' :
                        cand.status === 'Entrevista' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {cand.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => {
                            setCandidates(prev => prev.map(c => c.id === cand.id ? { ...c, status: 'Banco de Currículos' } : c));
                          }}
                          className="px-2 py-1 bg-zinc-100 text-zinc-600 text-xs font-bold rounded hover:bg-zinc-200"
                          title="Mover para Banco de Currículos"
                        >
                          CV Bank
                        </button>
                        <button
                          onClick={() => handleDeleteCandidate(cand.id)}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interviews Tab */}
      {activeSubTab === 'interviews' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsInterviewOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md"
            >
              <Plus size={14} /> Agendar Entrevista
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {interviews.map(inter => (
              <div key={inter.id} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all relative group">
                <div className="flex justify-between items-start">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                    inter.status === 'Realizada' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {inter.status === 'Realizada' ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {inter.status}
                  </span>
                  <button
                    onClick={() => handleDeleteInterview(inter.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Entrevista Candidato</p>
                  <h4 className="font-bold text-lg text-zinc-900">{getCandidateName(inter.candidate_id)}</h4>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-600 font-medium">
                  <p className="flex items-center gap-1.5 text-zinc-800">
                    <Calendar size={14} className="text-zinc-400" /> {new Date(inter.date).toLocaleDateString()} às {inter.time}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Briefcase size={14} className="text-zinc-400" /> Entrevistador: {inter.interviewer}
                  </p>
                </div>

                {inter.notes && (
                  <p className="text-xs text-zinc-500 italic bg-zinc-50 p-2.5 rounded-xl border border-zinc-100/60">
                    &ldquo;{inter.notes}&rdquo;
                  </p>
                )}

                {inter.status === 'Agendada' && (
                  <div className="flex gap-2 pt-2 border-t border-zinc-100">
                    <button
                      onClick={() => setInterviews(prev => prev.map(i => i.id === inter.id ? { ...i, status: 'Realizada' } : i))}
                      className="flex-1 py-1.5 bg-emerald-500 text-white font-bold text-xs rounded-lg hover:bg-emerald-600 transition-all"
                    >
                      Concluída
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forms Modals */}
      {isVacancyOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Nova Oportunidade de Trabalho</h3>
              <button onClick={() => setIsVacancyOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveVacancy} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Título da Vaga</label>
                <input required type="text" placeholder="Ex: Operador de Caixa" value={vacancyForm.title} onChange={e => setVacancyForm({ ...vacancyForm, title: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Departamento</label>
                <input required type="text" placeholder="Ex: Vendas" value={vacancyForm.department} onChange={e => setVacancyForm({ ...vacancyForm, department: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Salário Oportunidade</label>
                <input type="text" placeholder="Ex: 120.000 Kz" value={vacancyForm.salary} onChange={e => setVacancyForm({ ...vacancyForm, salary: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Descrição da Vaga</label>
                <textarea rows={3} placeholder="Requisitos e responsabilidades..." value={vacancyForm.description} onChange={e => setVacancyForm({ ...vacancyForm, description: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl resize-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsVacancyOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-black text-white font-bold rounded-xl text-sm">Guardar Vaga</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCandidateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Registar Candidato</h3>
              <button onClick={() => setIsCandidateOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCandidate} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Nome Completo</label>
                <input required type="text" value={candidateForm.name} onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Email</label>
                  <input required type="email" value={candidateForm.email} onChange={e => setCandidateForm({ ...candidateForm, email: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Telemóvel</label>
                  <input required type="text" value={candidateForm.phone} onChange={e => setCandidateForm({ ...candidateForm, phone: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Vaga Pretendida</label>
                <select value={candidateForm.vacancy_id} onChange={e => setCandidateForm({ ...candidateForm, vacancy_id: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <option value="">Candidatura Geral / CV Bank</option>
                  {vacancies.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Experiência Curta / Notas</label>
                <textarea rows={2} placeholder="Ex: 3 anos de caixa em supermercado..." value={candidateForm.experience} onChange={e => setCandidateForm({ ...candidateForm, experience: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl resize-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsCandidateOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-black text-white font-bold rounded-xl text-sm">Registar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isInterviewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Agendar Entrevista</h3>
              <button onClick={() => setIsInterviewOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveInterview} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Candidato</label>
                <select required value={interviewForm.candidate_id} onChange={e => setInterviewForm({ ...interviewForm, candidate_id: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <option value="">Escolher Candidato...</option>
                  {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Data</label>
                  <input required type="date" value={interviewForm.date} onChange={e => setInterviewForm({ ...interviewForm, date: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Hora</label>
                  <input required type="time" value={interviewForm.time} onChange={e => setInterviewForm({ ...interviewForm, time: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Intervistador(es)</label>
                <input required type="text" placeholder="Ex: Cláudio Ferreira (RH)" value={interviewForm.interviewer} onChange={e => setInterviewForm({ ...interviewForm, interviewer: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Notas Adicionais</label>
                <textarea rows={2} placeholder="O que avaliar na conversa..." value={interviewForm.notes} onChange={e => setInterviewForm({ ...interviewForm, notes: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl resize-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsInterviewOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-black text-white font-bold rounded-xl text-sm">Agendar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
