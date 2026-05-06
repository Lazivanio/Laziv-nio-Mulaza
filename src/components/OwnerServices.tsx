import React, { useState, useEffect, FormEvent } from 'react';
import { User, Establishment, Service, ServiceFee } from '../types';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  Tag, 
  Info, 
  DollarSign, 
  Building2 as EstablishmentIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Calendar,
  Filter,
  ClipboardList,
  Printer,
  ChevronRight,
  Clock,
  User as UserIcon,
  MapPin,
  Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white border border-zinc-100 shadow-sm rounded-2xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h3 className="font-black text-zinc-900 uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
            <XCircle size={20} className="text-zinc-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

export const OwnerServices = ({ user }: { user: User }) => {
  const [activeTab, setActiveTab] = useState<'management' | 'report' | 'service-sheets'>('management');
  const [services, setServices] = useState<Service[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [serviceSheets, setServiceSheets] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isSheetLoading, setIsSheetLoading] = useState(false);

  const [formData, setFormData] = useState({
    establishment_id: '',
    name: '',
    code: '',
    description: '',
    price: '',
    availability_condition: 'always' as 'always' | 'product_purchased',
    show_in_pos: 1,
    tax_id: '',
    retention_enabled: 0,
    retention_percentage: '',
    fees: [] as { name: string, amount: number }[]
  });

  const [sheetFormData, setSheetFormData] = useState({
    establishment_id: '',
    service_id: '',
    client_name: '',
    client_nif: '',
    client_address: '',
    service_description: '',
    assigned_staff: '',
    scheduled_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
    if (activeTab === 'report') {
      fetchReport();
    } else if (activeTab === 'service-sheets') {
      fetchServiceSheets();
    }
  }, [user.id, activeTab]);

  const fetchServiceSheets = async () => {
    setIsSheetLoading(true);
    try {
      // Find the first establishment of the user or filter by select
      const estId = establishments.length > 0 ? establishments[0].id : null;
      if (estId) {
        const res = await fetch(`/api/owner/service-sheets/${estId}`);
        const data = await res.json();
        setServiceSheets(data);
      }
    } catch (error) {
      console.error('Error fetching service sheets:', error);
    } finally {
      setIsSheetLoading(false);
    }
  };

  const handleEstablishmentChangeForSheets = async (estId: string) => {
    setSheetFormData({ ...sheetFormData, establishment_id: estId });
    if (estId) {
      setIsSheetLoading(true);
      try {
        const res = await fetch(`/api/owner/service-sheets/${estId}`);
        const data = await res.json();
        setServiceSheets(data);
      } catch (e) {}
      setIsSheetLoading(false);
    }
  };

  const fetchReport = async () => {
    setIsReportLoading(true);
    try {
      const res = await fetch(`/api/owner/services-report/${user.id}`);
      const data = await res.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setIsReportLoading(false);
    }
  };

  const hasServicesForSelectedEst = sheetFormData.establishment_id && 
    services.some(s => s.establishment_id.toString() === sheetFormData.establishment_id);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [servicesRes, establishmentsRes, taxesRes] = await Promise.all([
        fetch(`/api/owner/services/${user.id}`),
        fetch(`/api/owner/establishments/${user.id}`),
        fetch(`/api/owner/taxes/${user.id}`)
      ]);
      
      const servicesData = await servicesRes.json();
      const establishmentsData = await establishmentsRes.json();
      const taxesData = await taxesRes.json();
      
      setServices(servicesData);
      setEstablishments(Array.isArray(establishmentsData) ? establishmentsData : []);
      setTaxes(taxesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingService ? `/api/owner/services/${editingService.id}` : '/api/owner/services';
    const method = editingService ? 'PUT' : 'POST';

    try {
      const isExclusao = user?.fiscal_regime === 'exclusao';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          owner_id: user.id,
          price: Number(formData.price),
          retention_enabled: isExclusao ? 0 : formData.retention_enabled,
          retention_percentage: (isExclusao || formData.retention_enabled === 0) ? 0 : Number(formData.retention_percentage)
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingService(null);
        setFormData({
          establishment_id: '',
          name: '',
          code: '',
          description: '',
          price: '',
          availability_condition: 'always',
          show_in_pos: 1,
          tax_id: '',
          retention_enabled: 0,
          retention_percentage: '',
          fees: []
        });
        fetchData();
      } else {
        const body = await res.json();
        alert(body.error || 'Erro ao guardar serviço.');
      }
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      establishment_id: service.establishment_id.toString(),
      name: service.name || '',
      code: service.code || '',
      description: service.description || '',
      price: service.price.toString(),
      availability_condition: service.availability_condition,
      show_in_pos: service.show_in_pos,
      tax_id: service.tax_id?.toString() || '',
      retention_enabled: service.retention_enabled || 0,
      retention_percentage: service.retention_percentage?.toString() || '',
      fees: service.fees?.map(f => ({ name: f.name, amount: f.amount })) || []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      const res = await fetch(`/api/owner/services/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const handleCreateSheet = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/owner/service-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetFormData)
      });
      
      if (res.ok) {
        setIsSheetModalOpen(false);
        fetchServiceSheets();
        // Reset form
        setSheetFormData({
          establishment_id: sheetFormData.establishment_id,
          service_id: '',
          client_name: '',
          client_nif: '',
          client_address: '',
          service_description: '',
          assigned_staff: '',
          scheduled_date: new Date().toISOString().split('T')[0]
        });
      } else {
        const errData = await res.json();
        alert(errData.error || "Erro ao criar folha de serviço");
      }
    } catch (e) {
      console.error('Error creating service sheet:', e);
      alert("Erro de conexão ao criar folha de serviço");
    }
  };

  const updateSheetStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/owner/service-sheets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchServiceSheets();
    } catch (e) {}
  };

  const deleteSheet = async (id: number) => {
    if (!confirm("Confirmar exclusão da folha de serviço?")) return;
    try {
      const res = await fetch(`/api/owner/service-sheets/${id}`, { method: 'DELETE' });
      if (res.ok) fetchServiceSheets();
    } catch (e) {}
  };

  const printServiceSheet = (sheet: any) => {
    const doc = new jsPDF() as any;
    const establishment = establishments.find(e => e.id === sheet.establishment_id);
    
    // Header colors
    const orange: [number, number, number] = [249, 115, 22]; // #f97316
    const black: [number, number, number] = [0, 0, 0];
    const white: [number, number, number] = [255, 255, 255];

    // Top Bar (Orange)
    doc.setFillColor(...orange);
    doc.rect(0, 0, 210, 40, 'F');
    
    // Header Text
    doc.setFontSize(24);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text("FOLHA DE SERVIÇO", 20, 25);
    
    doc.setFontSize(10);
    doc.text(`Nº DOCUMENTO: ${sheet.id.toString().padStart(6, '0')}`, 190, 15, { align: 'right' });
    doc.text(`EMITIDO EM: ${new Date(sheet.created_at).toLocaleDateString()}`, 190, 22, { align: 'right' });
    doc.text(`STATUS: ${sheet.status.toUpperCase()}`, 190, 29, { align: 'right' });

    // Establishment Info (Orange Accents)
    doc.setTextColor(...black);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO PRESTADOR", 20, 55);
    doc.setDrawColor(...orange);
    doc.setLineWidth(1);
    doc.line(20, 57, 60, 57);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const estY = 65;
    doc.text(`Empresa: ${establishment?.name || 'N/A'}`, 20, estY);
    doc.text(`NIF: ${establishment?.nif || 'N/A'}`, 20, estY + 6);
    doc.text(`Telefone: ${establishment?.phone || 'N/A'}`, 20, estY + 12);
    doc.text(`Endereço: ${establishment?.address || 'N/A'}`, 20, estY + 18);

    // Client Info (Orange Accents)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE / LOCAL", 110, 55);
    doc.line(110, 57, 150, 57);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const cliY = 65;
    doc.text(`Nome: ${sheet.client_name}`, 110, cliY);
    doc.text(`NIF: ${sheet.client_nif || 'CONSUMIDOR FINAL'}`, 110, cliY + 6);
    doc.text(`Local: ${sheet.client_address || 'N/A'}`, 110, cliY + 12);

    // Service Description
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIÇÃO DOS TRABALHOS", 20, 100);
    doc.line(20, 102, 190, 102);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const splitDesc = doc.splitTextToSize(sheet.service_description, 170);
    doc.text(splitDesc, 20, 110);

    // Staff Info
    doc.setFillColor(250, 250, 250);
    doc.rect(20, 135, 170, 15, 'F');
    doc.setFont("helvetica", "bold");
    doc.text(`Funcionário Designado:`, 25, 144);
    doc.setFont("helvetica", "normal");
    doc.text(`${sheet.assigned_staff || 'Pendente'}`, 70, 144);
    doc.text(`Data Agendada: ${new Date(sheet.scheduled_date).toLocaleDateString()}`, 130, 144);

    // Controls Table (Professional Look)
    autoTable(doc, {
      startY: 160,
      head: [['CONTROLO DE CAMPO', 'REGISTO (Preencher no Local)']],
      body: [
        ['Hora de Chegada', ''],
        ['Hora de Saída', ''],
        ['Materiais / Peças', ''],
        ['Observações Técnicas', ''],
      ],
      theme: 'grid',
      headStyles: { fillColor: orange, textColor: white, fontStyle: 'bold' },
      styles: { cellPadding: 6, fontSize: 9, cellWidth: 'wrap' },
      columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 120 } }
    });

    // Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 35;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    
    doc.line(30, finalY, 90, finalY);
    doc.setFontSize(8);
    doc.text("ASSINATURA DO TÉCNICO", 60, finalY + 5, { align: 'center' });
    
    doc.line(120, finalY, 180, finalY);
    doc.text("CARIMBO / ASSINATURA CLIENTE", 150, finalY + 5, { align: 'center' });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Este documento não serve como fatura. Destina-se apenas ao registo de prestação de serviços externos.", 105, 285, { align: 'center' });

    doc.save(`FOLHA_SERVICO_${sheet.id}.pdf`);
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Serviços</h2>
          <p className="text-zinc-500">Gestão e relatórios de serviços prestados em seus estabelecimentos.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('management')}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'management' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Gestão
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'report' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Relatório
          </button>
          <button 
            onClick={() => setActiveTab('service-sheets')}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'service-sheets' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Folhas de Serviço
          </button>
        </div>
      </div>

      {activeTab === 'management' ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                type="text" 
                placeholder="Pesquisar por nome ou código..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
              />
            </div>
            <button 
              onClick={() => {
                setEditingService(null);
                setFormData({
                  establishment_id: '',
                  name: '',
                  code: '',
                  description: '',
                  price: '',
                  availability_condition: 'always',
                  show_in_pos: 1,
                  tax_id: '',
                  retention_enabled: 0,
                  retention_percentage: '',
                  fees: []
                });
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            >
              <Plus size={20} />
              Novo Serviço
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : filteredServices.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
                <Package size={40} />
              </div>
              <h3 className="text-lg font-bold text-zinc-800">Nenhum serviço encontrado</h3>
              <p className="text-zinc-500 max-w-xs mx-auto">Comece cadastrando seu primeiro serviço para vê-lo aqui.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map(service => (
                <div key={service.id} className="bg-white border border-zinc-100 shadow-sm rounded-2xl overflow-hidden group hover:border-orange-200 transition-all">
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="p-3 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                        <Tag size={24} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(service)}
                          className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(service.id)}
                          className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded uppercase tracking-wider">
                        {service.code}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        service.show_in_pos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {service.show_in_pos ? 'No PDV' : 'Oculto'}
                      </span>
                      {service.tax_code && (
                        <span className="text-[10px] font-black bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded uppercase tracking-wider">
                          {service.tax_code} ({service.tax_percentage}%)
                        </span>
                      )}
                      {service.retention_enabled === 1 && (
                        <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded uppercase tracking-wider">
                          Retenção ({service.retention_percentage}%)
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-black text-zinc-900 leading-tight">{service.name}</h4>
                    <p className="text-sm text-zinc-500 line-clamp-2 mt-2">{service.description}</p>
                    
                    {service.fees && service.fees.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {service.fees.map((fee, idx) => (
                          <div key={idx} className="bg-zinc-50 border border-zinc-100 rounded-lg px-2 py-1 flex items-center gap-2">
                             <span className="text-[10px] font-bold text-zinc-600">{fee.name}</span>
                             <span className="text-[10px] font-black text-orange-600">+Kz {fee.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                    <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Preço</p>
                        <p className="text-xl font-black text-orange-600">Kz {service.price.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-end gap-1">
                          <EstablishmentIcon size={10} /> {service.establishment_name}
                        </p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                          {service.availability_condition === 'always' ? 'Sempre Disponível' : 'Requer Compra'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : activeTab === 'service-sheets' ? (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
             <div className="flex-1 md:max-w-md">
                <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 ml-1">Filtrar por Estabelecimento</label>
                <select 
                  value={sheetFormData.establishment_id}
                  onChange={(e) => handleEstablishmentChangeForSheets(e.target.value)}
                  className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm text-sm font-bold transition-all"
                >
                  <option value="">Selecione um estabelecimento...</option>
                  {establishments.map(est => (
                    <option key={est.id} value={est.id}>{est.name}</option>
                  ))}
                </select>
             </div>
             <div className="flex flex-col gap-2">
               <button 
                  disabled={!sheetFormData.establishment_id || !hasServicesForSelectedEst}
                  onClick={() => setIsSheetModalOpen(true)}
                  className="flex items-center justify-center gap-3 bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  <ClipboardList size={22} className="text-orange-500 group-hover:scale-110 transition-transform" />
                  Gerar Nova Folha
                </button>
                {sheetFormData.establishment_id && !hasServicesForSelectedEst && (
                  <p className="text-[10px] text-rose-500 font-bold ml-1 animate-pulse">
                    * Cadastre um serviço para este estabelecimento primeiro.
                  </p>
                )}
             </div>
          </div>

          {isSheetLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-100 border-t-orange-500"></div>
            </div>
          ) : serviceSheets.length === 0 ? (
            <div className="bg-white p-20 text-center rounded-3xl border border-zinc-100 shadow-sm">
              <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500">
                <ClipboardList size={48} />
              </div>
              <h3 className="text-xl font-black text-black">Nenhuma folha de serviço ativa</h3>
              <p className="text-zinc-500 max-w-sm mx-auto mt-2">Personalize o atendimento externo gerando folhas de serviço organizadas para sua equipa.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {serviceSheets.map(sheet => (
                 <div key={sheet.id} className="bg-white border-2 border-transparent hover:border-orange-500/20 rounded-3xl shadow-sm transition-all group overflow-hidden flex flex-col h-full">
                    <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Doc #{sheet.id.toString().padStart(5, '0')}</span>
                       <div className={cn(
                          "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                          sheet.status === 'completed' ? "bg-emerald-500 text-white" : 
                          sheet.status === 'cancelled' ? "bg-zinc-400 text-white" : "bg-orange-500 text-white"
                        )}>
                          {sheet.status === 'completed' ? 'Concluído' : sheet.status === 'cancelled' ? 'Cancelado' : 'Em curso'}
                        </div>
                    </div>
                    
                    <div className="p-7 flex-1 flex flex-col">
                       <div className="mb-6">
                          <h4 className="text-lg font-black text-black line-clamp-1 mb-1">{sheet.client_name}</h4>
                          <div className="flex items-center gap-2 text-orange-600 font-bold text-[10px] uppercase">
                             <MapPin size={14} />
                             <span className="line-clamp-1">{sheet.client_address || 'Local não especificado'}</span>
                          </div>
                       </div>

                       <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 mb-6 flex-1">
                          <p className="text-xs text-zinc-700 leading-relaxed italic">{sheet.service_description}</p>
                       </div>

                       <div className="grid grid-cols-2 gap-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          <div className="flex flex-col gap-1">
                             <span className="text-orange-500/60">Agendamento</span>
                             <div className="flex items-center gap-2 text-black">
                                <Calendar size={14} className="text-orange-400" />
                                <span>{new Date(sheet.scheduled_date).toLocaleDateString()}</span>
                             </div>
                          </div>
                          <div className="flex flex-col gap-1">
                             <span className="text-orange-500/60">Técnico</span>
                             <div className="flex items-center gap-2 text-black">
                                <UserIcon size={14} className="text-orange-400" />
                                <span className="truncate">{sheet.assigned_staff || 'A designar'}</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="px-7 pb-7 grid grid-cols-2 gap-3 mt-auto">
                       <button 
                          onClick={() => printServiceSheet(sheet)}
                          className="flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md"
                       >
                          <Printer size={16} className="text-orange-400" /> Imprimir
                       </button>

                       {sheet.status === 'pending' ? (
                          <div className="flex gap-2">
                             <button 
                               onClick={() => updateSheetStatus(sheet.id, 'completed')}
                               className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all shadow-md flex items-center justify-center"
                               title="Concluir"
                             >
                                <Check size={18} />
                             </button>
                             <button 
                               onClick={() => deleteSheet(sheet.id)}
                               className="px-3 py-3 bg-zinc-100 text-zinc-400 rounded-xl text-xs font-bold hover:bg-rose-50 hover:text-rose-500 transition-all"
                               title="Excluir"
                             >
                                <Trash2 size={18} />
                             </button>
                          </div>
                       ) : (
                          <button 
                             onClick={() => deleteSheet(sheet.id)}
                             className="py-3 bg-zinc-100 text-zinc-400 rounded-xl text-xs font-bold hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
                          >
                             <Trash2 size={16} /> Excluir
                          </button>
                       )}
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-orange-50 border-orange-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Receita Total</p>
                  <h3 className="text-2xl font-black text-zinc-900">
                    Kz {reportData.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()}
                  </h3>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-zinc-50 border-zinc-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/20">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total de Vendas</p>
                  <h3 className="text-2xl font-black text-zinc-900">
                    {reportData.reduce((acc, curr) => acc + curr.quantity, 0)}
                  </h3>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-zinc-50 border-zinc-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/20">
                  <Tag size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Serviços Distintos</p>
                  <h3 className="text-2xl font-black text-zinc-900">
                    {new Set(reportData.map(r => r.id)).size}
                  </h3>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="font-black text-zinc-900 uppercase tracking-tight">Relatório de Vendas por Serviço</h3>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-zinc-400">
                  <Filter size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Serviço</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estabelecimento</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Qtd Vendida</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Receita Total</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Última Venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {isReportLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                      </td>
                    </tr>
                  ) : reportData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-bold">
                        Nenhuma venda de serviço registada até ao momento.
                      </td>
                    </tr>
                  ) : (
                    reportData.map((item, idx) => (
                      <tr key={`${item.id}_${item.establishment_id}`} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{item.code}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <EstablishmentIcon size={14} className="text-zinc-400" />
                            <span className="text-sm font-medium text-zinc-600">{item.establishment_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 bg-zinc-100 text-zinc-900 rounded-full text-xs font-black">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-black text-orange-600">Kz {item.revenue.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 text-zinc-500">
                            <Calendar size={14} />
                            <span className="text-xs font-medium">{new Date(item.last_sold).toLocaleDateString()}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingService ? "Editar Serviço" : "Novo Serviço"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Estabelecimento</label>
              <select 
                required
                value={formData.establishment_id}
                onChange={e => setFormData({...formData, establishment_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              >
                <option value="">Selecione um estabelecimento</option>
                {establishments.map(establishment => (
                  <option key={establishment.id} value={establishment.id}>{establishment.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome do Serviço</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  placeholder="Ex: Instalação"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Código (ID)</label>
                <input 
                  type="text" required
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  placeholder="Ex: SERV001"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Descrição</label>
              <textarea 
                required
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all h-24 resize-none"
                placeholder="Descreva o serviço..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Preço (Kz)</label>
                <input 
                  type="number" required min="0"
                  value={isNaN(Number(formData.price)) ? '' : formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Mostrar no PDV</label>
                <select 
                  value={formData.show_in_pos}
                  onChange={e => setFormData({...formData, show_in_pos: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                >
                  <option value={1}>SIM</option>
                  <option value={0}>NÃO</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Disponibilidade</label>
              <select 
                value={formData.availability_condition}
                onChange={e => setFormData({...formData, availability_condition: e.target.value as any})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              >
                <option value="always">Sempre Disponível</option>
                <option value="product_purchased">Só se houver produto comprado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Imposto Aplicado</label>
              <select 
                value={formData.tax_id}
                onChange={e => setFormData({...formData, tax_id: e.target.value})}
                disabled={user?.fiscal_regime === 'exclusao'}
                className={cn(
                  "w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all",
                  user?.fiscal_regime === 'exclusao' && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="">Usar Padrão do Estabelecimento</option>
                {taxes.filter(t => t.establishment_id === Number(formData.establishment_id) && t.status === 'active').map(tax => (
                  <option key={tax.id} value={tax.id}>{tax.name} ({tax.percentage}%)</option>
                ))}
              </select>
              {user?.fiscal_regime === 'exclusao' && (
                <p className="text-[10px] text-amber-600 mt-1 font-bold">Bloqueado: Regime de Exclusão exige 0% de IVA (ISENTO).</p>
              )}
            </div>

            <div className={cn(
              "p-4 rounded-2xl border space-y-4 transition-all",
              user?.fiscal_regime === 'exclusao' 
                ? "bg-zinc-50 border-zinc-100 opacity-60" 
                : "bg-orange-50/50 border-orange-100"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Retenção na Fonte</h4>
                  <p className="text-[10px] text-zinc-500 font-medium">
                    {user?.fiscal_regime === 'exclusao' 
                      ? "Não aplicável no Regime de Exclusão" 
                      : "Aplicar desconto de retenção?"}
                  </p>
                </div>
                <div className="flex bg-zinc-200 p-1 rounded-lg">
                  <button
                    type="button"
                    disabled={user?.fiscal_regime === 'exclusao'}
                    onClick={() => setFormData({...formData, retention_enabled: 1})}
                    className={cn(
                      "px-3 py-1 text-[10px] font-black rounded-md transition-all",
                      formData.retention_enabled === 1 ? "bg-white text-orange-600 shadow-sm" : "text-zinc-500",
                      user?.fiscal_regime === 'exclusao' && "cursor-not-allowed"
                    )}
                  >
                    SIM
                  </button>
                  <button
                    type="button"
                    disabled={user?.fiscal_regime === 'exclusao'}
                    onClick={() => setFormData({...formData, retention_enabled: 0})}
                    className={cn(
                      "px-3 py-1 text-[10px] font-black rounded-md transition-all",
                      formData.retention_enabled === 0 ? "bg-white text-zinc-600 shadow-sm" : "text-zinc-500",
                      user?.fiscal_regime === 'exclusao' && "cursor-not-allowed"
                    )}
                  >
                    NÃO
                  </button>
                </div>
              </div>

              {formData.retention_enabled === 1 && user?.fiscal_regime !== 'exclusao' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Percentagem de Retenção (%)</label>
                  <div className="relative">
                    <input 
                      type="number" step="0.01" required
                      value={formData.retention_percentage}
                      onChange={e => setFormData({...formData, retention_percentage: e.target.value})}
                      className="w-full pl-4 pr-10 py-3 bg-white border border-orange-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-orange-700"
                      placeholder="Ex: 6.5"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <span className="text-orange-400 font-bold">%</span>
                    </div>
                  </div>
                </div>
              )}
              
              {user?.fiscal_regime === 'exclusao' && (
                <p className="text-[10px] text-amber-600 font-bold">
                  Nota: Empresas no Regime de Exclusão estão isentas de retenção na fonte.
                </p>
              )}
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Taxas do Serviço</h4>
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, fees: [...formData.fees, { name: '', amount: 0 }] })}
                  className="flex items-center gap-1 text-[10px] font-black text-orange-600 hover:text-orange-700 uppercase"
                >
                  <Plus size={12} /> Adicionar Taxa
                </button>
              </div>
              
              <div className="space-y-2">
                {formData.fees.map((fee, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input 
                      type="text" required
                      value={fee.name}
                      onChange={e => {
                        const newFees = [...formData.fees];
                        newFees[idx].name = e.target.value;
                        setFormData({ ...formData, fees: newFees });
                      }}
                      placeholder="Ex: Urgência"
                      className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-orange-500 font-bold tracking-tight"
                    />
                    <input 
                      type="number" required min="0"
                      value={fee.amount || ''}
                      onChange={e => {
                        const newFees = [...formData.fees];
                        newFees[idx].amount = Number(e.target.value);
                        setFormData({ ...formData, fees: newFees });
                      }}
                      placeholder="Valor"
                      className="w-24 px-3 py-2 bg-white border border-zinc-200 rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                    />
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, fees: formData.fees.filter((_, i) => i !== idx) })}
                      className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {formData.fees.length === 0 && (
                  <p className="text-[10px] text-zinc-400 font-bold text-center py-2">Nenhuma taxa configurada.</p>
                )}
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
          >
            {editingService ? 'Actualizar Serviço' : 'Cadastrar Serviço'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        title="Nova Folha de Serviço"
      >
        <form onSubmit={handleCreateSheet} className="space-y-4">
           <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Serviço a Prestar</label>
              <select 
                required
                value={sheetFormData.service_id}
                onChange={e => {
                  const s = services.find(sv => sv.id.toString() === e.target.value);
                  setSheetFormData({
                    ...sheetFormData, 
                    service_id: e.target.value,
                    service_description: s ? s.name : ''
                  });
                }}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 font-bold"
              >
                <option value="">Selecione o serviço...</option>
                {services
                  .filter(s => s.establishment_id.toString() === sheetFormData.establishment_id)
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
              </select>
           </div>

           <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Cliente / Entidade</label>
              <input 
                type="text" required
                value={sheetFormData.client_name}
                onChange={e => setSheetFormData({...sheetFormData, client_name: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Nome do cliente"
              />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">NIF</label>
                <input 
                  type="text"
                  value={sheetFormData.client_nif}
                  onChange={e => setSheetFormData({...sheetFormData, client_nif: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="NIF"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Data Agendada</label>
                <input 
                  type="date" required
                  value={sheetFormData.scheduled_date}
                  onChange={e => setSheetFormData({...sheetFormData, scheduled_date: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
           </div>

           <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Endereço do Local</label>
              <input 
                type="text"
                value={sheetFormData.client_address}
                onChange={e => setSheetFormData({...sheetFormData, client_address: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Rua, Bairro, Cidade"
              />
           </div>

           <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Descrição do Serviço</label>
              <textarea 
                required
                value={sheetFormData.service_description}
                onChange={e => setSheetFormData({...sheetFormData, service_description: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 h-24 resize-none"
                placeholder="Descreva o que será feito..."
              />
           </div>

           <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Funcionário Responsável</label>
              <input 
                type="text"
                value={sheetFormData.assigned_staff}
                onChange={e => setSheetFormData({...sheetFormData, assigned_staff: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Nome do funcionário"
              />
           </div>

           <button 
            type="submit"
            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
          >
            Gerar Folha de Serviço
          </button>
        </form>
      </Modal>
    </div>
  );
};
