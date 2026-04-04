export type UserRole = 'admin' | 'owner' | 'seller' | 'manager';

export interface CashRegister {
  id: number;
  store_id: number;
  name: string;
  code: string;
  default_initial_balance: number;
  max_limit: number;
  created_at: string;
  session_status?: 'open' | 'closed';
  current_session_id?: number;
  current_seller_name?: string;
  seller_id?: number;
}

export interface CashSession {
  id: number;
  store_id: number;
  cash_register_id: number;
  seller_id: number;
  opening_amount: number;
  closing_amount?: number;
  physical_amount?: number;
  opening_time: string;
  closing_time?: string;
  status: 'open' | 'closed';
  totals?: {
    sales: number;
    in: number;
    out: number;
    expected: number;
  };
}

export interface User {
  id: number;
  email: string;
  username?: string;
  name: string;
  role: UserRole;
  store_id?: number | null;
  role_id?: number | null;
  cash_register_id?: number | null;
  custom_permissions?: string | null; // JSON string
  permissions?: string[];
  status?: 'active' | 'suspended';
}

export interface HRRole {
  id: number;
  owner_id: number;
  name: string;
  base_role: 'seller' | 'manager';
  permissions: string; // JSON string
  created_at: string;
}

export interface HRSalary {
  id: number;
  user_id: number;
  base_salary: number;
  bonuses: number;
  discounts: number;
  vacation_days_per_year: number;
  last_payment_date?: string;
  created_at: string;
  employee_name?: string;
  role_name?: string;
}

export interface HRSalaryPayment {
  id: number;
  salary_id: number;
  amount: number;
  bonus: number;
  type: 'base' | 'bonus' | 'discount' | 'full_payment' | 'advance' | 'commission';
  description?: string;
  month: string;
  timestamp: string;
  employee_name?: string;
  base_salary?: number;
}

export interface HRAttendance {
  id: number;
  user_id: number;
  store_id: number;
  entry_time: string;
  exit_time?: string;
  status: 'present' | 'late' | 'absent' | 'half_day';
  date: string;
  notes?: string;
  employee_name?: string;
  store_name?: string;
}

export interface HRVacation {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  days_count: number;
  notes?: string;
  employee_name?: string;
}

export interface BankAccount {
  bank_name: string;
  iban: string;
  holder: string;
  account_number: string;
}

export interface Store {
  id: number;
  owner_id: number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  nif?: string;
  logo_url?: string;
  status: 'active' | 'inactive';
  license_status: 'active' | 'expired' | 'pending';
  license_expiry: string;
  staff_count?: number;
  today_sales?: number;
  bank_accounts?: BankAccount[];
}

export interface Product {
  id: number;
  store_id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
  is_promo: boolean;
  discount_percent?: number;
  promo_name?: string;
  barcode: string;
  tax_id?: number;
  tax_percentage?: number;
  tax_code?: string;
}

export interface Transaction {
  id: number;
  store_id: number;
  seller_id: number;
  total_amount: number;
  timestamp: string;
  items: string; // JSON string of items
}

export interface Staff {
  id: number;
  store_id: number;
  user_id: number;
  salary: number;
  shift_info: string;
}

export interface License {
  id: number;
  store_id: number;
  type: string;
  price: number;
  start_date: string;
  end_date: string;
}

export interface Service {
  id: number;
  owner_id: number;
  store_id: number;
  name: string;
  code: string;
  description: string;
  price: number;
  availability_condition: 'always' | 'product_purchased';
  show_in_pos: number;
  tax_id?: number;
  tax_percentage?: number;
  tax_code?: string;
  created_at: string;
}

export interface FinancialTransaction {
  id: number;
  store_id: number;
  owner_id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  payment_method: 'cash' | 'transfer' | 'multicaixa' | 'other';
  description: string;
  date: string;
  status: 'paid' | 'pending';
  reference_id?: number;
  created_at: string;
}

export interface AccountReceivable {
  id: number;
  store_id: number;
  owner_id: number;
  client_name: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
  created_at: string;
}

export interface AccountPayable {
  id: number;
  store_id: number;
  owner_id: number;
  supplier_name: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
  created_at: string;
}
