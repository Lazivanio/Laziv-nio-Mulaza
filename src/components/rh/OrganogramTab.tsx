import React from 'react';
import { Network, Building2, User as UserIcon, ChevronRight, ShieldCheck } from 'lucide-react';
import { User } from '../../types';
import { Department } from './types';

interface Props {
  employees: User[];
  departments: Department[];
  employeeDepartments: { [employeeId: string]: string };
}

export const OrganogramTab = ({ employees, departments, employeeDepartments }: Props) => {
  // Find employee of each department
  const getEmployeesInDept = (deptId: string) => {
    return employees.filter(emp => employeeDepartments[emp.id.toString()] === deptId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black text-xl flex items-center gap-2">
          <Network className="text-zinc-800" size={24} />
          <span>Organograma da Empresa</span>
        </h3>
        <p className="text-sm text-zinc-500">Representação visual da hierarquia e equipas de trabalho da organização.</p>
      </div>

      <div className="p-8 bg-zinc-50 border border-zinc-200 rounded-3xl overflow-x-auto min-w-full flex flex-col items-center">
        {/* Level 1: CEO / Board */}
        <div className="flex flex-col items-center">
          <div className="bg-zinc-950 text-white px-6 py-4 rounded-2xl shadow-xl border border-zinc-800 flex items-center gap-3 w-64">
            <div className="p-2.5 bg-zinc-800 rounded-xl">
              <ShieldCheck size={20} className="text-amber-400" />
            </div>
            <div>
              <h4 className="font-black text-sm tracking-wide">CONSELHO / DIREÇÃO</h4>
              <p className="text-[10px] text-zinc-400 font-bold uppercase">Administração Geral</p>
            </div>
          </div>
          
          {/* Vertical connector line */}
          <div className="w-0.5 h-10 bg-zinc-300" />
        </div>

        {/* Level 2: Departments */}
        <div className="flex flex-col items-center w-full">
          {/* Horizontal connecting bridge */}
          <div className="relative w-4/5 flex justify-center">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-300" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-4 w-full max-w-6xl">
            {departments.map((dept, index) => {
              const deptStaff = getEmployeesInDept(dept.id);
              return (
                <div key={dept.id} className="flex flex-col items-center relative">
                  {/* Vertical line to hook on horizontal bridge */}
                  <div className="w-0.5 h-4 bg-zinc-300 absolute -top-4" />

                  {/* Department Card */}
                  <div className="bg-white border-2 border-zinc-200 rounded-2xl p-4 w-full shadow-sm hover:border-black transition-all space-y-3">
                    <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                      <div className="p-2 bg-zinc-100 rounded-lg text-zinc-800">
                        <Building2 size={16} />
                      </div>
                      <h5 className="font-bold text-xs uppercase text-zinc-900 truncate">{dept.name}</h5>
                    </div>

                    {/* Department Staff members listing inside */}
                    <div className="space-y-2">
                      {deptStaff.length === 0 ? (
                        <p className="text-[10px] text-zinc-400 italic text-center py-2">Sem pessoal associado</p>
                      ) : (
                        deptStaff.map(emp => (
                          <div key={emp.id} className="flex items-center gap-2 p-1.5 bg-zinc-50 rounded-lg border border-zinc-100">
                            <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600">
                              <UserIcon size={12} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-zinc-900 truncate">{emp.name}</p>
                              <p className="text-[8px] text-zinc-400 uppercase font-black tracking-wider">{(emp as any).role_name || 'Staff'}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
