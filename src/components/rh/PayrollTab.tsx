import React, { useState } from 'react';
import { DollarSign, FileText, Printer, Building, Download, FileSpreadsheet, Send, X, ShieldCheck } from 'lucide-react';
import { User, HRSalary, HRSalaryPayment } from '../../types';
import { Advance, Loan } from './types';

interface Props {
  employees: User[];
  advances: Advance[];
  setAdvances: React.Dispatch<React.SetStateAction<Advance[]>>;
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  salaries: HRSalary[];
  salaryPayments: HRSalaryPayment[];
  onPaymentSuccess?: () => void;
}

export const PayrollTab = ({ 
  employees, 
  advances, 
  setAdvances, 
  loans, 
  setLoans,
  salaries = [],
  salaryPayments = [],
  onPaymentSuccess
}: Props) => {
  const [activeSubView, setActiveSubView] = useState<'calculator' | 'sheet' | 'bank_transfer'>('calculator');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [processing, setProcessing] = useState(false);
  
  // Form Calculator State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [foodSubsidy, setFoodSubsidy] = useState('0');
  const [transportSubsidy, setTransportSubsidy] = useState('0');
  const [housingSubsidy, setHousingSubsidy] = useState('0');
  const [overtime, setOvertime] = useState('0');
  const [commissions, setCommissions] = useState('0');
  const [bonus, setBonus] = useState('0');
  const [fines, setFines] = useState('0');
  const [customAdvances, setCustomAdvances] = useState('0');

  const selectedEmployee = employees.find(e => e.id.toString() === selectedEmpId);
  const employeeSalary = salaries.find(s => s.user_id.toString() === selectedEmpId);
  const employeeBaseSalary = employeeSalary ? Number(employeeSalary.base_salary) : (selectedEmployee ? Number((selectedEmployee as any).base_salary) || 80000 : 0);

  // Filter payments for selected month
  const currentMonthPayments = salaryPayments.filter(p => p.month === selectedMonth);

  // Auto-load approved advances for this employee
  const employeeApprovedAdvances = selectedEmpId
    ? advances
        .filter(a => a.employee_id === selectedEmpId && a.status === 'Aprovado')
        .reduce((sum, a) => sum + a.amount, 0)
    : 0;

  // Angola INSS & IRT Progressive Tax Calculation
  const calculateDeductions = (base: number) => {
    // INSS is 3% of base salary for employees
    const inss = base * 0.03;
    
    // IRT Progressive Tiers
    // <= 70,000: Exempt
    // 70,001 to 100,000: 10% on excess of 70,000
    // 100,001 to 150,000: 3,000 + 13% on excess of 100,000
    // 150,001 to 200,000: 9,500 + 16% on excess of 150,000
    // > 200,000: 17,500 + 18% on excess of 200,000
    let irt = 0;
    if (base > 200000) {
      irt = 17500 + (base - 200000) * 0.18;
    } else if (base > 150000) {
      irt = 9500 + (base - 150000) * 0.16;
    } else if (base > 100000) {
      irt = 3000 + (base - 100000) * 0.13;
    } else if (base > 70000) {
      irt = (base - 70000) * 0.10;
    }

    return { inss, irt };
  };

  const { inss: computedINSS, irt: computedIRT } = calculateDeductions(employeeBaseSalary);

  // Total Earnings
  const totalEarnings = employeeBaseSalary + 
    Number(foodSubsidy) + 
    Number(transportSubsidy) + 
    Number(housingSubsidy) + 
    Number(overtime) + 
    Number(commissions) + 
    Number(bonus);

  // Total Deductions
  const advanceAmountToDeduct = Number(customAdvances) || employeeApprovedAdvances;
  const totalDeductions = computedINSS + computedIRT + advanceAmountToDeduct + Number(fines);

  // Net Salary
  const netSalary = Math.max(0, totalEarnings - totalDeductions);

  const handleProcessPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (!employeeSalary) {
      alert("Este colaborador não possui um salário base configurado no Histórico Salarial.");
      return;
    }

    // Check if already processed for this employee and month
    const exists = salaryPayments.some(p => p.salary_id === employeeSalary.id && p.month === selectedMonth);
    if (exists) {
      alert(`A folha de salário para este funcionário já foi processada neste mês (${selectedMonth}).`);
      return;
    }

    setProcessing(true);

    const bonusVal = Number(foodSubsidy) + Number(transportSubsidy) + Number(housingSubsidy) + Number(overtime) + Number(commissions) + Number(bonus);
    const absenceVal = advanceAmountToDeduct + Number(fines);
    const ssAbsolute = computedINSS;
    const irtAbsolute = computedIRT;
    const finalNetAmount = netSalary;

    try {
      const res = await fetch('/api/owner/hr/salaries/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salary_id: employeeSalary.id,
          amount: finalNetAmount,
          bonus: bonusVal,
          absence_discount: absenceVal,
          ss_discount: ssAbsolute,
          irt_tax: irtAbsolute,
          type: 'full_payment',
          description: 'Processamento de Folha de Salário',
          month: selectedMonth
        })
      });

      if (res.ok) {
        const resData = await res.json();

        // Clear approved advances if they were deducted
        if (employeeApprovedAdvances > 0) {
          setAdvances(prev => 
            prev.map(a => 
              a.employee_id === selectedEmpId && a.status === 'Aprovado' 
                ? { ...a, status: 'Descontado' } 
                : a
            )
          );
        }

        // Reset Calculator
        setSelectedEmpId('');
        setFoodSubsidy('0');
        setTransportSubsidy('0');
        setHousingSubsidy('0');
        setOvertime('0');
        setCommissions('0');
        setBonus('0');
        setFines('0');
        setCustomAdvances('0');

        alert(`Folha processada com sucesso para ${selectedEmployee.name}! Gerando o recibo de vencimento oficial...`);
        
        if (resData.id) {
          window.open(`/api/owner/hr/salaries/receipt/${resData.id}`, '_blank');
        }

        // Refresh parent states
        onPaymentSuccess?.();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Erro ao processar folha de salário.");
      }
    } catch (err) {
      console.error("Error processing payroll:", err);
      alert("Erro de conexão ao processar folha de salário.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-black text-xl flex items-center gap-2">
            <DollarSign className="text-zinc-800" size={24} />
            <span>Processamento Salarial (Payroll)</span>
          </h3>
          <p className="text-sm text-zinc-500 font-medium">Calcule e processe ordenados, impostos, subsídios e adiantamentos.</p>
        </div>

        <div className="flex bg-zinc-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveSubView('calculator')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubView === 'calculator' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Calculadora
          </button>
          <button
            onClick={() => setActiveSubView('sheet')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubView === 'sheet' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Folha de Pagamentos ({currentMonthPayments.length})
          </button>
          <button
            onClick={() => setActiveSubView('bank_transfer')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubView === 'bank_transfer' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Guia Bancária
          </button>
        </div>
      </div>

      {/* 1. Calculator/Processor view */}
      {activeSubView === 'calculator' && (
        <form onSubmit={handleProcessPayroll} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
              <h4 className="font-bold text-base text-zinc-900 border-b border-zinc-100 pb-2">Seleção & Subvenções</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-black text-zinc-500 uppercase">Colaborador</label>
                  <select
                    required
                    value={selectedEmpId}
                    onChange={e => setSelectedEmpId(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-black text-sm"
                  >
                    <option value="">Selecione o Colaborador...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase">Mês de Processamento</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase">Subsídio de Alimentação (Kz)</label>
                  <input
                    type="number"
                    value={foodSubsidy}
                    onChange={e => setFoodSubsidy(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase">Subsídio de Transporte (Kz)</label>
                  <input
                    type="number"
                    value={transportSubsidy}
                    onChange={e => setTransportSubsidy(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase">Subsídio de Habitação (Kz)</label>
                  <input
                    type="number"
                    value={housingSubsidy}
                    onChange={e => setHousingSubsidy(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
              <h4 className="font-bold text-base text-zinc-900 border-b border-zinc-100 pb-2">Variáveis & Descontos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase">Horas Extras (Kz)</label>
                  <input
                    type="number"
                    value={overtime}
                    onChange={e => setOvertime(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase">Comissões (Kz)</label>
                  <input
                    type="number"
                    value={commissions}
                    onChange={e => setCommissions(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase">Bónus Eventual (Kz)</label>
                  <input
                    type="number"
                    value={bonus}
                    onChange={e => setBonus(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase">Multas / Faltas (Kz)</label>
                  <input
                    type="number"
                    value={fines}
                    onChange={e => setFines(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase flex justify-between">
                    <span>Adiantamentos a Descontar</span>
                    {employeeApprovedAdvances > 0 && (
                      <span className="text-[10px] text-amber-600 font-bold">Aprovado: Kz {employeeApprovedAdvances.toLocaleString()}</span>
                    )}
                  </label>
                  <input
                    type="number"
                    placeholder={employeeApprovedAdvances.toString()}
                    value={customAdvances}
                    onChange={e => setCustomAdvances(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick breakdown receipt panel on the right */}
          <div className="bg-zinc-950 text-white rounded-3xl p-6 space-y-6 flex flex-col justify-between h-fit self-start">
            <div className="space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h4 className="font-bold text-sm text-zinc-400 uppercase tracking-wider">Simulador Ativo</h4>
                <p className="text-xl font-black mt-1 text-white">{selectedEmployee ? selectedEmployee.name : 'Nenhum Colaborador'}</p>
                <p className="text-xs text-zinc-500">Mês: {selectedMonth}</p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Salário Base:</span>
                  <span className="font-bold text-white">Kz {employeeBaseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Total Subvenções:</span>
                  <span className="font-bold text-white">
                    Kz {(Number(foodSubsidy) + Number(transportSubsidy) + Number(housingSubsidy)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Extras (Horas/Comissões):</span>
                  <span className="font-bold text-white">
                    Kz {(Number(overtime) + Number(commissions) + Number(bonus)).toLocaleString()}
                  </span>
                </div>
                
                <div className="border-t border-zinc-800 my-2 pt-2" />

                <div className="flex justify-between text-rose-400">
                  <span>INSS (3%):</span>
                  <span className="font-bold">- Kz {computedINSS.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>IRT Progressivo:</span>
                  <span className="font-bold">- Kz {computedIRT.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Adiantamentos Descontados:</span>
                  <span className="font-bold">- Kz {advanceAmountToDeduct.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Multas & Faltas:</span>
                  <span className="font-bold">- Kz {Number(fines).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-zinc-400 tracking-wider">Valor Líquido:</span>
                <span className="text-2xl font-black text-emerald-400">Kz {netSalary.toLocaleString()}</span>
              </div>

              <button
                type="submit"
                disabled={!selectedEmployee || processing}
                className="w-full py-3 bg-white text-zinc-950 rounded-2xl text-sm font-black hover:bg-zinc-100 disabled:opacity-40 transition-all shadow-xl"
              >
                {processing ? 'A Processar...' : 'Concluir & Processar'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 2. Processed list ledger */}
      {activeSubView === 'sheet' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-lg text-zinc-800">Ordenados Processados ({selectedMonth})</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-medium">Visualizar mês:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-3 py-1 bg-white border border-zinc-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-500 font-black uppercase">
                  <th className="p-4">Colaborador</th>
                  <th className="p-4">Mês</th>
                  <th className="p-4">Salário Base</th>
                  <th className="p-4">Total Descontos</th>
                  <th className="p-4">Líquido Recebido</th>
                  <th className="p-4 text-center">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {currentMonthPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-400 italic">
                      Nenhum vencimento processado para o período selecionado ({selectedMonth}).
                    </td>
                  </tr>
                ) : (
                  currentMonthPayments.map(pay => {
                    const totalDeds = (pay.ss_discount || 0) + (pay.irt_tax || 0) + (pay.absence_discount || 0);
                    return (
                      <tr key={pay.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="p-4 font-bold text-zinc-900">{pay.employee_name}</td>
                        <td className="p-4 font-semibold text-zinc-600">{pay.month}</td>
                        <td className="p-4">Kz {(pay.base_salary || 0).toLocaleString()}</td>
                        <td className="p-4 text-rose-600 font-medium">- Kz {totalDeds.toLocaleString()}</td>
                        <td className="p-4 font-black text-emerald-600">Kz {(pay.amount || 0).toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => window.open(`/api/owner/hr/salaries/receipt/${pay.id}`, '_blank')}
                            className="p-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg inline-flex items-center gap-1 text-xs font-bold border border-zinc-200 shadow-sm"
                          >
                            <FileText size={14} /> Recibo Oficial
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Bank Transfer view */}
      {activeSubView === 'bank_transfer' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-lg text-zinc-800">Guia de Transferências Bancárias ({selectedMonth})</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-medium">Visualizar mês:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-3 py-1 bg-white border border-zinc-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-500 font-black uppercase">
                  <th className="p-4">Beneficiário</th>
                  <th className="p-4">IBAN</th>
                  <th className="p-4">Mês de Referência</th>
                  <th className="p-4">Montante Transferir</th>
                  <th className="p-4">Banco Destino</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {currentMonthPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-400 italic">
                      Nenhum ordenado processado para gerar guia de transferências bancárias.
                    </td>
                  </tr>
                ) : (
                  currentMonthPayments.map(pay => {
                    const emp = employees.find(e => e.name === pay.employee_name);
                    const iban = (emp as any)?.iban || 'AO06.0000.0000.0000.0000.0';
                    return (
                      <tr key={pay.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="p-4 font-bold text-zinc-900">{pay.employee_name}</td>
                        <td className="p-4 font-mono text-zinc-600 text-xs">{iban}</td>
                        <td className="p-4 text-zinc-500">{pay.month}</td>
                        <td className="p-4 font-black text-black">Kz {(pay.amount || 0).toLocaleString()}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold text-zinc-700">BFA / BAI / BIC</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
