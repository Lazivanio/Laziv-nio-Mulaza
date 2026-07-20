import { User } from '../../types';

export interface Department {
  id: string;
  name: string;
  description: string;
  budget: string;
  manager_id?: string;
}

export interface Contract {
  id: string;
  employee_id: string;
  type: 'Efetivo' | 'Temporário' | 'Estágio' | 'Prestação de serviços' | 'Tempo parcial';
  start_date: string;
  end_date?: string;
  renewal: boolean;
  salary: number;
  schedule: string;
  status: 'Ativo' | 'Terminado' | 'Pendente';
}

export interface Leave {
  id: string;
  employee_id: string;
  type: 'Licença médica' | 'Licença de maternidade' | 'Licença de paternidade' | 'Licença sem vencimento' | 'Licença especial';
  start_date: string;
  end_date: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  notes?: string;
}

export interface Evaluation {
  id: string;
  employee_id: string;
  date: string;
  punctuality: number; // 1 to 5
  productivity: number; // 1 to 5
  behavior: number; // 1 to 5
  communication: number; // 1 to 5
  teamwork: number; // 1 to 5
  responsibility: number; // 1 to 5
  finalResult: 'Excelente' | 'Bom' | 'Regular' | 'Ruim';
  notes?: string;
}

export interface Vacancy {
  id: string;
  title: string;
  department: string;
  salary: string;
  description: string;
  status: 'Aberta' | 'Fechada' | 'Pendente';
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  vacancy_id?: string;
  status: 'Triagem' | 'Entrevista' | 'Aprovado' | 'Rejeitado' | 'Banco de Currículos';
  experience: string;
  notes: string;
}

export interface Interview {
  id: string;
  candidate_id: string;
  date: string;
  time: string;
  interviewer: string;
  status: 'Agendada' | 'Realizada' | 'Cancelada';
  notes: string;
}

export interface Benefit {
  id: string;
  employee_id: string;
  healthPlan: boolean;
  insurance: boolean;
  transport: number;
  food: number;
  housing: number;
  bonus: number;
  others: number;
}

export interface Advance {
  id: string;
  employee_id: string;
  amount: number;
  date: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Descontado';
  notes?: string;
}

export interface Loan {
  id: string;
  employee_id: string;
  total_amount: number;
  installment: number;
  balance: number;
  start_date: string;
  status: 'Ativo' | 'Liquidado';
}

export interface Warning {
  id: string;
  employee_id: string;
  type: 'Advertência verbal' | 'Advertência escrita' | 'Suspensão' | 'Ocorrência';
  date: string;
  description: string;
  severity: 'Leve' | 'Média' | 'Grave';
}

export interface Resignation {
  id: string;
  employee_id: string;
  type: 'Pedido de demissão' | 'Rescisão por iniciativa da empresa' | 'Fim de contrato';
  date: string;
  reason: string;
  compensation: number;
  status: 'Pendente' | 'Concluído';
}
