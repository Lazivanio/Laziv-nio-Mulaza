import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  Calendar, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  ChevronRight,
  Briefcase,
  Building2 as EstablishmentIcon,
  User as UserIcon,
  UserCheck,
  UserX,
  Filter,
  ArrowRightLeft,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, HRRole, HRSalary, HRSalaryPayment, HRAttendance, HRVacation, Establishment as EstablishmentType } from '../types';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div {...props} className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn("relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden", maxWidth)}
        >
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const AVAILABLE_PERMISSIONS = [
  { id: 'pos_access', label: 'Acesso ao PDV', category: 'Vendas' },
  { id: 'pos_sell', label: 'Realizar Vendas', category: 'Vendas' },
  { id: 'pos_discount', label: 'Aplicar Descontos', category: 'Vendas' },
  { id: 'pos_void', label: 'Anular Vendas', category: 'Vendas' },
  { id: 'pos_open_cashier', label: 'Abrir Caixa', category: 'Caixa' },
  { id: 'pos_close_cashier', label: 'Fechar Caixa', category: 'Caixa' },
  { id: 'pos_withdraw', label: 'Sangria de Caixa', category: 'Caixa' },
  { id: 'stock_view', label: 'Ver Stock', category: 'Stock' },
  { id: 'stock_edit', label: 'Editar Stock', category: 'Stock' },
  { id: 'stock_movement', label: 'Movimentar Stock', category: 'Stock' },
  { id: 'hr_manage', label: 'Gerir RH', category: 'Gestão' },
  { id: 'finance_manage', label: 'Gerir Financeiro', category: 'Gestão' },
  { id: 'services_manage', label: 'Gerir Serviços', category: 'Gestão' },
  { id: 'warehouses_manage', label: 'Gerir Armazéns', category: 'Gestão' },
  { id: 'documents_view', label: 'Ver Doc. Fiscais', category: 'Gestão' },
  { id: 'reports_view', label: 'Ver Relatórios', category: 'Gestão' },
  { id: 'clients_manage', label: 'Gerir Clientes', category: 'Gestão' },
  { id: 'suppliers_manage', label: 'Gerir Fornecedores', category: 'Gestão' },
  { id: 'purchases_manage', label: 'Gerir Compras', category: 'Gestão' },
  { id: 'settings_manage', label: 'Gerir Definições', category: 'Gestão' },
];

export const OwnerRH = ({ user }: { user: User }) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'roles' | 'salaries' | 'attendance' | 'vacations'>('employees');
  const [employees, setEmployees] = useState<User[]>([]);
  const [roles, setRoles] = useState<HRRole[]>([]);
  const [salaries, setSalaries] = useState<HRSalary[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<HRSalaryPayment[]>([]);
  const [attendance, setAttendance] = useState<HRAttendance[]>([]);
  const [vacations, setVacations] = useState<HRVacation[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentType[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSalaryPaymentModalOpen, setIsSalaryPaymentModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);

  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<HRRole | null>(null);
  const [selectedSalary, setSelectedSalary] = useState<HRSalary | null>(null);

  // Forms
  const [employeeForm, setEmployeeForm] = useState({
    name: '', email: '', username: '', password: '', role: 'seller' as any, establishment_id: '', role_id: '', custom_permissions: [] as string[], base_salary: '', status: 'active' as 'active' | 'suspended',
    is_system_user: true
  });
  const [roleForm, setRoleForm] = useState({ 
    name: '', 
    base_role: 'seller' as 'seller' | 'manager' | 'none', 
    permissions: [] as string[],
    is_system_role: true
  });
  const [salaryPaymentForm, setSalaryPaymentForm] = useState({ 
    amount: '', 
    bonus: '0',
    type: 'full_payment', 
    description: '',
    month: new Date().toISOString().slice(0, 7)
  });
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [attendanceForm, setAttendanceForm] = useState({ user_id: '', establishment_id: '', entry_time: '', exit_time: '', status: 'present' as any, date: new Date().toISOString().split('T')[0], notes: '' });
  const [vacationForm, setVacationForm] = useState({ user_id: '', start_date: '', end_date: '', notes: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, rolesRes, salRes, salPayRes, attRes, vacRes, establishmentsRes] = await Promise.all([
        fetch(`/api/owner/hr/employees/${user.id}`),
        fetch(`/api/owner/hr/roles/${user.id}`),
        fetch(`/api/owner/hr/salaries/${user.id}`),
        fetch(`/api/owner/hr/salaries/payments/${user.id}`),
        fetch(`/api/owner/hr/attendance/${user.id}`),
        fetch(`/api/owner/hr/vacations/${user.id}`),
        fetch(`/api/owner/establishments/${user.id}`)
      ]);

      if (empRes.ok) setEmployees(await empRes.json());
      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (salRes.ok) setSalaries(await salRes.json());
      if (salPayRes.ok) setSalaryPayments(await salPayRes.json());
      if (attRes.ok) setAttendance(await attRes.json());
      if (vacRes.ok) setVacations(await vacRes.json());
      if (establishmentsRes.ok) {
        const data = await establishmentsRes.json();
        setEstablishments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching HR data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingEmployee ? `/api/owner/hr/employees/${editingEmployee.id}` : '/api/owner/hr/employees';
    const method = editingEmployee ? 'PUT' : 'POST';
    
    try {
      const payload = {
        ...employeeForm,
        email: employeeForm.is_system_user ? employeeForm.email : null,
        username: employeeForm.is_system_user ? employeeForm.username : null,
        password: employeeForm.is_system_user ? employeeForm.password : null,
        custom_permissions: employeeForm.is_system_user ? employeeForm.custom_permissions : [],
        base_salary: Number(employeeForm.base_salary) || 0,
        owner_id: user.id
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsEmployeeModalOpen(false);
        setEditingEmployee(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error saving employee:", error);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingRole ? `/api/owner/hr/roles/${editingRole.id}` : '/api/owner/hr/roles';
    const method = editingRole ? 'PUT' : 'POST';
    
    try {
      const payload = {
        ...roleForm,
        permissions: roleForm.is_system_role ? roleForm.permissions : [],
        base_role: roleForm.is_system_role ? roleForm.base_role : 'none',
        owner_id: user.id
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsRoleModalOpen(false);
        setEditingRole(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error saving role:", error);
    }
  };

  const handleSalaryPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalary) return;
    setSalaryError(null);
    
    try {
      const res = await fetch('/api/owner/hr/salaries/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salary_id: selectedSalary.id,
          ...salaryPaymentForm
        })
      });
      if (res.ok) {
        setIsSalaryPaymentModalOpen(false);
        setSelectedSalary(null);
        fetchData();
      } else {
        const errorData = await res.json();
        setSalaryError(errorData.error || "Erro ao processar pagamento.");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      setSalaryError("Erro de conexão ao processar pagamento.");
    }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/owner/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceForm)
      });
      if (res.ok) {
        setIsAttendanceModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
    }
  };

  const handleSaveVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(vacationForm.start_date);
    const end = new Date(vacationForm.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    try {
      const res = await fetch('/api/owner/hr/vacations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...vacationForm,
          days_count: diffDays
        })
      });
      if (res.ok) {
        setIsVacationModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error saving vacation:", error);
    }
  };

  const handleUpdateVacationStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/owner/hr/vacations/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Error updating vacation status:", error);
    }
  };

  const togglePermission = (permId: string) => {
    setEmployeeForm(prev => ({
      ...prev,
      custom_permissions: prev.custom_permissions.includes(permId)
        ? prev.custom_permissions.filter(id => id !== permId)
        : [...prev.custom_permissions, permId]
    }));
  };

  const toggleRolePermission = (permId: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(id => id !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const handleDeleteEmployee = async (id: number) => {
    setConfirmAction({
      title: 'Eliminar Funcionário',
      message: 'Tem a certeza que deseja eliminar este funcionário? Esta ação é irreversível.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/owner/hr/employees/${id}`, { method: 'DELETE' });
          if (res.ok) fetchData();
        } catch (error) {
          console.error("Error deleting employee:", error);
        }
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handleDeleteRole = async (id: number) => {
    setConfirmAction({
      title: 'Eliminar Cargo',
      message: 'Tem a certeza que deseja eliminar este cargo? Esta ação é irreversível.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/owner/hr/roles/${id}`, { method: 'DELETE' });
          if (res.ok) fetchData();
        } catch (error) {
          console.error("Error deleting role:", error);
        }
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handleToggleEmployeeStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/owner/hr/employees/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Error toggling employee status:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Recursos Humanos</h1>
          <p className="text-zinc-500">Gestão de funcionários, cargos, salários e presenças</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'employees', label: 'Funcionários', icon: Users },
            { id: 'roles', label: 'Cargos', icon: ShieldCheck },
            { id: 'salaries', label: 'Salários', icon: DollarSign },
            { id: 'attendance', label: 'Presenças', icon: Clock },
            { id: 'vacations', label: 'Férias', icon: Calendar },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-black text-white shadow-lg shadow-black/20" 
                  : "bg-white text-zinc-500 hover:bg-zinc-100"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Procurar funcionário..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <button 
                  onClick={() => {
                    setEditingEmployee(null);
                    setEmployeeForm({
                      name: '', email: '', username: '', password: '', role: 'seller', 
                      establishment_id: establishments.length === 1 ? establishments[0].id.toString() : '', 
                      role_id: '', custom_permissions: [], base_salary: '', status: 'active',
                      is_system_user: true
                    });
                    setIsEmployeeModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
                >
                  <Plus size={18} />
                  Novo Funcionário
                </button>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Funcionário</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cargo / Estabelecimento</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Salário Base</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {employees.map(emp => (
                        <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600 font-bold">
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-zinc-900">{emp.name}</p>
                                  {!(emp.email || emp.username) && (
                                    <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-500 text-[8px] font-black uppercase rounded tracking-tighter">Staff</span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-500">{emp.email || 'Sem acesso ao sistema'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-bold text-zinc-900">{(emp as any).role_name || emp.role}</p>
                              <p className="text-xs text-zinc-500">{(emp as any).establishment_name || 'Sem estabelecimento'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-zinc-900">Kz {((emp as any).base_salary || 0).toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                              emp.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {emp.status === 'active' ? 'Ativo' : 'Suspenso'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleToggleEmployeeStatus(emp.id, emp.status || 'active')}
                                className={cn(
                                  "p-2 rounded-lg transition-all",
                                  emp.status === 'active' 
                                    ? "text-amber-500 hover:bg-amber-50" 
                                    : "text-emerald-500 hover:bg-emerald-50"
                                )}
                                title={emp.status === 'active' ? "Desativar" : "Ativar"}
                              >
                                {emp.status === 'active' ? <UserX size={18} /> : <UserCheck size={18} />}
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingEmployee(emp);
                                  const role = roles.find(r => r.id.toString() === emp.role_id?.toString());
                                  const rolePerms = role ? (typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions) : [];
                                  
                                  setEmployeeForm({
                                    name: emp.name || '',
                                    email: emp.email || '',
                                    username: emp.username || '',
                                    password: '',
                                    role: emp.role,
                                    establishment_id: emp.establishment_id?.toString() || '',
                                    role_id: emp.role_id?.toString() || '',
                                    custom_permissions: emp.custom_permissions ? (typeof emp.custom_permissions === 'string' ? JSON.parse(emp.custom_permissions) : emp.custom_permissions) : rolePerms,
                                    base_salary: (emp as any).base_salary?.toString() || '',
                                    status: emp.status || 'active',
                                    is_system_user: !!(emp.email || emp.username)
                                  });
                                  setIsEmployeeModalOpen(true);
                                }}
                                className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteEmployee(emp.id)}
                                className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Cargos e Funções Personalizadas</h3>
                <button 
                  onClick={() => {
                    setEditingRole(null);
                    setRoleForm({ name: '', base_role: 'seller', permissions: [], is_system_role: true });
                    setIsRoleModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
                >
                  <Plus size={18} />
                  Novo Cargo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map(role => (
                  <Card key={role.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-zinc-100 rounded-xl text-zinc-600">
                        <ShieldCheck size={24} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingRole(role);
                            setRoleForm({ 
                              name: role.name || '', 
                              base_role: role.base_role || 'seller',
                              permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions,
                              is_system_role: role.base_role !== 'none'
                            });
                            setIsRoleModalOpen(true);
                          }}
                          className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-lg">{role.name}</h4>
                      {role.base_role === 'none' && (
                        <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-500 text-[8px] font-black uppercase rounded tracking-tighter">Staff</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mb-4">
                      {role.base_role === 'none' 
                        ? 'Sem acesso ao sistema' 
                        : `${(typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || [])).length} permissões atribuídas`}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || [])).slice(0, 3).map((p: string) => (
                        <span key={p} className="px-2 py-1 bg-zinc-50 text-zinc-600 text-[10px] font-bold rounded-lg border border-zinc-100">
                          {AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                        </span>
                      ))}
                      {(typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || [])).length > 3 && (
                        <span className="px-2 py-1 bg-zinc-50 text-zinc-400 text-[10px] font-bold rounded-lg border border-zinc-100">
                          +{(typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || [])).length - 3}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Salaries Tab */}
          {activeTab === 'salaries' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-emerald-50 border-emerald-100">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Total em Salários</p>
                  <p className="text-2xl font-black text-emerald-900">Kz {salaries.reduce((acc, s) => acc + s.base_salary, 0).toLocaleString()}</p>
                </Card>
                <Card className="p-6">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Funcionários Pagos</p>
                  <p className="text-2xl font-black">{salaries.filter(s => s.last_payment_date).length} / {salaries.length}</p>
                </Card>
                <Card className="p-6">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Próximo Ciclo</p>
                  <p className="text-2xl font-black">01 Abr</p>
                </Card>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Funcionário</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Salário Base</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Bónus / Desc.</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Último Pagamento</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {salaries.map(sal => (
                        <tr key={sal.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-zinc-900">{sal.employee_name}</p>
                              <p className="text-xs text-zinc-500">{sal.role_name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-zinc-900">Kz {sal.base_salary.toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-emerald-600 font-bold">+{sal.bonuses.toLocaleString()}</span>
                              <span className="text-xs text-rose-600 font-bold">-{sal.discounts.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-zinc-500">{sal.last_payment_date ? new Date(sal.last_payment_date).toLocaleDateString() : 'Nunca pago'}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                setSelectedSalary(sal);
                                setSalaryPaymentForm(prev => ({ 
                                  ...prev, 
                                  amount: sal.base_salary.toString(), 
                                  bonus: '0',
                                  type: 'full_payment', 
                                  description: '' 
                                }));
                                setSalaryError(null);
                                setIsSalaryPaymentModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-all"
                            >
                              Pagar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Payment History */}
              <div className="pt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="text-zinc-400" size={20} />
                  <h3 className="font-bold text-lg">Histórico de Pagamentos</h3>
                </div>
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100">
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Funcionário</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Mês</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {salaryPayments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-zinc-400 italic">Nenhum pagamento registado</td>
                          </tr>
                        ) : (
                          salaryPayments.map(payment => (
                            <tr key={payment.id} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="px-6 py-4 text-xs text-zinc-500">
                                {new Date(payment.timestamp).toLocaleString()}
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-zinc-900">{payment.employee_name}</p>
                              </td>
                              <td className="px-6 py-4 text-sm text-zinc-600">
                                {payment.month}
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                                  payment.type === 'full_payment' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                )}>
                                  {payment.type === 'full_payment' ? 'Salário' : payment.type}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-bold text-zinc-900">Kz {(Number(payment.amount) + Number(payment.bonus || 0)).toLocaleString()}</div>
                                {Number(payment.bonus) > 0 && (
                                  <div className="text-[10px] text-emerald-600 font-bold">Bónus: Kz {Number(payment.bonus).toLocaleString()}</div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Registo de Presenças</h3>
                <button 
                  onClick={() => {
                    setAttendanceForm({ 
                      user_id: '', 
                      establishment_id: establishments.length === 1 ? establishments[0].id.toString() : '', 
                      entry_time: '', exit_time: '', status: 'present', 
                      date: new Date().toISOString().split('T')[0], notes: '' 
                    });
                    setIsAttendanceModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
                >
                  <Plus size={18} />
                  Registar Presença
                </button>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Funcionário</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estabelecimento</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Horário</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {attendance.map(att => (
                        <tr key={att.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-zinc-900">{new Date(att.date).toLocaleDateString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-zinc-900">{att.employee_name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-zinc-500">{att.establishment_name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-zinc-900 font-bold">{att.entry_time} - {att.exit_time || '--:--'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                              att.status === 'present' ? "bg-emerald-100 text-emerald-700" :
                              att.status === 'late' ? "bg-amber-100 text-amber-700" :
                              att.status === 'absent' ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-700"
                            )}>
                              {att.status === 'present' ? 'Presente' :
                               att.status === 'late' ? 'Atraso' :
                               att.status === 'absent' ? 'Falta' : 'Meio Dia'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Vacations Tab */}
          {activeTab === 'vacations' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Gestão de Férias</h3>
                <button 
                  onClick={() => {
                    setVacationForm({ user_id: '', start_date: '', end_date: '', notes: '' });
                    setIsVacationModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
                >
                  <Plus size={18} />
                  Marcar Férias
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vacations.map(vac => (
                  <Card key={vac.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-zinc-100 rounded-xl text-zinc-600">
                        <Calendar size={24} />
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        vac.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                        vac.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {vac.status === 'approved' ? 'Aprovado' :
                         vac.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                      </span>
                    </div>
                    <h4 className="font-bold text-lg mb-1">{vac.employee_name}</h4>
                    <p className="text-xs text-zinc-500 mb-4">{vac.days_count} dias planeados</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 mb-6">
                      <span>{new Date(vac.start_date).toLocaleDateString()}</span>
                      <ChevronRight size={14} className="text-zinc-400" />
                      <span>{new Date(vac.end_date).toLocaleDateString()}</span>
                    </div>
                    {vac.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleUpdateVacationStatus(vac.id, 'approved')}
                          className="flex-1 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-all"
                        >
                          Aprovar
                        </button>
                        <button 
                          onClick={() => handleUpdateVacationStatus(vac.id, 'rejected')}
                          className="flex-1 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-100 transition-all"
                        >
                          Rejeitar
                        </button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Confirmation Modal */}
      <Modal 
        isOpen={isConfirmModalOpen} 
        onClose={() => setIsConfirmModalOpen(false)} 
        title={confirmAction?.title || "Confirmar Ação"}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700">
            <AlertCircle size={24} className="shrink-0" />
            <p className="text-sm font-medium">{confirmAction?.message}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsConfirmModalOpen(false)}
              className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmAction?.onConfirm}
              className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      {/* Employee Modal */}
      <Modal 
        isOpen={isEmployeeModalOpen} 
        onClose={() => setIsEmployeeModalOpen(false)} 
        title={editingEmployee ? "Editar Funcionário" : "Novo Funcionário"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveEmployee} className="space-y-6">
          <div className="flex items-center gap-4 p-1 bg-zinc-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setEmployeeForm({ ...employeeForm, is_system_user: true })}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                employeeForm.is_system_user ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Usuário do Sistema
            </button>
            <button
              type="button"
              onClick={() => setEmployeeForm({ ...employeeForm, is_system_user: false })}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                !employeeForm.is_system_user ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Apenas Funcionário
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Nome Completo</label>
              <input 
                required
                type="text" 
                value={employeeForm.name}
                onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
            {employeeForm.is_system_user && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Email</label>
                  <input 
                    required
                    type="email" 
                    value={employeeForm.email}
                    onChange={e => setEmployeeForm({...employeeForm, email: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Username</label>
                  <input 
                    required
                    type="text" 
                    value={employeeForm.username}
                    onChange={e => setEmployeeForm({...employeeForm, username: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Password {editingEmployee && "(Deixe em branco para manter)"}</label>
                  <input 
                    type="password" 
                    value={employeeForm.password}
                    onChange={e => setEmployeeForm({...employeeForm, password: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Estabelecimento Principal</label>
              <select 
                required
                value={employeeForm.establishment_id}
                onChange={e => setEmployeeForm({...employeeForm, establishment_id: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="">Selecionar Estabelecimento</option>
                {establishments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Cargo</label>
              <select 
                required
                value={employeeForm.role_id}
                onChange={e => {
                  const newRoleId = e.target.value;
                  const role = roles.find(r => r.id.toString() === newRoleId);
                  const rolePerms = role ? (typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions) : [];
                  setEmployeeForm({
                    ...employeeForm, 
                    role_id: newRoleId,
                    custom_permissions: rolePerms // Reset permissions to role defaults when role changes
                  });
                }}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="">Selecionar Cargo</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Salário Base (Kz)</label>
              <input 
                required
                type="number" 
                value={isNaN(Number(employeeForm.base_salary)) ? '' : employeeForm.base_salary}
                onChange={e => setEmployeeForm({...employeeForm, base_salary: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
          </div>

          {employeeForm.is_system_user && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Permissões Específicas</label>
                  <p className="text-[10px] text-zinc-400 italic">Estas permissões definem o acesso total do funcionário</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const role = roles.find(r => r.id.toString() === employeeForm.role_id);
                    if (role) {
                      const rolePerms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
                      setEmployeeForm({ ...employeeForm, custom_permissions: rolePerms });
                    }
                  }}
                  className="text-[10px] font-bold text-orange-600 hover:text-orange-700 underline"
                >
                  Resetar para Padrão do Cargo
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <button
                    key={perm.id}
                    type="button"
                    onClick={() => togglePermission(perm.id)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all",
                      employeeForm.custom_permissions.includes(perm.id)
                        ? "bg-black border-black text-white"
                        : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{perm.label}</p>
                      <p className={cn("text-[10px]", employeeForm.custom_permissions.includes(perm.id) ? "text-zinc-400" : "text-zinc-400")}>{perm.category}</p>
                    </div>
                    {employeeForm.custom_permissions.includes(perm.id) && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsEmployeeModalOpen(false)}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-8 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
            >
              Salvar Funcionário
            </button>
          </div>
        </form>
      </Modal>

      {/* Role Modal */}
      <Modal 
        isOpen={isRoleModalOpen} 
        onClose={() => setIsRoleModalOpen(false)} 
        title={editingRole ? "Editar Cargo" : "Novo Cargo"}
      >
        <form onSubmit={handleSaveRole} className="space-y-6">
          <div className="flex items-center gap-4 p-1 bg-zinc-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setRoleForm({ ...roleForm, is_system_role: true, base_role: 'seller' })}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                roleForm.is_system_role ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Cargo do Sistema
            </button>
            <button
              type="button"
              onClick={() => setRoleForm({ ...roleForm, is_system_role: false, base_role: 'none', permissions: [] })}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                !roleForm.is_system_role ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Cargo Comum
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Nome do Cargo</label>
              <input 
                required
                type="text" 
                placeholder="Ex: Vendedor Senior, Gerente de Estabelecimento"
                value={roleForm.name}
                onChange={e => setRoleForm({...roleForm, name: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
            {roleForm.is_system_role && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Tipo de Acesso</label>
                <select 
                  required
                  value={roleForm.base_role}
                  onChange={e => setRoleForm({...roleForm, base_role: e.target.value as any})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                >
                  <option value="seller">Vendedor (Acesso ao PDV)</option>
                  <option value="manager">Gerente (Acesso ao Painel Administrativo)</option>
                </select>
              </div>
            )}
          </div>

          {roleForm.is_system_role && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-zinc-500 uppercase">Permissões do Cargo</label>
              <div className="grid grid-cols-1 gap-2">
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <button
                    key={perm.id}
                    type="button"
                    onClick={() => toggleRolePermission(perm.id)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all",
                      roleForm.permissions.includes(perm.id)
                        ? "bg-black border-black text-white"
                        : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                    )}
                  >
                    <div>
                      <p className="text-xs font-bold">{perm.label}</p>
                      <p className={cn("text-[10px]", roleForm.permissions.includes(perm.id) ? "text-zinc-400" : "text-zinc-400")}>{perm.category}</p>
                    </div>
                    {roleForm.permissions.includes(perm.id) && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-8 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
            >
              Salvar Cargo
            </button>
          </div>
        </form>
      </Modal>

      {/* Salary Payment Modal */}
      <Modal 
        isOpen={isSalaryPaymentModalOpen} 
        onClose={() => setIsSalaryPaymentModalOpen(false)} 
        title="Registar Pagamento"
      >
        <form onSubmit={handleSalaryPayment} className="space-y-6">
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
            <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Funcionário</p>
            <p className="font-bold text-zinc-900">{selectedSalary?.employee_name}</p>
            <p className="text-xs text-zinc-500">Salário Base: Kz {selectedSalary?.base_salary.toLocaleString()}</p>
          </div>

          {salaryError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold">
              <AlertCircle size={16} />
              {salaryError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Mês de Referência</label>
              <input 
                required
                type="month" 
                value={salaryPaymentForm.month}
                onChange={e => setSalaryPaymentForm({...salaryPaymentForm, month: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Valor Base (Kz)</label>
                <input 
                  required
                  type="number" 
                  value={isNaN(Number(salaryPaymentForm.amount)) ? '' : salaryPaymentForm.amount}
                  onChange={e => setSalaryPaymentForm({...salaryPaymentForm, amount: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Bónus (Kz)</label>
                <input 
                  required
                  type="number" 
                  value={isNaN(Number(salaryPaymentForm.bonus)) ? '' : salaryPaymentForm.bonus}
                  onChange={e => setSalaryPaymentForm({...salaryPaymentForm, bonus: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Tipo de Pagamento</label>
              <select 
                required
                value={salaryPaymentForm.type}
                onChange={e => setSalaryPaymentForm({...salaryPaymentForm, type: e.target.value as any})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="full_payment">Salário Completo</option>
                <option value="advance">Adiantamento</option>
                <option value="bonus">Bónus Extra</option>
                <option value="commission">Comissão</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Observações</label>
              <textarea 
                value={salaryPaymentForm.description}
                onChange={e => setSalaryPaymentForm({...salaryPaymentForm, description: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 min-h-[100px]"
                placeholder="Ex: Pagamento referente ao mês de Março..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsSalaryPaymentModalOpen(false)}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-8 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
            >
              Confirmar Pagamento
            </button>
          </div>
        </form>
      </Modal>

      {/* Attendance Modal */}
      <Modal 
        isOpen={isAttendanceModalOpen} 
        onClose={() => setIsAttendanceModalOpen(false)} 
        title="Registar Presença Manual"
      >
        <form onSubmit={handleSaveAttendance} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Funcionário</label>
              <select 
                required
                value={attendanceForm.user_id}
                onChange={e => setAttendanceForm({...attendanceForm, user_id: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="">Selecionar Funcionário</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Estabelecimento</label>
              <select 
                required
                value={attendanceForm.establishment_id}
                onChange={e => setAttendanceForm({...attendanceForm, establishment_id: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="">Selecionar Estabelecimento</option>
                {establishments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Data</label>
                <input 
                  required
                  type="date" 
                  value={attendanceForm.date}
                  onChange={e => setAttendanceForm({...attendanceForm, date: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Status</label>
                <select 
                  required
                  value={attendanceForm.status}
                  onChange={e => setAttendanceForm({...attendanceForm, status: e.target.value as any})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                >
                  <option value="present">Presente</option>
                  <option value="late">Atraso</option>
                  <option value="absent">Falta</option>
                  <option value="half_day">Meio Dia</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Entrada</label>
                <input 
                  required
                  type="time" 
                  value={attendanceForm.entry_time}
                  onChange={e => setAttendanceForm({...attendanceForm, entry_time: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Saída</label>
                <input 
                  type="time" 
                  value={attendanceForm.exit_time}
                  onChange={e => setAttendanceForm({...attendanceForm, exit_time: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsAttendanceModalOpen(false)}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-8 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
            >
              Registar
            </button>
          </div>
        </form>
      </Modal>

      {/* Vacation Modal */}
      <Modal 
        isOpen={isVacationModalOpen} 
        onClose={() => setIsVacationModalOpen(false)} 
        title="Marcar Férias"
      >
        <form onSubmit={handleSaveVacation} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Funcionário</label>
              <select 
                required
                value={vacationForm.user_id}
                onChange={e => setVacationForm({...vacationForm, user_id: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="">Selecionar Funcionário</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Data Início</label>
                <input 
                  required
                  type="date" 
                  value={vacationForm.start_date}
                  onChange={e => setVacationForm({...vacationForm, start_date: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Data Fim</label>
                <input 
                  required
                  type="date" 
                  value={vacationForm.end_date}
                  onChange={e => setVacationForm({...vacationForm, end_date: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Notas / Motivo</label>
              <textarea 
                value={vacationForm.notes}
                onChange={e => setVacationForm({...vacationForm, notes: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsVacationModalOpen(false)}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-8 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
            >
              Agendar Férias
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
