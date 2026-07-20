import React from 'react';
import { 
  Users, 
  Building, 
  DollarSign, 
  Calendar, 
  Briefcase, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  ChevronRight, 
  CheckCircle, 
  UserX, 
  FileText,
  Plus
} from 'lucide-react';
import { User, HRVacation } from '../../types';
import { Department, Contract, Leave, Vacancy, Candidate, Interview, Warning, Advance, Loan, Resignation } from './types';

interface DashboardTabProps {
  employees: User[];
  departments: Department[];
  contracts: Contract[];
  leaves: Leave[];
  vacations: HRVacation[];
  vacancies: Vacancy[];
  candidates: Candidate[];
  interviews: Interview[];
  warnings: Warning[];
  advances: Advance[];
  loans: Loan[];
  resignations: Resignation[];
  employeeDepartments: { [employeeId: string]: string };
  setActiveTab: (tab: string) => void;
  setIsEmployeeModalOpen?: (open: boolean) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  employees,
  departments,
  contracts,
  leaves,
  vacations,
  vacancies,
  candidates,
  interviews,
  warnings,
  advances,
  loans,
  resignations,
  employeeDepartments,
  setActiveTab,
  setIsEmployeeModalOpen
}) => {
  // Aggregate Metrics
  const totalStaff = employees.length;
  const activeStaff = employees.filter(emp => emp.status === 'active' || !emp.status).length;
  const suspendedStaff = employees.filter(emp => emp.status === 'suspended').length;
  
  // Payroll calculation
  const monthlyPayroll = employees
    .filter(emp => emp.status === 'active' || !emp.status)
    .reduce((sum, emp) => sum + (Number((emp as any).base_salary) || 0), 0);

  // Active contracts
  const activeContracts = contracts.filter(c => c.status === 'Ativo').length;

  // Pending items requiring manager attention
  const pendingLeaves = leaves.filter(l => l.status === 'Pendente').length;
  const pendingVacations = vacations.filter(v => v.status === 'pending').length;
  const pendingAdvances = advances.filter(a => a.status === 'Pendente').length;
  const pendingResignations = resignations.filter(r => r.status === 'Pendente').length;
  
  const totalPendingApprovals = pendingLeaves + pendingVacations + pendingAdvances + pendingResignations;

  // Recruitment
  const openVacancies = vacancies.filter(v => v.status === 'Aberta').length;
  const totalCandidates = candidates.length;
  const upcomingInterviews = interviews.filter(i => i.status === 'Agendada');

  // Department distribution
  const deptDistribution = departments.map(dept => {
    const count = employees.filter(emp => {
      const deptId = employeeDepartments[emp.id.toString()];
      return deptId === dept.id;
    }).length;
    return {
      ...dept,
      count,
      percentage: totalStaff > 0 ? Math.round((count / totalStaff) * 100) : 0
    };
  }).sort((a, b) => b.count - a.count);

  // Unassigned employees count
  const unassignedCount = employees.filter(emp => !employeeDepartments[emp.id.toString()]).length;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div 
          onClick={() => setActiveTab('employees')}
          className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-zinc-100 rounded-xl text-zinc-800 group-hover:bg-zinc-900 group-hover:text-white transition-all">
              <Users size={22} />
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-0.5 rounded-lg">
              {activeStaff} Ativos
            </span>
          </div>
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Funcionários</p>
          <h3 className="text-3xl font-black text-zinc-950 mt-1">{totalStaff}</h3>
          <p className="text-xs text-zinc-400 mt-2">
            {suspendedStaff > 0 ? `${suspendedStaff} suspensos` : 'Todos em conformidade'}
          </p>
        </div>

        {/* Monthly Payroll */}
        <div 
          onClick={() => setActiveTab('payroll')}
          className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-zinc-100 rounded-xl text-zinc-800 group-hover:bg-zinc-900 group-hover:text-white transition-all">
              <DollarSign size={22} />
            </div>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Massa Salarial</p>
          <h3 className="text-2xl font-black text-zinc-950 mt-1 truncate">Kz {monthlyPayroll.toLocaleString()}</h3>
          <p className="text-xs text-zinc-400 mt-2">Custo base mensal projetado</p>
        </div>

        {/* Pending Approvals */}
        <div 
          onClick={() => setActiveTab(pendingLeaves > 0 || pendingVacations > 0 ? 'leaves' : pendingAdvances > 0 ? 'advances' : 'employees')}
          className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-zinc-100 rounded-xl text-zinc-800 group-hover:bg-zinc-900 group-hover:text-white transition-all">
              <Clock size={22} />
            </div>
            {totalPendingApprovals > 0 ? (
              <span className="animate-pulse h-2.5 w-2.5 rounded-full bg-amber-500" />
            ) : (
              <CheckCircle size={18} className="text-emerald-500" />
            )}
          </div>
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Pendentes de Ação</p>
          <h3 className="text-3xl font-black text-zinc-950 mt-1">{totalPendingApprovals}</h3>
          <p className="text-xs text-zinc-400 mt-2 truncate">
            {pendingLeaves + pendingVacations} férias/férias, {pendingAdvances} adiantamentos
          </p>
        </div>

        {/* Recruitment Funnel */}
        <div 
          onClick={() => setActiveTab('recruitment')}
          className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-zinc-100 rounded-xl text-zinc-800 group-hover:bg-zinc-900 group-hover:text-white transition-all">
              <Briefcase size={22} />
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2 py-0.5 rounded-lg">
              {openVacancies} Vagas
            </span>
          </div>
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Atração de Talentos</p>
          <h3 className="text-3xl font-black text-zinc-950 mt-1">{totalCandidates}</h3>
          <p className="text-xs text-zinc-400 mt-2">
            Candidatos no funil ({upcomingInterviews.length} entrevistas)
          </p>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-2xl">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Atalhos e Ações Rápidas</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <button 
            onClick={() => {
              if (setIsEmployeeModalOpen) {
                setIsEmployeeModalOpen(true);
              } else {
                setActiveTab('employees');
              }
            }}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 transition-all shadow-sm"
          >
            <Plus size={14} className="text-zinc-500" />
            Adicionar Funcionário
          </button>
          
          <button 
            onClick={() => setActiveTab('payroll')}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 transition-all shadow-sm"
          >
            <FileText size={14} className="text-zinc-500" />
            Processar Folha
          </button>

          <button 
            onClick={() => setActiveTab('leaves')}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 transition-all shadow-sm"
          >
            <Calendar size={14} className="text-zinc-500" />
            Marcar Férias
          </button>

          <button 
            onClick={() => setActiveTab('recruitment')}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 transition-all shadow-sm"
          >
            <Briefcase size={14} className="text-zinc-500" />
            Criar Vaga Aberta
          </button>

          <button 
            onClick={() => setActiveTab('reports')}
            className="col-span-2 sm:col-span-1 flex items-center gap-2 px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <TrendingUp size={14} />
            Relatórios e Gestão
          </button>
        </div>
      </div>

      {/* Main Grid: Distributions & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Staffing */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Funcionários por Departamento</h3>
                <p className="text-xs text-zinc-400">Distribuição interna de pessoal</p>
              </div>
              <Building size={18} className="text-zinc-400" />
            </div>

            <div className="space-y-4">
              {deptDistribution.map((dept, idx) => (
                <div key={dept.id || idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-zinc-700 truncate">{dept.name}</span>
                    <span className="text-zinc-900">{dept.count} ({dept.percentage}%)</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        idx === 0 ? 'bg-zinc-900' :
                        idx === 1 ? 'bg-zinc-600' :
                        idx === 2 ? 'bg-zinc-400' : 'bg-zinc-300'
                      }`} 
                      style={{ width: `${dept.percentage}%` }}
                    />
                  </div>
                </div>
              ))}

              {unassignedCount > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-zinc-500 italic">Sem Departamento</span>
                    <span className="text-zinc-900">{unassignedCount}</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-rose-400" 
                      style={{ width: `${Math.round((unassignedCount / (totalStaff || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {departments.length === 0 && (
                <div className="text-center py-6 text-zinc-400 text-xs font-bold">
                  Nenhum departamento registado.
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => setActiveTab('departments')}
            className="w-full text-center mt-6 pt-3 border-t border-zinc-100 text-xs font-bold text-zinc-500 hover:text-zinc-900 flex items-center justify-center gap-1.5 transition-all"
          >
            Gerir Departamentos
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Pending Tasks & Approvals */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Pedidos e Validações</h3>
                <p className="text-xs text-zinc-400">Solicitações urgentes pendentes</p>
              </div>
              <Clock size={18} className="text-zinc-400" />
            </div>

            <div className="space-y-3">
              {/* Leaves & Vacations */}
              {leaves.filter(l => l.status === 'Pendente').slice(0, 2).map(leave => {
                const emp = employees.find(e => e.id.toString() === leave.employee_id.toString());
                return (
                  <div key={leave.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-zinc-900">{emp?.name || 'Funcionário'}</p>
                      <p className="text-[10px] text-amber-700 font-bold">{leave.type}</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('leaves')}
                      className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg hover:bg-amber-200"
                    >
                      Analisar
                    </button>
                  </div>
                );
              })}

              {vacations.filter(v => v.status === 'pending').slice(0, 2).map(vac => (
                <div key={vac.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black text-zinc-900">{vac.employee_name || 'Funcionário'}</p>
                    <p className="text-[10px] text-amber-700 font-bold">Solicitação de Férias ({vac.days_count} dias)</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('leaves')}
                    className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg hover:bg-amber-200"
                  >
                    Analisar
                  </button>
                </div>
              ))}

              {/* Advances */}
              {advances.filter(a => a.status === 'Pendente').slice(0, 2).map(adv => {
                const emp = employees.find(e => e.id.toString() === adv.employee_id.toString());
                return (
                  <div key={adv.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-zinc-900">{emp?.name || 'Funcionário'}</p>
                      <p className="text-[10px] text-amber-700 font-bold">Adiantamento: Kz {adv.amount.toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('advances')}
                      className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg hover:bg-amber-200"
                    >
                      Analisar
                    </button>
                  </div>
                );
              })}

              {/* Resignations */}
              {resignations.filter(r => r.status === 'Pendente').slice(0, 2).map(res => {
                const emp = employees.find(e => e.id.toString() === res.employee_id.toString());
                return (
                  <div key={res.id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-zinc-900">{emp?.name || 'Funcionário'}</p>
                      <p className="text-[10px] text-rose-700 font-bold">{res.type}</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('resignations')}
                      className="px-2 py-1 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-lg hover:bg-rose-200"
                    >
                      Analisar
                    </button>
                  </div>
                );
              })}

              {totalPendingApprovals === 0 && (
                <div className="text-center py-8">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle size={20} />
                  </div>
                  <p className="text-xs font-bold text-zinc-900">Tudo em dia!</p>
                  <p className="text-[11px] text-zinc-400 mt-1">Nenhum pedido pendente aguarda a sua aprovação.</p>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('leaves')}
            className="w-full text-center mt-6 pt-3 border-t border-zinc-100 text-xs font-bold text-zinc-500 hover:text-zinc-900 flex items-center justify-center gap-1.5 transition-all"
          >
            Ver Calendário de Férias
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Talent Acquisition & Active Contracts */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Contratações & Recrutamento</h3>
                <p className="text-xs text-zinc-400">Banco de talentos e entrevistas agendadas</p>
              </div>
              <Briefcase size={18} className="text-zinc-400" />
            </div>

            <div className="space-y-4">
              {/* Upcoming Interviews */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Próximas Entrevistas</p>
                {upcomingInterviews.slice(0, 2).map(int => {
                  const cand = candidates.find(c => c.id === int.candidate_id);
                  return (
                    <div key={int.id} className="flex items-center gap-3 p-2 bg-zinc-50 border border-zinc-150 rounded-xl">
                      <div className="w-7 h-7 bg-zinc-200 text-zinc-700 font-bold rounded-lg flex items-center justify-center text-xs">
                        {cand?.name ? cand.name.substring(0, 2).toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-zinc-900 truncate">{cand?.name || 'Candidato'}</p>
                        <p className="text-[10px] text-zinc-500 font-bold">
                          {new Date(int.date).toLocaleDateString()} às {int.time} por {int.interviewer}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {upcomingInterviews.length === 0 && (
                  <p className="text-xs text-zinc-400 italic">Sem entrevistas agendadas no momento.</p>
                )}
              </div>

              {/* Active Contracts Summary */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipologia de Contratos</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-zinc-700">
                  <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-150">
                    <p className="text-[10px] text-zinc-400 uppercase">Ativos</p>
                    <p className="text-lg font-black text-zinc-900">{activeContracts}</p>
                  </div>
                  <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-150">
                    <p className="text-[10px] text-zinc-400 uppercase">Total Vagas</p>
                    <p className="text-lg font-black text-zinc-900">{vacancies.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('recruitment')}
            className="w-full text-center mt-6 pt-3 border-t border-zinc-100 text-xs font-bold text-zinc-500 hover:text-zinc-900 flex items-center justify-center gap-1.5 transition-all"
          >
            Painel de Recrutamento
            <ChevronRight size={14} />
          </button>
        </div>

      </div>

      {/* Disciplinary Warnings & Resignations alerts */}
      {warnings.length > 0 && (
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-black text-red-950 uppercase tracking-wider">Histórico de Infrações e Advertências</h4>
            <p className="text-xs text-red-700 mt-1">
              Existem {warnings.length} advertências ou ocorrências registadas no histórico disciplinar. 
              Mantenha o acompanhamento constante das avaliações para garantir o bem-estar e o bom ambiente de trabalho.
            </p>
            <button 
              onClick={() => setActiveTab('warnings')}
              className="text-[11px] font-black text-red-900 underline mt-2 hover:text-red-950 block"
            >
              Consultar Registo de Advertências
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
