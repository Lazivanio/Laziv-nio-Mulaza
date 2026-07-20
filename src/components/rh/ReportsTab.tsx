import React from 'react';
import { FileText, Users, DollarSign, Calendar, Clock, Award, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { User } from '../../types';
import { Department, Contract, Leave, Evaluation, Resignation } from './types';

interface Props {
  employees: User[];
  departments: Department[];
  contracts: Contract[];
  leaves: Leave[];
  evaluations: Evaluation[];
  resignations: Resignation[];
  attendance: any[];
}

export const ReportsTab = ({ employees, departments, contracts, leaves, evaluations, resignations, attendance }: Props) => {
  // 1. Stats
  const activeEmployeesCount = employees.filter(e => e.status !== 'suspended').length;
  const suspendedEmployeesCount = employees.filter(e => e.status === 'suspended').length;

  const totalBaseSalaries = employees.reduce((sum, e) => sum + (Number((e as any).base_salary) || 0), 0);

  const avgEvaluation = evaluations.length > 0 
    ? (evaluations.reduce((sum, ev) => sum + (ev.punctuality + ev.productivity + ev.behavior + ev.communication + ev.teamwork + ev.responsibility) / 6, 0) / evaluations.length).toFixed(1)
    : '0.0';

  const pendingLeaves = leaves.filter(l => l.status === 'Pendente').length;
  
  // 2. Attendance Stats
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const lateDays = attendance.filter(a => a.status === 'late').length;
  const absentDays = attendance.filter(a => a.status === 'absent').length;
  const totalDays = attendance.length || 1;
  const attendanceRate = ((presentDays / totalDays) * 100).toFixed(0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black text-xl flex items-center gap-2">
          <FileText className="text-zinc-800" size={24} />
          <span>Relatórios de Recursos Humanos</span>
        </h3>
        <p className="text-sm text-zinc-500">Acompanhe estatísticas, rotatividade, assiduidade e custos com pessoal.</p>
      </div>

      {/* Bento Grid Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">Colaboradores</span>
            <div className="p-2 bg-zinc-100 rounded-xl text-zinc-800"><Users size={18} /></div>
          </div>
          <div>
            <h4 className="text-3xl font-black text-zinc-900">{activeEmployeesCount}</h4>
            <p className="text-xs text-zinc-500 font-medium mt-1">{suspendedEmployeesCount} suspensos / inativos</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">Folha Base Mensal</span>
            <div className="p-2 bg-zinc-100 rounded-xl text-zinc-800"><DollarSign size={18} /></div>
          </div>
          <div>
            <h4 className="text-3xl font-black text-zinc-900">Kz {totalBaseSalaries.toLocaleString()}</h4>
            <p className="text-xs text-zinc-500 font-medium mt-1">Soma de todos os salários base</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">Assiduidade Geral</span>
            <div className="p-2 bg-zinc-100 rounded-xl text-zinc-800"><Clock size={18} /></div>
          </div>
          <div>
            <h4 className="text-3xl font-black text-emerald-600">{attendanceRate}%</h4>
            <p className="text-xs text-zinc-500 font-medium mt-1">{lateDays} atrasos / {absentDays} faltas</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">Score de Desempenho</span>
            <div className="p-2 bg-zinc-100 rounded-xl text-zinc-800"><Award size={18} /></div>
          </div>
          <div>
            <h4 className="text-3xl font-black text-indigo-600">{avgEvaluation}/5.0</h4>
            <p className="text-xs text-zinc-500 font-medium mt-1">{evaluations.length} avaliações lançadas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admissions vs Resignations visual helper */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-base text-zinc-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-zinc-500" />
            <span>Rotatividade & Admissões</span>
          </h4>
          <div className="space-y-3.5 pt-2">
            <div className="flex justify-between items-center p-4 bg-zinc-50 rounded-xl">
              <div>
                <p className="text-xs font-black text-zinc-400 uppercase">Total Contratos Emitidos</p>
                <p className="text-sm font-bold text-zinc-800 mt-0.5">{contracts.length} ativos</p>
              </div>
              <span className="text-emerald-600 bg-emerald-50 p-2 rounded-lg flex items-center gap-1 text-xs font-bold">
                <ArrowUpRight size={14} /> Ativo
              </span>
            </div>

            <div className="flex justify-between items-center p-4 bg-zinc-50 rounded-xl">
              <div>
                <p className="text-xs font-black text-zinc-400 uppercase">Cessação de Funções (Saídas)</p>
                <p className="text-sm font-bold text-zinc-800 mt-0.5">{resignations.length} demissões registadas</p>
              </div>
              <span className="text-rose-600 bg-rose-50 p-2 rounded-lg flex items-center gap-1 text-xs font-bold">
                <ArrowDownRight size={14} /> Saídas
              </span>
            </div>
          </div>
        </div>

        {/* Leaves and vacations logs summary */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-base text-zinc-900 flex items-center gap-2">
            <Calendar size={18} className="text-zinc-500" />
            <span>Licenças & Férias</span>
          </h4>
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-zinc-50 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-zinc-400 uppercase">Licenças de Ausência</p>
                <p className="text-sm font-medium text-zinc-600 mt-1">
                  <strong>{pendingLeaves}</strong> pendentes de aprovação do RH.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">{leaves.length} Total</span>
            </div>

            <div className="p-4 bg-zinc-50 rounded-xl">
              <p className="text-xs font-black text-zinc-400 uppercase">Distribuição por Categoria</p>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="flex justify-between p-1 border-b border-zinc-100">
                  <span className="text-zinc-500">Licenças Médicas:</span>
                  <strong className="text-zinc-900">{leaves.filter(l => l.type === 'Licença médica').length}</strong>
                </div>
                <div className="flex justify-between p-1 border-b border-zinc-100">
                  <span className="text-zinc-500">Maternidade:</span>
                  <strong className="text-zinc-900">{leaves.filter(l => l.type === 'Licença de maternidade').length}</strong>
                </div>
                <div className="flex justify-between p-1">
                  <span className="text-zinc-500">Sem Vencimento:</span>
                  <strong className="text-zinc-900">{leaves.filter(l => l.type === 'Licença sem vencimento').length}</strong>
                </div>
                <div className="flex justify-between p-1">
                  <span className="text-zinc-500">Especiais:</span>
                  <strong className="text-zinc-900">{leaves.filter(l => l.type === 'Licença especial').length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
