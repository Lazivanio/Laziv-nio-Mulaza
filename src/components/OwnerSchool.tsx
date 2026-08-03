import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  GraduationCap, Users, UserCheck, BookOpen, Calendar, DollarSign, 
  FileText, Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, 
  Printer, Download, Send, School as SchoolIcon, Briefcase, Shield, 
  PieChart, TrendingUp, CreditCard, Bell, Eye, Edit, Trash2, 
  Layers, ChevronRight, RefreshCw, Award, Phone, Mail, MapPin, 
  Building, X, Check, ArrowUpRight, ArrowDownRight, Smartphone, Sparkles, LayoutDashboard
} from 'lucide-react';
import { User, Establishment } from '../types';

interface OwnerSchoolProps {
  user: User;
  establishmentId?: number;
  establishment?: Establishment;
}

export const OwnerSchool: React.FC<OwnerSchoolProps> = ({ user, establishmentId: propEstId, establishment: propEst }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<number | null>(propEstId || propEst?.id || null);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'students' | 'guardians' | 'classes' | 'enrollment' | 
    'services' | 'tuitions' | 'payments' | 'documents' | 'parent_portal' | 
    'notifications' | 'finance' | 'hr' | 'reports' | 'permissions'
  >((urlTab as any) || 'dashboard');

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab as any);
    }
  }, [urlTab]);

  const changeTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    guardians: any[];
    classes: any[];
    students: any[];
    services: any[];
    tuitions: any[];
    teachers: any[];
    notifications: any[];
  }>({
    guardians: [],
    classes: [],
    students: [],
    services: [],
    tuitions: [],
    teachers: [],
    notifications: []
  });

  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentForm, setStudentForm] = useState({
    name: '',
    birth_date: '2012-05-14',
    gender: 'M',
    photo_url: '',
    document_number: '',
    nationality: 'Angolana',
    phone: '',
    email: '',
    guardian_id: '',
    class_id: '',
    school_year: '2025/2026',
    grade_level: '7ª Classe',
    status: 'active',
    monthly_fee: 100000
  });

  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<any>(null);
  const [guardianForm, setGuardianForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    document_number: '',
    relationship: 'Pai'
  });

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [classForm, setClassForm] = useState({
    school_year: '2025/2026',
    grade_level: '7ª Classe',
    name: 'Turma A',
    room: 'Sala 12',
    schedule: 'Manhã (07:30 - 12:30)',
    teacher_name: 'Prof. António Silva',
    monthly_fee: 100000,
    due_day: 5
  });

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    price: 50000,
    periodicity: 'monthly',
    tax_percentage: 0,
    account_code: '71.1',
    status: 'active'
  });

  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    phone: '',
    document_number: '',
    subjects: 'Matemática, Física',
    contract_type: 'full_time',
    salary: 250000,
    status: 'active'
  });

  // Batch tuition generation modal
  const [isBatchTuitionModalOpen, setIsBatchTuitionModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({
    reference_month: 'Março 2026',
    due_date: '2026-03-05',
    class_id: ''
  });

  // Payment modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTuitionForPayment, setSelectedTuitionForPayment] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'Multicaixa',
    amount_paid: 0
  });

  // Enrollment process state
  const [enrollmentForm, setEnrollmentForm] = useState({
    student_name: '',
    birth_date: '2012-01-01',
    gender: 'M',
    document_number: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    guardian_relationship: 'Pai',
    guardian_document: '',
    grade_level: '7ª Classe',
    class_id: '',
    contracted_services: ['Matrícula', 'Mensalidade'],
    enrollment_fee: 50000,
    monthly_fee: 100000,
    payment_mode: 'immediate_fr' // 'immediate_fr' or 'credit_ft'
  });

  // Joint Billing Modal for Guardian
  const [isJointBillingModalOpen, setIsJointBillingModalOpen] = useState(false);
  const [selectedGuardianForBilling, setSelectedGuardianForBilling] = useState<any>(null);

  // Notification Modal
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    guardian_id: '',
    student_id: '',
    title: 'Aviso de Vencimento de Mensalidade',
    message: 'Estimado encarregado, a mensalidade do seu educando vence no próximo dia 05. Agradecemos a regularização oportuna.',
    type: 'due_warning',
    channel: 'sms'
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Selected Parent Portal Guardian
  const [portalGuardianId, setPortalGuardianId] = useState<string>('');

  useEffect(() => {
    if (propEstId || propEst?.id) {
      const targetId = propEstId || propEst?.id || null;
      setSelectedEstablishmentId(targetId);
      if (propEst) setEstablishments([propEst]);
    }
    // Fetch user's establishments
    fetch(`/api/owner/establishments/${user.id}`)
      .then(res => res.json())
      .then(estList => {
        if (Array.isArray(estList) && estList.length > 0) {
          setEstablishments(estList);
          if (!propEstId && !propEst?.id) {
            const schoolEst = estList.find(e => e.type === 'escola') || estList[0];
            setSelectedEstablishmentId(schoolEst.id);
          }
        } else {
          if (!propEstId && !propEst?.id) setLoading(false);
        }
      })
      .catch(err => {
        console.error("Error loading establishments:", err);
        if (!propEstId && !propEst?.id) setLoading(false);
      });
  }, [user.id, propEstId, propEst]);

  const loadSchoolData = (estId: number) => {
    setLoading(true);
    fetch(`/api/owner/school/data/${estId}`)
      .then(res => res.json())
      .then(resData => {
        if (resData && !resData.error) {
          setData(resData);
          if (resData.guardians && resData.guardians.length > 0 && !portalGuardianId) {
            setPortalGuardianId(resData.guardians[0].id.toString());
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching school data:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedEstablishmentId) {
      loadSchoolData(selectedEstablishmentId);
    }
  }, [selectedEstablishmentId]);

  // Submit student form
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstablishmentId) return;

    try {
      const res = await fetch('/api/owner/school/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...studentForm,
          id: editingStudent ? editingStudent.id : undefined,
          establishment_id: selectedEstablishmentId,
          guardian_id: studentForm.guardian_id ? Number(studentForm.guardian_id) : null,
          class_id: studentForm.class_id ? Number(studentForm.class_id) : null,
          monthly_fee: Number(studentForm.monthly_fee) || 0
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setIsStudentModalOpen(false);
        setEditingStudent(null);
        loadSchoolData(selectedEstablishmentId);
      } else {
        alert("Erro ao guardar aluno: " + resJson.error);
      }
    } catch (err: any) {
      alert("Erro ao guardar aluno: " + err.message);
    }
  };

  // Submit guardian form
  const handleSaveGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstablishmentId) return;

    try {
      const res = await fetch('/api/owner/school/guardians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...guardianForm,
          id: editingGuardian ? editingGuardian.id : undefined,
          establishment_id: selectedEstablishmentId
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setIsGuardianModalOpen(false);
        setEditingGuardian(null);
        loadSchoolData(selectedEstablishmentId);
      } else {
        alert("Erro ao guardar encarregado: " + resJson.error);
      }
    } catch (err: any) {
      alert("Erro ao guardar encarregado: " + err.message);
    }
  };

  // Submit class form
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstablishmentId) return;

    try {
      const res = await fetch('/api/owner/school/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...classForm,
          id: editingClass ? editingClass.id : undefined,
          establishment_id: selectedEstablishmentId,
          monthly_fee: Number(classForm.monthly_fee) || 0,
          due_day: Number(classForm.due_day) || 5
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setIsClassModalOpen(false);
        setEditingClass(null);
        loadSchoolData(selectedEstablishmentId);
      } else {
        alert("Erro ao guardar turma: " + resJson.error);
      }
    } catch (err: any) {
      alert("Erro ao guardar turma: " + err.message);
    }
  };

  // Submit service form
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstablishmentId) return;

    try {
      const res = await fetch('/api/owner/school/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...serviceForm,
          id: editingService ? editingService.id : undefined,
          establishment_id: selectedEstablishmentId,
          price: Number(serviceForm.price) || 0,
          tax_percentage: Number(serviceForm.tax_percentage) || 0
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setIsServiceModalOpen(false);
        setEditingService(null);
        loadSchoolData(selectedEstablishmentId);
      } else {
        alert("Erro ao guardar serviço: " + resJson.error);
      }
    } catch (err: any) {
      alert("Erro ao guardar serviço: " + err.message);
    }
  };

  // Submit teacher form
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstablishmentId) return;

    try {
      const res = await fetch('/api/owner/school/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...teacherForm,
          id: editingTeacher ? editingTeacher.id : undefined,
          establishment_id: selectedEstablishmentId,
          salary: Number(teacherForm.salary) || 0
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setIsTeacherModalOpen(false);
        setEditingTeacher(null);
        loadSchoolData(selectedEstablishmentId);
      } else {
        alert("Erro ao guardar professor: " + resJson.error);
      }
    } catch (err: any) {
      alert("Erro ao guardar professor: " + err.message);
    }
  };

  // Submit batch tuition generation
  const handleGenerateBatchTuitions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstablishmentId) return;

    try {
      const res = await fetch('/api/owner/school/tuitions/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishment_id: selectedEstablishmentId,
          reference_month: batchForm.reference_month,
          due_date: batchForm.due_date,
          class_id: batchForm.class_id ? Number(batchForm.class_id) : undefined
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        alert(`Sucesso! Foram geradas ${resJson.generated_count} faturas de mensalidade para ${batchForm.reference_month}.`);
        setIsBatchTuitionModalOpen(false);
        loadSchoolData(selectedEstablishmentId);
      } else {
        alert("Erro ao gerar mensalidades: " + resJson.error);
      }
    } catch (err: any) {
      alert("Erro ao gerar mensalidades: " + err.message);
    }
  };

  // Execute tuition payment
  const handlePayTuition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTuitionForPayment) return;

    try {
      const res = await fetch('/api/owner/school/tuitions/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tuition_id: selectedTuitionForPayment.id,
          payment_method: paymentForm.payment_method,
          amount_paid: Number(paymentForm.amount_paid) || selectedTuitionForPayment.amount
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        alert(`Pagamento efetuado com sucesso! Foi emitido o Recibo ${resJson.receipt_number}.`);
        setIsPaymentModalOpen(false);
        setSelectedTuitionForPayment(null);
        if (selectedEstablishmentId) loadSchoolData(selectedEstablishmentId);
      } else {
        alert("Erro ao processar pagamento: " + resJson.error);
      }
    } catch (err: any) {
      alert("Erro ao processar pagamento: " + err.message);
    }
  };

  // Process Full Enrollment Wizard
  const handleCompleteEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstablishmentId) return;

    try {
      // 1. Create or find guardian
      let guardianId: number | null = null;
      if (enrollmentForm.guardian_name) {
        const gRes = await fetch('/api/owner/school/guardians', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            establishment_id: selectedEstablishmentId,
            name: enrollmentForm.guardian_name,
            phone: enrollmentForm.guardian_phone,
            email: enrollmentForm.guardian_email,
            document_number: enrollmentForm.guardian_document,
            relationship: enrollmentForm.guardian_relationship
          })
        });
        const gData = await gRes.json();
        if (gData.success) guardianId = gData.id;
      }

      // 2. Create student
      const sRes = await fetch('/api/owner/school/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishment_id: selectedEstablishmentId,
          guardian_id: guardianId,
          class_id: enrollmentForm.class_id ? Number(enrollmentForm.class_id) : null,
          name: enrollmentForm.student_name,
          birth_date: enrollmentForm.birth_date,
          gender: enrollmentForm.gender,
          document_number: enrollmentForm.document_number,
          grade_level: enrollmentForm.grade_level,
          school_year: '2025/2026',
          status: 'active',
          monthly_fee: Number(enrollmentForm.monthly_fee) || 100000
        })
      });
      const sData = await sRes.json();
      if (!sData.success) {
        alert("Erro na matrícula: " + sData.error);
        return;
      }

      // 3. Generate enrollment invoice (FR or FT)
      const docType = enrollmentForm.payment_mode === 'immediate_fr' ? 'FR' : 'FT';
      const totalAmount = (Number(enrollmentForm.enrollment_fee) || 50000) + (Number(enrollmentForm.monthly_fee) || 100000);
      const invNum = `${docType} MAT-${new Date().getFullYear()}-${sData.id.toString().padStart(4, '0')}`;

      // Insert into tuitions / financial record
      await fetch('/api/owner/school/tuitions/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishment_id: selectedEstablishmentId,
          reference_month: 'Matrícula & 1ª Mensalidade',
          due_date: new Date().toISOString().slice(0, 10),
          class_id: enrollmentForm.class_id ? Number(enrollmentForm.class_id) : undefined
        })
      });

      alert(`Matrícula efetuada com sucesso!\n\nAluno: ${enrollmentForm.student_name}\nNº Matrícula: ${sData.enrollment_code}\nDocumento Gerado: ${invNum} (Total: Kz ${totalAmount.toLocaleString()})`);
      
      // Reset enrollment form and reload
      setEnrollmentForm({
        student_name: '',
        birth_date: '2012-01-01',
        gender: 'M',
        document_number: '',
        guardian_name: '',
        guardian_phone: '',
        guardian_email: '',
        guardian_relationship: 'Pai',
        guardian_document: '',
        grade_level: '7ª Classe',
        class_id: '',
        contracted_services: ['Matrícula', 'Mensalidade'],
        enrollment_fee: 50000,
        monthly_fee: 100000,
        payment_mode: 'immediate_fr'
      });
      loadSchoolData(selectedEstablishmentId);
      setActiveTab('students');
    } catch (err: any) {
      alert("Erro no processo de matrícula: " + err.message);
    }
  };

  // Send Notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstablishmentId) return;

    try {
      const res = await fetch('/api/owner/school/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishment_id: selectedEstablishmentId,
          guardian_id: notificationForm.guardian_id ? Number(notificationForm.guardian_id) : null,
          student_id: notificationForm.student_id ? Number(notificationForm.student_id) : null,
          title: notificationForm.title,
          message: notificationForm.message,
          type: notificationForm.type,
          channel: notificationForm.channel
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        alert(`Notificação enviada com sucesso via ${notificationForm.channel.toUpperCase()}!`);
        setIsNotificationModalOpen(false);
        loadSchoolData(selectedEstablishmentId);
      } else {
        alert("Erro ao enviar notificação: " + resJson.error);
      }
    } catch (err: any) {
      alert("Erro ao enviar notificação: " + err.message);
    }
  };

  // Calculations for KPI cards
  const totalStudents = data.students.length;
  const activeStudents = data.students.filter(s => s.status === 'active').length;
  const totalClasses = data.classes.length;
  const totalTeachers = data.teachers.length;

  const totalRevenueThisMonth = data.tuitions
    .filter(t => t.status === 'paid' || t.status === 'partial')
    .reduce((acc, t) => acc + (t.paid_amount || 0), 0);

  const totalPendingAmount = data.tuitions
    .filter(t => t.status === 'pending' || t.status === 'overdue' || t.status === 'partial')
    .reduce((acc, t) => acc + (t.amount - (t.paid_amount || 0)), 0);

  const overdueTuitionsCount = data.tuitions.filter(t => t.status === 'overdue').length;
  const defaultRate = data.tuitions.length > 0 
    ? Math.round((overdueTuitionsCount / data.tuitions.length) * 100) 
    : 0;

  // Filtered lists
  const filteredStudents = data.students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.enrollment_code && s.enrollment_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (s.document_number && s.document_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesClass = !selectedClassFilter || s.class_id === Number(selectedClassFilter);
    const matchesStatus = selectedStatusFilter === 'all' || s.status === selectedStatusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const selectedPortalGuardian = data.guardians.find(g => g.id.toString() === portalGuardianId) || data.guardians[0];
  const portalDependents = selectedPortalGuardian 
    ? data.students.filter(s => s.guardian_id === selectedPortalGuardian.id) 
    : [];
  const portalTuitions = selectedPortalGuardian
    ? data.tuitions.filter(t => t.guardian_id === selectedPortalGuardian.id)
    : [];

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER & SCHOOL ESTABLISHMENT SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <GraduationCap size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">ERP Escolar & Faturação</h1>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-full">
                SaaS Fatu-r
              </span>
            </div>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">
              Gestão académica integrativa, matrículas, turmas, propinas recorrentes e emissão fiscal AGT.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Instituição de Ensino</label>
            <select
              value={selectedEstablishmentId || ''}
              onChange={e => setSelectedEstablishmentId(Number(e.target.value))}
              className="px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {establishments.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.type === 'escola' ? '(Escola)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => {
              setEnrollmentForm({
                ...enrollmentForm,
                student_name: '',
                guardian_name: ''
              });
              setActiveTab('enrollment');
            }}
            className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Plus size={16} />
            <span>Nova Matrícula</span>
          </button>
        </div>
      </div>



      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-zinc-200 text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm font-bold text-zinc-600">A carregar dados do ERP Escolar...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD GERAL */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* STATS CARDS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Alunos Matriculados</span>
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                      <GraduationCap size={20} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-zinc-900">{totalStudents}</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {activeStudents} Ativos
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-zinc-400 mt-2">Distribuição por {totalClasses} turmas ativas</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Receitas de Propinas (Mês)</span>
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <DollarSign size={20} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-zinc-900">Kz {totalRevenueThisMonth.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                    <ArrowUpRight size={14} /> Recebimentos validados no caixa
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Valores Pendentes</span>
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                      <Clock size={20} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-zinc-900">Kz {totalPendingAmount.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] font-bold text-amber-600 mt-2">A aguardar pagamento / liquidação</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Inadimplência (Atraso)</span>
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                      <AlertTriangle size={20} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-zinc-900">{defaultRate}%</span>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      {overdueTuitionsCount} Faturas
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-zinc-400 mt-2">Mensalidades com data de vencimento ultrapassada</p>
                </div>
              </div>

              {/* ACTION BANNER & QUICK ACTIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                  <div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-500/30">
                      Cobrança Recorrente Automática
                    </span>
                    <h2 className="text-xl font-black text-white mt-3">Emissão de Mensalidades do Mês</h2>
                    <p className="text-xs text-zinc-300 mt-1 max-w-xl">
                      Gere faturas (FT) automáticas para todos os alunos ativos da escola para o próximo mês de referência com apenas 1 clique.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-6">
                    <button
                      onClick={() => setIsBatchTuitionModalOpen(true)}
                      className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
                    >
                      <Calendar size={16} />
                      <span>Gerar Mensalidades em Lote</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('notifications')}
                      className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2"
                    >
                      <Bell size={16} />
                      <span>Enviar Avisos aos Encarregados</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider mb-4">Resumo Académico</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-100">
                        <span className="font-bold text-zinc-500">Turmas Ativas</span>
                        <span className="font-black text-zinc-900">{totalClasses}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-100">
                        <span className="font-bold text-zinc-500">Professores e Docentes</span>
                        <span className="font-black text-zinc-900">{totalTeachers}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-100">
                        <span className="font-bold text-zinc-500">Encarregados Registados</span>
                        <span className="font-black text-zinc-900">{data.guardians.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-500">Ano Letivo Vigente</span>
                        <span className="font-black text-emerald-600">2025/2026</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('classes')}
                    className="w-full mt-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl transition-all text-center"
                  >
                    Gerir Turmas e Salas
                  </button>
                </div>
              </div>

              {/* RECENT TUITION INVOICES TABLE */}
              <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-zinc-900">Últimas Mensalidades Emitidas</h3>
                    <p className="text-xs text-zinc-500">Documentos de faturação de propinas e serviços escolares</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('tuitions')}
                    className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    Ver todas ({data.tuitions.length}) <ChevronRight size={14} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-y border-zinc-100">
                      <tr>
                        <th className="px-4 py-3 font-black text-zinc-500 uppercase">Documento / FT</th>
                        <th className="px-4 py-3 font-black text-zinc-500 uppercase">Aluno</th>
                        <th className="px-4 py-3 font-black text-zinc-500 uppercase">Encarregado</th>
                        <th className="px-4 py-3 font-black text-zinc-500 uppercase">Mês Ref.</th>
                        <th className="px-4 py-3 font-black text-zinc-500 uppercase">Vencimento</th>
                        <th className="px-4 py-3 font-black text-zinc-500 uppercase">Valor</th>
                        <th className="px-4 py-3 font-black text-zinc-500 uppercase">Estado</th>
                        <th className="px-4 py-3 font-black text-zinc-500 uppercase text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {data.tuitions.slice(0, 5).map(t => (
                        <tr key={t.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="px-4 py-3 font-black text-zinc-900">{t.invoice_number || `FT-${t.id}`}</td>
                          <td className="px-4 py-3 font-bold text-zinc-800">{t.student_name}</td>
                          <td className="px-4 py-3 text-zinc-600">{t.guardian_name || 'N/A'}</td>
                          <td className="px-4 py-3 font-bold text-zinc-700">{t.reference_month}</td>
                          <td className="px-4 py-3 text-zinc-600">{t.due_date}</td>
                          <td className="px-4 py-3 font-black text-zinc-900">Kz {t.amount?.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              t.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                              t.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {t.status === 'paid' ? 'Pago' : t.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {t.status !== 'paid' && (
                              <button
                                onClick={() => {
                                  setSelectedTuitionForPayment(t);
                                  setPaymentForm({ payment_method: 'Multicaixa', amount_paid: t.amount - (t.paid_amount || 0) });
                                  setIsPaymentModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700"
                              >
                                Liquidar (RC)
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {data.tuitions.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-6 text-zinc-400 font-medium">
                            Nenhuma mensalidade gerada até ao momento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GESTÃO DE ALUNOS */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome, BI ou Nº Matrícula..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <select
                    value={selectedClassFilter}
                    onChange={e => setSelectedClassFilter(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 outline-none"
                  >
                    <option value="">Todas as Turmas</option>
                    {data.classes.map(c => (
                      <option key={c.id} value={c.id}>{c.grade_level} - {c.name}</option>
                    ))}
                  </select>

                  <select
                    value={selectedStatusFilter}
                    onChange={e => setSelectedStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 outline-none"
                  >
                    <option value="all">Todos os Estados</option>
                    <option value="active">Ativo</option>
                    <option value="suspended">Suspenso</option>
                    <option value="transferred">Transferido</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setEditingStudent(null);
                    setStudentForm({
                      name: '',
                      birth_date: '2012-05-14',
                      gender: 'M',
                      photo_url: '',
                      document_number: '',
                      nationality: 'Angolana',
                      phone: '',
                      email: '',
                      guardian_id: data.guardians[0]?.id ? data.guardians[0].id.toString() : '',
                      class_id: data.classes[0]?.id ? data.classes[0].id.toString() : '',
                      school_year: '2025/2026',
                      grade_level: '7ª Classe',
                      status: 'active',
                      monthly_fee: 100000
                    });
                    setIsStudentModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  <Plus size={16} />
                  <span>Registar Aluno</span>
                </button>
              </div>

              {/* STUDENTS LIST TABLE */}
              <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100/80 border-b border-zinc-200">
                    <tr>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Matrícula</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Aluno</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Classe / Turma</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Encarregado</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Mensalidade</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Estado</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                          {student.enrollment_code || `AL-${student.id}`}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-zinc-900 text-sm">{student.name}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">Doc: {student.document_number || 'N/D'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-zinc-800">{student.grade_level}</p>
                          <p className="text-[10px] text-zinc-500">{student.class_name || 'Sem turma'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-zinc-800">{student.guardian_name || 'Não associado'}</p>
                          <p className="text-[10px] text-zinc-500">{student.guardian_phone}</p>
                        </td>
                        <td className="px-4 py-3 font-black text-zinc-900">
                          Kz {(student.monthly_fee || 100000).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            student.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                            student.status === 'suspended' ? 'bg-rose-100 text-rose-800' :
                            'bg-zinc-100 text-zinc-700'
                          }`}>
                            {student.status === 'active' ? 'Ativo' : student.status === 'suspended' ? 'Suspenso' : 'Transferido'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingStudent(student);
                                setStudentForm({
                                  name: student.name || '',
                                  birth_date: student.birth_date || '2012-05-14',
                                  gender: student.gender || 'M',
                                  photo_url: student.photo_url || '',
                                  document_number: student.document_number || '',
                                  nationality: student.nationality || 'Angolana',
                                  phone: student.phone || '',
                                  email: student.email || '',
                                  guardian_id: student.guardian_id ? student.guardian_id.toString() : '',
                                  class_id: student.class_id ? student.class_id.toString() : '',
                                  school_year: student.school_year || '2025/2026',
                                  grade_level: student.grade_level || '7ª Classe',
                                  status: student.status || 'active',
                                  monthly_fee: student.monthly_fee || 100000
                                });
                                setIsStudentModalOpen(true);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100"
                              title="Editar Aluno"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Deseja remover o aluno ${student.name}?`)) {
                                  await fetch(`/api/owner/school/students/${student.id}`, { method: 'DELETE' });
                                  if (selectedEstablishmentId) loadSchoolData(selectedEstablishmentId);
                                }
                              }}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Eliminar Aluno"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-zinc-400 font-bold">
                          Nenhum aluno encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GESTÃO DE ENCARREGADOS */}
          {activeTab === 'guardians' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-zinc-900">Encarregados de Educação</h2>
                  <p className="text-xs text-zinc-500">Gestão de pais/tutores e cobranças consolidadas por dependente</p>
                </div>
                <button
                  onClick={() => {
                    setEditingGuardian(null);
                    setGuardianForm({
                      name: '',
                      phone: '',
                      email: '',
                      address: '',
                      document_number: '',
                      relationship: 'Pai'
                    });
                    setIsGuardianModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all"
                >
                  <Plus size={16} />
                  <span>Novo Encarregado</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.guardians.map(guardian => {
                  const dependents = data.students.filter(s => s.guardian_id === guardian.id);
                  const guardianTuitions = data.tuitions.filter(t => t.guardian_id === guardian.id);
                  const pendingTotal = guardianTuitions
                    .filter(t => t.status !== 'paid')
                    .reduce((acc, t) => acc + (t.amount - (t.paid_amount || 0)), 0);

                  return (
                    <div key={guardian.id} className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {guardian.relationship || 'Encarregado'}
                            </span>
                            <h3 className="text-base font-black text-zinc-900 mt-1">{guardian.name}</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingGuardian(guardian);
                                setGuardianForm({
                                  name: guardian.name || '',
                                  phone: guardian.phone || '',
                                  email: guardian.email || '',
                                  address: guardian.address || '',
                                  document_number: guardian.document_number || '',
                                  relationship: guardian.relationship || 'Pai'
                                });
                                setIsGuardianModalOpen(true);
                              }}
                              className="p-1 text-zinc-400 hover:text-zinc-800"
                            >
                              <Edit size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-zinc-600">
                          <p className="flex items-center gap-2"><Phone size={14} className="text-zinc-400" /> {guardian.phone || 'N/D'}</p>
                          <p className="flex items-center gap-2"><Mail size={14} className="text-zinc-400" /> {guardian.email || 'N/D'}</p>
                          <p className="flex items-center gap-2"><MapPin size={14} className="text-zinc-400" /> {guardian.address || 'Luanda, Angola'}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-zinc-100">
                          <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                            Educandos / Dependentes ({dependents.length})
                          </p>
                          <div className="space-y-1">
                            {dependents.map(dep => (
                              <div key={dep.id} className="flex items-center justify-between text-xs bg-zinc-50 p-2 rounded-lg">
                                <span className="font-bold text-zinc-800">{dep.name}</span>
                                <span className="text-[10px] font-mono text-zinc-500">{dep.grade_level}</span>
                              </div>
                            ))}
                            {dependents.length === 0 && (
                              <p className="text-xs text-zinc-400 italic">Nenhum dependente associado</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Dívida Total</p>
                          <p className="text-sm font-black text-rose-600">Kz {pendingTotal.toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedGuardianForBilling(guardian);
                            setIsJointBillingModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-1"
                        >
                          <FileText size={14} />
                          <span>Cobrança Conjunta</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: GESTÃO DE TURMAS */}
          {activeTab === 'classes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-zinc-900">Turmas e Salas de Aula</h2>
                  <p className="text-xs text-zinc-500">Organização das turmas, ano letivo, horário e professores responsáveis</p>
                </div>
                <button
                  onClick={() => {
                    setEditingClass(null);
                    setClassForm({
                      school_year: '2025/2026',
                      grade_level: '7ª Classe',
                      name: 'Turma A',
                      room: 'Sala 12',
                      schedule: 'Manhã (07:30 - 12:30)',
                      teacher_name: 'Prof. António Silva',
                      monthly_fee: 100000,
                      due_day: 5
                    });
                    setIsClassModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all"
                >
                  <Plus size={16} />
                  <span>Nova Turma</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.classes.map(c => {
                  const classStudents = data.students.filter(s => s.class_id === c.id);
                  return (
                    <div key={c.id} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {c.grade_level}
                          </span>
                          <h3 className="text-lg font-black text-zinc-900 mt-1">{c.name}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingClass(c);
                              setClassForm({
                                school_year: c.school_year || '2025/2026',
                                grade_level: c.grade_level || '7ª Classe',
                                name: c.name || '',
                                room: c.room || 'Sala 1',
                                schedule: c.schedule || 'Manhã',
                                teacher_name: c.teacher_name || '',
                                monthly_fee: c.monthly_fee || 100000,
                                due_day: c.due_day || 5
                              });
                              setIsClassModalOpen(true);
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-800"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-zinc-600">
                        <p className="font-semibold"><strong>Sala:</strong> {c.room}</p>
                        <p className="font-semibold"><strong>Horário:</strong> {c.schedule}</p>
                        <p className="font-semibold"><strong>Diretor de Turma:</strong> {c.teacher_name || 'N/A'}</p>
                        <p className="font-semibold"><strong>Propinas Base:</strong> Kz {(c.monthly_fee || 100000).toLocaleString()} (Vence dia {c.due_day})</p>
                      </div>

                      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-500">Total de Alunos:</span>
                        <span className="px-3 py-1 bg-zinc-100 text-zinc-900 font-black rounded-full text-xs">
                          {classStudents.length} Alunos
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: MATRÍCULAS (WIZARD) */}
          {activeTab === 'enrollment' && (
            <div className="bg-white p-8 rounded-3xl border border-zinc-200/80 shadow-sm max-w-4xl mx-auto space-y-6">
              <div className="border-b border-zinc-100 pb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  Fluxo Integrado de Matrícula Fatu-r
                </span>
                <h2 className="text-2xl font-black text-zinc-900 mt-2">Processo de Matrícula de Aluno</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Registe o aluno, associe encarregado e turma, e emita automaticamente a Fatura (FT) ou Fatura Recibo (FR).
                </p>
              </div>

              <form onSubmit={handleCompleteEnrollment} className="space-y-6">
                {/* DADOS DO ALUNO */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap size={18} className="text-emerald-600" />
                    1. Dados Pessoais do Aluno
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Nome Completo do Aluno *</label>
                      <input
                        type="text"
                        required
                        value={enrollmentForm.student_name}
                        onChange={e => setEnrollmentForm({ ...enrollmentForm, student_name: e.target.value })}
                        placeholder="Ex: Manuel João Kiala"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Data de Nascimento</label>
                      <input
                        type="date"
                        value={enrollmentForm.birth_date}
                        onChange={e => setEnrollmentForm({ ...enrollmentForm, birth_date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Documento BI / Cédula</label>
                      <input
                        type="text"
                        value={enrollmentForm.document_number}
                        onChange={e => setEnrollmentForm({ ...enrollmentForm, document_number: e.target.value })}
                        placeholder="Nº BI / Passaporte"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Classe Requerida</label>
                      <select
                        value={enrollmentForm.grade_level}
                        onChange={e => setEnrollmentForm({ ...enrollmentForm, grade_level: e.target.value })}
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none"
                      >
                        <option value="Iniciação">Iniciação</option>
                        <option value="1ª Classe">1ª Classe</option>
                        <option value="2ª Classe">2ª Classe</option>
                        <option value="7ª Classe">7ª Classe</option>
                        <option value="10º Ano">10º Ano</option>
                        <option value="12º Ano">12º Ano</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Turma Destino</label>
                      <select
                        value={enrollmentForm.class_id}
                        onChange={e => setEnrollmentForm({ ...enrollmentForm, class_id: e.target.value })}
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none"
                      >
                        <option value="">Selecionar Turma...</option>
                        {data.classes.map(c => (
                          <option key={c.id} value={c.id}>{c.grade_level} - {c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* DADOS DO ENCARREGADO */}
                <div className="space-y-3 pt-4 border-t border-zinc-100">
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck size={18} className="text-emerald-600" />
                    2. Dados do Encarregado de Educação
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Nome do Encarregado *</label>
                      <input
                        type="text"
                        required
                        value={enrollmentForm.guardian_name}
                        onChange={e => setEnrollmentForm({ ...enrollmentForm, guardian_name: e.target.value })}
                        placeholder="Ex: Dr. Pedro Kiala"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Telefone do Encarregado *</label>
                      <input
                        type="text"
                        required
                        value={enrollmentForm.guardian_phone}
                        onChange={e => setEnrollmentForm({ ...enrollmentForm, guardian_phone: e.target.value })}
                        placeholder="+244 923 000 000"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* VALORES E FATURAÇÃO */}
                <div className="space-y-3 pt-4 border-t border-zinc-100">
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-600" />
                    3. Emissão do Documento Financeiro (Fatu-r)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Taxa de Matrícula (Kz)</label>
                      <input
                        type="number"
                        value={enrollmentForm.enrollment_fee}
                        onChange={e => setEnrollmentForm({ ...enrollmentForm, enrollment_fee: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Valor da Mensalidade (Kz)</label>
                      <input
                        type="number"
                        value={enrollmentForm.monthly_fee}
                        onChange={e => setEnrollmentForm({ ...enrollmentForm, monthly_fee: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Modo de Emissão Fiscal</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                        enrollmentForm.payment_mode === 'immediate_fr' 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold' 
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                      }`}>
                        <input
                          type="radio"
                          name="payment_mode"
                          value="immediate_fr"
                          checked={enrollmentForm.payment_mode === 'immediate_fr'}
                          onChange={() => setEnrollmentForm({ ...enrollmentForm, payment_mode: 'immediate_fr' })}
                        />
                        <div>
                          <p className="text-xs font-black">Pagamento Imediato (FR)</p>
                          <p className="text-[10px] text-zinc-500">Gera Fatura Recibo (FR) quitada no ato</p>
                        </div>
                      </label>

                      <label className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                        enrollmentForm.payment_mode === 'credit_ft' 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold' 
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                      }`}>
                        <input
                          type="radio"
                          name="payment_mode"
                          value="credit_ft"
                          checked={enrollmentForm.payment_mode === 'credit_ft'}
                          onChange={() => setEnrollmentForm({ ...enrollmentForm, payment_mode: 'credit_ft' })}
                        />
                        <div>
                          <p className="text-xs font-black">Pagamento Posterior / Crédito (FT)</p>
                          <p className="text-[10px] text-zinc-500">Gera Fatura (FT) a crédito com data de vencimento</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition-all"
                  >
                    Confirmar & Finalizar Matrícula
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 6: CATÁLOGO DE SERVIÇOS ESCOLARES */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-zinc-900">Catálogo de Serviços Escolares</h2>
                  <p className="text-xs text-zinc-500">Propinas, transporte, alimentação, uniformes, livros e taxas académicas</p>
                </div>
                <button
                  onClick={() => {
                    setEditingService(null);
                    setServiceForm({
                      name: '',
                      price: 50000,
                      periodicity: 'monthly',
                      tax_percentage: 0,
                      account_code: '71.1',
                      status: 'active'
                    });
                    setIsServiceModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all"
                >
                  <Plus size={16} />
                  <span>Novo Serviço</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.services.map(s => (
                  <div key={s.id} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          {s.periodicity === 'monthly' ? 'Mensal' : s.periodicity === 'annual' ? 'Anual' : 'Pontual/Único'}
                        </span>
                        <h3 className="text-base font-black text-zinc-900 mt-1">{s.name}</h3>
                      </div>
                      <button
                        onClick={() => {
                          setEditingService(s);
                          setServiceForm({
                            name: s.name || '',
                            price: s.price || 0,
                            periodicity: s.periodicity || 'monthly',
                            tax_percentage: s.tax_percentage || 0,
                            account_code: s.account_code || '71.1',
                            status: s.status || 'active'
                          });
                          setIsServiceModalOpen(true);
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-800"
                      >
                        <Edit size={16} />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-500">Preço Base:</span>
                      <span className="text-base font-black text-zinc-900">Kz {s.price?.toLocaleString()}</span>
                    </div>

                    <div className="text-[10px] font-bold text-zinc-400 flex items-center justify-between">
                      <span>IVA: {s.tax_percentage > 0 ? `${s.tax_percentage}%` : 'Isento (Artº 12)'}</span>
                      <span>Conta: {s.account_code || '71.1'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: MENSALIDADES AUTOMÁTICAS */}
          {activeTab === 'tuitions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-zinc-900">Mensalidades & Cobrança Recorrente</h2>
                  <p className="text-xs text-zinc-500">Faturas emitidas por aluno para propinas e serviços escolares</p>
                </div>
                <button
                  onClick={() => setIsBatchTuitionModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                >
                  <Calendar size={16} />
                  <span>Gerar Mensalidades do Mês</span>
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100/80 border-b border-zinc-200">
                    <tr>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Fatura / FT</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Aluno</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Encarregado</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Referência</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Vencimento</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Valor Total</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Valor Pago</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase">Estado</th>
                      <th className="px-4 py-3 font-black text-zinc-600 uppercase text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.tuitions.map(t => (
                      <tr key={t.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-black text-zinc-900">{t.invoice_number || `FT ESC-${t.id}`}</td>
                        <td className="px-4 py-3 font-bold text-zinc-800">{t.student_name}</td>
                        <td className="px-4 py-3 text-zinc-600">{t.guardian_name || 'N/A'}</td>
                        <td className="px-4 py-3 font-bold text-zinc-700">{t.reference_month}</td>
                        <td className="px-4 py-3 text-zinc-600">{t.due_date}</td>
                        <td className="px-4 py-3 font-black text-zinc-900">Kz {t.amount?.toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">Kz {(t.paid_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            t.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                            t.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {t.status === 'paid' ? 'Pago' : t.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {t.status !== 'paid' && (
                            <button
                              onClick={() => {
                                setSelectedTuitionForPayment(t);
                                setPaymentForm({ payment_method: 'Multicaixa', amount_paid: t.amount - (t.paid_amount || 0) });
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                            >
                              Liquidar (RC)
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: PAGAMENTOS & CAIXA ESCOLAR */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
                <h2 className="text-lg font-black text-zinc-900">Caixa Escolar & Liquidação de Propinas</h2>
                <p className="text-xs text-zinc-500">
                  Liquide faturas de mensalidades em Dinheiro, TPA, Multicaixa ou Transferência e receba automaticamente o Recibo (RC) Fatu-r.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  {data.tuitions.filter(t => t.status !== 'paid').map(t => (
                    <div key={t.id} className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          Pendente - {t.invoice_number}
                        </span>
                        <h4 className="text-sm font-black text-zinc-900 mt-2">{t.student_name}</h4>
                        <p className="text-xs text-zinc-500">Enc: {t.guardian_name}</p>
                        <p className="text-xs font-bold text-zinc-700 mt-1">{t.reference_month}</p>
                      </div>

                      <div className="pt-2 border-t border-zinc-200 flex items-center justify-between">
                        <span className="text-sm font-black text-zinc-900">Kz {t.amount?.toLocaleString()}</span>
                        <button
                          onClick={() => {
                            setSelectedTuitionForPayment(t);
                            setPaymentForm({ payment_method: 'Multicaixa', amount_paid: t.amount - (t.paid_amount || 0) });
                            setIsPaymentModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700"
                        >
                          Receber Agora
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: DOCUMENTOS FISCAIS FATU-R */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <h2 className="text-lg font-black text-zinc-900">Documentos Fiscais Escolares (FT, FR, RC, NC, ND, FP)</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Todos os documentos fiscais emitidos no módulo escolar cumprem as especificações da AGT.
                </p>
                <div className="mt-6">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 border-b border-zinc-200">
                      <tr>
                        <th className="px-4 py-3 font-black text-zinc-600">Número</th>
                        <th className="px-4 py-3 font-black text-zinc-600">Tipo</th>
                        <th className="px-4 py-3 font-black text-zinc-600">Aluno</th>
                        <th className="px-4 py-3 font-black text-zinc-600">Valor Total</th>
                        <th className="px-4 py-3 font-black text-zinc-600">Data</th>
                        <th className="px-4 py-3 font-black text-zinc-600 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {data.tuitions.map(t => (
                        <tr key={t.id}>
                          <td className="px-4 py-3 font-bold">{t.invoice_number || `FT-${t.id}`}</td>
                          <td className="px-4 py-3 font-bold text-emerald-700">Fatura (FT)</td>
                          <td className="px-4 py-3">{t.student_name}</td>
                          <td className="px-4 py-3 font-black">Kz {t.amount?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-zinc-500">{t.due_date}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => alert(`A imprimir documento fiscal ${t.invoice_number}...`)}
                              className="px-2.5 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 ml-auto"
                            >
                              <Printer size={12} /> Imprimir / PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: PORTAL DO ENCARREGADO (SIMULADOR) */}
          {activeTab === 'parent_portal' && (
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                    Visão dos Pais / Encarregados
                  </span>
                  <h2 className="text-2xl font-black text-zinc-900 mt-1">Portal do Encarregado de Educação</h2>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-zinc-500">Simular Encarregado:</label>
                  <select
                    value={portalGuardianId}
                    onChange={e => setPortalGuardianId(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                  >
                    {data.guardians.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedPortalGuardian ? (
                <div className="space-y-6">
                  {/* WELCOME BANNER */}
                  <div className="p-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl shadow-md">
                    <h3 className="text-xl font-black">Olá, {selectedPortalGuardian.name}!</h3>
                    <p className="text-xs text-purple-200 mt-1">
                      Bem-vindo ao portal escolar. Consulte aqui a situação financeira, propinas e comunicados dos seus educandos.
                    </p>
                  </div>

                  {/* DEPENDENTS CARDS */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-3">Seus Educandos</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {portalDependents.map(dep => (
                        <div key={dep.id} className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-black text-lg">
                            {dep.name.charAt(0)}
                          </div>
                          <div>
                            <h5 className="font-black text-zinc-900 text-sm">{dep.name}</h5>
                            <p className="text-xs text-zinc-500">{dep.grade_level} • {dep.enrollment_code}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TUITION & INVOICES */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-3">Mensalidades & Faturas</h4>
                    <div className="space-y-2">
                      {portalTuitions.map(pt => (
                        <div key={pt.id} className="p-4 bg-white border border-zinc-200 rounded-2xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-zinc-900 text-sm">{pt.reference_month}</p>
                            <p className="text-xs text-zinc-500">Educando: {pt.student_name} | Vence a {pt.due_date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-zinc-900 text-sm">Kz {pt.amount?.toLocaleString()}</p>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              pt.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {pt.status === 'paid' ? 'Pago' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-zinc-400 py-8">Nenhum encarregado selecionado.</p>
              )}
            </div>
          )}

          {/* TAB 11: AVISOS & NOTIFICAÇÕES */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-zinc-900">Avisos e Notificações aos Pais</h2>
                  <p className="text-xs text-zinc-500">Alertas automáticos de vencimento, faturas emitidas e mensalidades em atraso</p>
                </div>
                <button
                  onClick={() => setIsNotificationModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all"
                >
                  <Send size={16} />
                  <span>Enviar Nova Notificação</span>
                </button>
              </div>

              <div className="space-y-3">
                {data.notifications.map(n => (
                  <div key={n.id} className="p-4 bg-white border border-zinc-200 rounded-2xl flex items-start gap-4">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <Bell size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-zinc-900 text-sm">{n.title}</h4>
                        <span className="text-[10px] text-zinc-400">{n.sent_at}</span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-1">{n.message}</p>
                      <p className="text-[10px] font-bold text-zinc-400 mt-2">
                        Destinatário: {n.guardian_name || 'Todos os Encarregados'} | Canal: {n.channel?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 12: FINANCEIRO ESCOLAR */}
          {activeTab === 'finance' && (
            <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
              <h2 className="text-lg font-black text-zinc-900">Relatório e Fluxo Financeiro Escolar</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-800">Total Faturado no Mês</p>
                  <p className="text-2xl font-black text-emerald-950 mt-1">Kz {(totalRevenueThisMonth + totalPendingAmount).toLocaleString()}</p>
                </div>
                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-800">Total Arrecadado (Caixa)</p>
                  <p className="text-2xl font-black text-blue-950 mt-1">Kz {totalRevenueThisMonth.toLocaleString()}</p>
                </div>
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-800">Contas a Receber (Propinas)</p>
                  <p className="text-2xl font-black text-amber-950 mt-1">Kz {totalPendingAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 13: PROFESSORES & RH ESCOLAR */}
          {activeTab === 'hr' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-zinc-900">Docentes e Corpo Docente (RH Escolar)</h2>
                  <p className="text-xs text-zinc-500">Professores, horários, disciplinas e salários</p>
                </div>
                <button
                  onClick={() => {
                    setEditingTeacher(null);
                    setTeacherForm({
                      name: '',
                      email: '',
                      phone: '',
                      document_number: '',
                      subjects: 'Matemática, Física',
                      contract_type: 'full_time',
                      salary: 250000,
                      status: 'active'
                    });
                    setIsTeacherModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all"
                >
                  <Plus size={16} />
                  <span>Cadastrar Professor</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.teachers.map(t => (
                  <div key={t.id} className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-zinc-900 text-base">{t.name}</h3>
                        <p className="text-xs text-zinc-500">{t.subjects}</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingTeacher(t);
                          setTeacherForm({
                            name: t.name || '',
                            email: t.email || '',
                            phone: t.phone || '',
                            document_number: t.document_number || '',
                            subjects: t.subjects || '',
                            contract_type: t.contract_type || 'full_time',
                            salary: t.salary || 250000,
                            status: t.status || 'active'
                          });
                          setIsTeacherModalOpen(true);
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-800"
                      >
                        <Edit size={16} />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 text-xs text-zinc-600 space-y-1">
                      <p><strong>Contrato:</strong> {t.contract_type === 'full_time' ? 'Tempo Inteiro' : 'Tempo Parcial'}</p>
                      <p><strong>Salário Base:</strong> Kz {(t.salary || 250000).toLocaleString()}</p>
                      <p><strong>Contacto:</strong> {t.phone || 'N/D'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 14: RELATÓRIOS ESCOLARES */}
          {activeTab === 'reports' && (
            <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-zinc-900">Relatórios Académicos e Financeiros</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
                  <h4 className="font-black text-sm text-zinc-900">Relatório Académico de Matrículas</h4>
                  <p className="text-xs text-zinc-500">Resumo de alunos matriculados por turma e ano letivo.</p>
                  <button 
                    onClick={() => alert("Relatório Académico gerado em PDF!")}
                    className="px-3 py-1.5 bg-zinc-900 text-white rounded-xl text-xs font-bold"
                  >
                    Exportar PDF
                  </button>
                </div>

                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
                  <h4 className="font-black text-sm text-zinc-900">Relatório Financeiro de Propinas</h4>
                  <p className="text-xs text-zinc-500">Relatório consolidado de cobrança de mensalidades e dívidas.</p>
                  <button 
                    onClick={() => alert("Relatório Financeiro de Propinas gerado em PDF!")}
                    className="px-3 py-1.5 bg-zinc-900 text-white rounded-xl text-xs font-bold"
                  >
                    Exportar PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 15: PERMISSÕES & PERFIS */}
          {activeTab === 'permissions' && (
            <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-zinc-900">Perfis de Acesso & Segurança Escolar</h2>
              <p className="text-xs text-zinc-500">Controlo de acessos por perfil de utilizador na escola.</p>

              <div className="space-y-3 pt-4">
                {[
                  { role: 'Administrador / Mantenedor', desc: 'Acesso total a todos os módulos, configurações e relatórios.' },
                  { role: 'Diretor Académico', desc: 'Gestão de turmas, alunos, matrículas e corpo docente.' },
                  { role: 'Financeiro Escolar', desc: 'Emissão de mensalidades, cobrança de propinas, caixa e relatórios fiscais.' },
                  { role: 'Secretaria', desc: 'Atendimento, pré-matrículas, registo de dados pessoais de alunos e encarregados.' },
                  { role: 'Professor / Docente', desc: 'Acesso a pautas da sua turma, alunos e presenças.' }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-zinc-900 text-sm">{item.role}</h4>
                      <p className="text-xs text-zinc-500">{item.desc}</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Ativo</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: NOVO / EDITAR ALUNO */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-black text-zinc-900">
                {editingStudent ? 'Editar Registo de Aluno' : 'Registar Novo Aluno'}
              </h3>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.name}
                    onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Nº Documento / BI</label>
                  <input
                    type="text"
                    value={studentForm.document_number}
                    onChange={e => setStudentForm({ ...studentForm, document_number: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Encarregado de Educação</label>
                  <select
                    value={studentForm.guardian_id}
                    onChange={e => setStudentForm({ ...studentForm, guardian_id: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                  >
                    <option value="">Selecionar Encarregado...</option>
                    {data.guardians.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Classe</label>
                  <input
                    type="text"
                    value={studentForm.grade_level}
                    onChange={e => setStudentForm({ ...studentForm, grade_level: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Turma Destino</label>
                  <select
                    value={studentForm.class_id}
                    onChange={e => setStudentForm({ ...studentForm, class_id: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                  >
                    <option value="">Sem Turma</option>
                    {data.classes.map(c => (
                      <option key={c.id} value={c.id}>{c.grade_level} - {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Mensalidade (Kz)</label>
                  <input
                    type="number"
                    value={studentForm.monthly_fee}
                    onChange={e => setStudentForm({ ...studentForm, monthly_fee: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Estado</label>
                  <select
                    value={studentForm.status}
                    onChange={e => setStudentForm({ ...studentForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                  >
                    <option value="active">Ativo</option>
                    <option value="suspended">Suspenso</option>
                    <option value="transferred">Transferido</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
                >
                  Guardar Aluno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO / EDITAR ENCARREGADO */}
      {isGuardianModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-black text-zinc-900">
                {editingGuardian ? 'Editar Encarregado' : 'Cadastrar Encarregado'}
              </h3>
              <button onClick={() => setIsGuardianModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveGuardian} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={guardianForm.name}
                  onChange={e => setGuardianForm({ ...guardianForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Telefone *</label>
                <input
                  type="text"
                  required
                  value={guardianForm.phone}
                  onChange={e => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={guardianForm.email}
                  onChange={e => setGuardianForm({ ...guardianForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Relação com o Aluno</label>
                <select
                  value={guardianForm.relationship}
                  onChange={e => setGuardianForm({ ...guardianForm, relationship: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                >
                  <option value="Pai">Pai</option>
                  <option value="Mãe">Mãe</option>
                  <option value="Tutor Legal">Tutor Legal</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsGuardianModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
                >
                  Guardar Encarregado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GERAR MENSALIDADES EM LOTE */}
      {isBatchTuitionModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-black text-zinc-900">Emissão em Lote de Mensalidades</h3>
              <button onClick={() => setIsBatchTuitionModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateBatchTuitions} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Mês de Referência *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Março 2026"
                  value={batchForm.reference_month}
                  onChange={e => setBatchForm({ ...batchForm, reference_month: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Data Limite de Vencimento *</label>
                <input
                  type="date"
                  required
                  value={batchForm.due_date}
                  onChange={e => setBatchForm({ ...batchForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Filtrar por Turma (Opcional)</label>
                <select
                  value={batchForm.class_id}
                  onChange={e => setBatchForm({ ...batchForm, class_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                >
                  <option value="">Todas as Turmas Ativas</option>
                  {data.classes.map(c => (
                    <option key={c.id} value={c.id}>{c.grade_level} - {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <p className="font-bold">Aviso:</p>
                <p>Será gerada uma Fatura (FT) para cada aluno ativo que ainda não tenha mensalidade gerada para este mês.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsBatchTuitionModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
                >
                  Gerar Faturas FT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LIQUIDAÇÃO / PAGAMENTO DE PROPINAS */}
      {isPaymentModalOpen && selectedTuitionForPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-zinc-900">Liquidar Propinas (Recibo RC)</h3>
                <p className="text-xs text-zinc-500">{selectedTuitionForPayment.invoice_number}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePayTuition} className="space-y-4">
              <div className="p-3 bg-zinc-50 rounded-xl space-y-1 text-xs">
                <p><strong>Aluno:</strong> {selectedTuitionForPayment.student_name}</p>
                <p><strong>Mês Ref:</strong> {selectedTuitionForPayment.reference_month}</p>
                <p><strong>Valor Fatura:</strong> Kz {selectedTuitionForPayment.amount?.toLocaleString()}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Método de Pagamento</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                >
                  <option value="Multicaixa">Multicaixa TPA / Express</option>
                  <option value="Dinheiro">Dinheiro (Numerário)</option>
                  <option value="Transferência">Transferência Bancária</option>
                  <option value="Online">Pagamento Online</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Valor a Receber (Kz)</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount_paid}
                  onChange={e => setPaymentForm({ ...paymentForm, amount_paid: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
                >
                  Confirmar Pagamento & Emitir RC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOTIFICAÇÃO */}
      {isNotificationModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-black text-zinc-900">Enviar Aviso ao Encarregado</h3>
              <button onClick={() => setIsNotificationModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Encarregado Destinatário</label>
                <select
                  value={notificationForm.guardian_id}
                  onChange={e => setNotificationForm({ ...notificationForm, guardian_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                >
                  <option value="">Todos os Encarregados</option>
                  {data.guardians.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Canal de Envio</label>
                <select
                  value={notificationForm.channel}
                  onChange={e => setNotificationForm({ ...notificationForm, channel: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                >
                  <option value="sms">SMS Escolar</option>
                  <option value="email">Email Oficial</option>
                  <option value="app">Notificação na App</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Título do Aviso</label>
                <input
                  type="text"
                  required
                  value={notificationForm.title}
                  onChange={e => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Mensagem</label>
                <textarea
                  rows={3}
                  required
                  value={notificationForm.message}
                  onChange={e => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsNotificationModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Send size={14} /> Enviar Aviso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COBRANÇA CONJUNTA ENCARREGADO */}
      {isJointBillingModalOpen && selectedGuardianForBilling && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-zinc-900">Cobrança Conjunta</h3>
                <p className="text-xs text-zinc-500">Encarregado: {selectedGuardianForBilling.name}</p>
              </div>
              <button onClick={() => setIsJointBillingModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-zinc-700">Dívidas Consolidadas dos Dependentes:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {data.tuitions
                  .filter(t => t.guardian_id === selectedGuardianForBilling.id && t.status !== 'paid')
                  .map(t => (
                    <div key={t.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-zinc-900">{t.student_name} - {t.reference_month}</p>
                        <p className="text-[10px] text-zinc-500">Doc: {t.invoice_number}</p>
                      </div>
                      <span className="font-black text-rose-600">Kz {(t.amount - (t.paid_amount || 0)).toLocaleString()}</span>
                    </div>
                  ))}
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900">Total a Cobrar:</span>
                <span className="text-lg font-black text-emerald-950">
                  Kz {data.tuitions
                    .filter(t => t.guardian_id === selectedGuardianForBilling.id && t.status !== 'paid')
                    .reduce((acc, t) => acc + (t.amount - (t.paid_amount || 0)), 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsJointBillingModalOpen(false)}
                className="px-4 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  alert(`Cobrança conjunta enviada por SMS/Email para ${selectedGuardianForBilling.name}!`);
                  setIsJointBillingModalOpen(false);
                }}
                className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
              >
                Emitir & Enviar Notificação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
