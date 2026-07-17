import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  PieChart as PieChartIcon,
  AlertTriangle,
  ShoppingCart,
  RefreshCw,
  BarChart3,
  HelpCircle,
  CheckCircle2,
  ShieldAlert,
  BadgePercent,
  ArrowRight,
  Sparkles,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { User } from '../types';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div {...props} className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

export const OwnerReports = ({ user }: { user: User }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);

  // Purchasing planner options
  const [coverageDays, setCoverageDays] = useState<number>(30);
  const [safetyBuffer, setSafetyBuffer] = useState<number>(20);
  const [stockOverrides, setStockOverrides] = useState<Record<string, number>>({});
  const [costOverrides, setCostOverrides] = useState<Record<string, number>>({});
  const [showPurchaseModal, setShowPurchaseModal] = useState<boolean>(false);
  const [isRestocking, setIsRestocking] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/owner/global-reports/${user.id}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Servidor retornou resposta inesperada (não-JSON)");
        }
        return res.json();
      })
      .then(data => {
        setData(data);
      })
      .catch(err => {
        console.error("Error fetching global reports:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user.id, refreshCounter]);

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { 
      scale: 2,
      onclone: (clonedDoc) => {
        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach(style => {
          if (style.textContent) {
            style.textContent = style.textContent.replace(/oklab\([^)]+\)/g, '#000');
            style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#000');
            style.textContent = style.textContent.replace(/color-mix\([^)]+\)/g, '#000');
            style.textContent = style.textContent.replace(/light-dark\([^)]+\)/g, '#000');
          }
        });
        const elementsWithStyle = clonedDoc.querySelectorAll('[style]');
        elementsWithStyle.forEach(el => {
          const styleAttr = el.getAttribute('style');
          if (styleAttr) {
            let newStyle = styleAttr.replace(/oklab\([^)]+\)/g, '#000');
            newStyle = newStyle.replace(/oklch\([^)]+\)/g, '#000');
            newStyle = newStyle.replace(/color-mix\([^)]+\)/g, '#000');
            newStyle = newStyle.replace(/light-dark\([^)]+\)/g, '#000');
            el.setAttribute('style', newStyle);
          }
        });
      }
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('Relatorio_Global.pdf');
  };

  const exportToExcel = () => {
    if (!data) return;
    
    // Create a workbook
    const wb = XLSX.utils.book_new();
    
    // Summary Sheet
    const summaryData = [
      ['Relatório Global de Vendas'],
      ['Data de Extração', new Date().toLocaleString()],
      [''],
      ['Métrica', 'Valor'],
      ['Receita Total', `Kz ${data.totalRevenue.toLocaleString()}`],
      ['Total de Vendas', data.totalSales],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');
    
    // Establishment Revenue Sheet
    const wsEstablishment = XLSX.utils.json_to_sheet(data.revenueByEstablishment);
    XLSX.utils.book_append_sheet(wb, wsEstablishment, 'Receita por Estabelecimento');
    
    // Top Products Sheet
    const wsProducts = XLSX.utils.json_to_sheet(data.topProducts);
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Produtos Mais Vendidos');

    // Add smart purchasing suggestions to Excel
    const procurementPlan = data.topProducts.map((p: any, index: number) => {
      const vdm = p.quantity / 30;
      const proj = Math.ceil(vdm * coverageDays);
      const safety = Math.ceil(proj * (safetyBuffer / 100));
      const target = proj + safety;
      const current = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : p.stock;
      const sug = Math.max(0, target - current);
      const cost = costOverrides[p.id] !== undefined ? costOverrides[p.id] : p.cost;
      
      let abcClass = 'C';
      if (index < 3) abcClass = 'A';
      else if (index < 7) abcClass = 'B';

      return {
        'Produto': p.name,
        'Classe ABC': abcClass,
        'Vendas (30d)': p.quantity,
        'Média Diária (VDM)': Number(vdm.toFixed(2)),
        'Procura Projetada': proj,
        'Stock Segurança': safety,
        'Stock Recomendado': target,
        'Stock Atual': current,
        'Sugestão de Compra': sug,
        'Custo Unitário (Kz)': cost,
        'Custo Total Estimado (Kz)': sug * cost,
        'Status do Stock': sug > 0 ? (current <= safety * 0.5 ? 'Rutura Crítica' : 'Reabastecer') : (current > target * 1.5 ? 'Excesso de Stock' : 'Stock Saudável')
      };
    });
    const wsProcurement = XLSX.utils.json_to_sheet(procurementPlan);
    XLSX.utils.book_append_sheet(wb, wsProcurement, 'Plano de Reabastecimento');
    
    // Write file
    XLSX.writeFile(wb, 'Relatorio_Global_Com_Planeamento_Compras.xlsx');
  };

  if (isLoading) return <div className="p-12 text-center">Carregando relatórios...</div>;
  if (!data) return <div className="p-12 text-center text-rose-500 font-bold">Erro ao carregar dados do relatório global.</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Relatórios Globais</h2>
          <p className="text-zinc-500">Desempenho consolidado de todos os seus estabelecimentos.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
          >
            <FileText size={18} /> Exportar Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/20"
          >
            <Download size={18} /> Exportar PDF
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-8 bg-white p-8 rounded-3xl border border-zinc-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-zinc-900 text-white border-none rounded-2xl">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Receita Total</p>
            <h3 className="text-3xl font-black">Kz {data.totalRevenue.toLocaleString()}</h3>
            <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <TrendingUp size={14} /> +12% vs mês anterior
            </div>
          </Card>
          
          <Card className="p-6 bg-white border-zinc-100 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Total de Vendas</p>
            <h3 className="text-3xl font-black">{data.totalSales.toLocaleString()}</h3>
            <p className="text-xs text-zinc-400 mt-4 font-medium">Consolidado de todos os estabelecimentos</p>
          </Card>

          <Card className="p-6 bg-white border-zinc-100 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Ticket Médio</p>
            <h3 className="text-3xl font-black">Kz {(data.totalRevenue / (data.totalSales || 1)).toLocaleString()}</h3>
            <p className="text-xs text-zinc-400 mt-4 font-medium">Valor médio por venda</p>
          </Card>

          <Card className="p-6 bg-white border-zinc-100 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Estabelecimentos Ativos</p>
            <h3 className="text-3xl font-black">{(data.revenueByEstablishment || []).length}</h3>
            <p className="text-xs text-zinc-400 mt-4 font-medium">Contribuindo para os resultados</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-8 border-zinc-100 rounded-3xl shadow-sm">
            <h4 className="text-lg font-black mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-orange-500" />
              Evolução de Vendas (30 dias)
            </h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.salesByDay || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8'}}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(val: any) => [`Kz ${val.toLocaleString()}`, 'Receita']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-8 border-zinc-100 rounded-3xl shadow-sm">
            <h4 className="text-lg font-black mb-6 flex items-center gap-2">
              <PieChartIcon size={20} className="text-blue-500" />
              Lucro por Estabelecimento
            </h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.establishmentComparison || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} width={100} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(val: any) => [`Kz ${val.toLocaleString()}`, 'Lucro']}
                  />
                  <Bar dataKey="profit" fill="#10b981" radius={[0, 8, 8, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="p-8 border-zinc-100 rounded-3xl shadow-sm">
          <h4 className="text-lg font-black mb-6">Análise Comparativa entre Estabelecimentos</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                  <th className="pb-4">Estabelecimento</th>
                  <th className="pb-4 text-right">Vendas</th>
                  <th className="pb-4 text-right">Receita</th>
                  <th className="pb-4 text-right">Despesas</th>
                  <th className="pb-4 text-right">Lucro</th>
                  <th className="pb-4 text-right">Ticket Médio</th>
                  <th className="pb-4 text-right">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {(data.establishmentComparison || []).map((s: any, i: number) => (
                  <tr key={i} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="py-4 font-bold text-zinc-800">{s.name}</td>
                    <td className="py-4 text-right font-medium text-zinc-600">{s.salesCount}</td>
                    <td className="py-4 text-right font-bold text-zinc-900">Kz {s.revenue.toLocaleString()}</td>
                    <td className="py-4 text-right font-medium text-rose-500">Kz {s.expenses.toLocaleString()}</td>
                    <td className="py-4 text-right font-black text-emerald-600">Kz {s.profit.toLocaleString()}</td>
                    <td className="py-4 text-right font-medium text-zinc-600">Kz {s.ticketMedio.toLocaleString()}</td>
                    <td className="py-4 text-right font-bold text-zinc-900">{s.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 p-8 border-zinc-100 rounded-3xl shadow-sm">
            <h4 className="text-lg font-black mb-6">Eficiência de Promoções</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                    <th className="pb-4">Promoção</th>
                    <th className="pb-4 text-center">Desconto</th>
                    <th className="pb-4 text-center">Itens Vendidos</th>
                    <th className="pb-4 text-right">Receita Gerada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {(data.promotionsEfficiency || []).length > 0 ? data.promotionsEfficiency.map((p: any, i: number) => (
                    <tr key={i} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-4 font-bold text-zinc-800">{p.name}</td>
                      <td className="py-4 text-center font-medium text-orange-500">{p.discount}%</td>
                      <td className="py-4 text-center font-medium text-zinc-600">{p.sales}</td>
                      <td className="py-4 text-right font-black text-zinc-900">Kz {p.revenue.toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-400 text-sm">Nenhuma promoção registrada ou ativa no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-8 border-zinc-100 rounded-3xl shadow-sm">
            <h4 className="text-lg font-black mb-6">Vendas por Canal (Pagamento)</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.paymentMethods || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(data.paymentMethods || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#f97316', '#3b82f6', '#10b981', '#6366f1', '#f43f5e'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(val: any) => [`Kz ${val.toLocaleString()}`, 'Total']}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <Card className="p-8 border-zinc-100 rounded-3xl shadow-sm">
            <h4 className="text-lg font-black mb-6">Top 10 Produtos (Global)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                    <th className="pb-4">Produto</th>
                    <th className="pb-4 text-center">Qtd Vendida</th>
                    <th className="pb-4 text-right">Receita Gerada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {(data.topProducts || []).map((p: any, i: number) => (
                    <tr key={i} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-4 font-bold text-zinc-800">{p.name}</td>
                      <td className="py-4 text-center font-medium text-zinc-600">{p.quantity}</td>
                      <td className="py-4 text-right font-black text-zinc-900">Kz {p.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* GESTOR DE COMPRAS E ABASTECIMENTO INTELIGENTE (FATU-R AI OPTIMIZER) */}
        <div className="grid grid-cols-1 gap-8 mt-4">
          <Card className="p-8 border-orange-100 bg-zinc-50/20 rounded-3xl shadow-md border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-zinc-100 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-ping"></span>
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-md">Fatu-R Business Intelligence</span>
                </div>
                <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                  <ShoppingCart className="text-orange-500 h-6 w-6" />
                  Planeamento & Abastecimento Inteligente de Stock
                </h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Cálculo automático baseado na velocidade de vendas dos últimos 30 dias para otimizar investimento e evitar excessos de stock ou ruturas.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => {
                    setStockOverrides({});
                    setCostOverrides({});
                    setSuccessToast("Valores redefinidos para os padrões da base de dados!");
                    setTimeout(() => setSuccessToast(null), 3000);
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 bg-white border border-zinc-200 px-3 py-2 rounded-xl hover:shadow-sm transition-all"
                  title="Redefinir overrides"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reset
                </button>
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  disabled={(data.topProducts || []).reduce((acc: number, p: any) => {
                    const vdm = p.quantity / 30;
                    const proj = Math.ceil(vdm * coverageDays);
                    const safety = Math.ceil(proj * (safetyBuffer / 100));
                    const current = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : p.stock;
                    const sug = Math.max(0, (proj + safety) - current);
                    return acc + sug;
                  }, 0) === 0}
                  className="flex items-center gap-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-xl shadow-sm hover:shadow-md disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  Simular Encomenda
                </button>
              </div>
            </div>

            {/* CONTROLS & BUFFER TUNING */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-2xl border border-zinc-200">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Dias de Cobertura Desejados</label>
                <div className="grid grid-cols-4 gap-1 p-0.5 bg-zinc-100 rounded-lg">
                  {[7, 15, 30, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCoverageDays(d)}
                      className={cn(
                        "text-xs font-bold py-1.5 rounded-md transition-all",
                        coverageDays === d 
                          ? "bg-white text-zinc-900 shadow-sm" 
                          : "text-zinc-500 hover:text-zinc-800"
                      )}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">Tempo que a compra irá cobrir.</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-zinc-200">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Margem de Segurança: {safetyBuffer}%</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="5" 
                  value={safetyBuffer} 
                  onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-400 block mt-0.5">Buffer adicional contra oscilações de venda.</span>
              </div>

              {/* KPI - TOTAL INVESTMENT */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-100">Investimento Estimado</span>
                  <ShoppingCart className="h-4 w-4 text-orange-200" />
                </div>
                <h4 className="text-xl font-black mt-2">
                  Kz {((data.topProducts || []).reduce((acc: number, p: any) => {
                    const vdm = p.quantity / 30;
                    const proj = Math.ceil(vdm * coverageDays);
                    const safety = Math.ceil(proj * (safetyBuffer / 100));
                    const current = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : p.stock;
                    const sug = Math.max(0, (proj + safety) - current);
                    const cost = costOverrides[p.id] !== undefined ? costOverrides[p.id] : p.cost;
                    return acc + (sug * cost);
                  }, 0)).toLocaleString()}
                </h4>
                <p className="text-[10px] text-orange-100 mt-1">Para repor níveis saudáveis.</p>
              </div>

              {/* KPI - SAVED CAPITAL */}
              <div className="bg-white p-4 rounded-2xl border border-zinc-200">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Capital Protegido</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <h4 className="text-xl font-black mt-2 text-zinc-800">
                  Kz {((data.topProducts || []).reduce((acc: number, p: any) => {
                    const vdm = p.quantity / 30;
                    const proj = Math.ceil(vdm * coverageDays);
                    const safety = Math.ceil(proj * (safetyBuffer / 100));
                    const target = proj + safety;
                    const current = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : p.stock;
                    const cost = costOverrides[p.id] !== undefined ? costOverrides[p.id] : p.cost;
                    // Capital saved by avoiding buying overstocked products
                    if (current > target) {
                      return acc + ((current - target) * cost);
                    }
                    return acc;
                  }, 0)).toLocaleString()}
                </h4>
                <p className="text-[10px] text-zinc-400 mt-1">Poupado ao evitar sobrestock inútil.</p>
              </div>
            </div>

            {/* MAIN STOCK ANALYSIS TABLE */}
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider bg-zinc-50/50 border-b border-zinc-100">
                      <th className="p-4">Produto & Classe ABC</th>
                      <th className="p-4 text-center">Vendas (30d)</th>
                      <th className="p-4 text-center">Venda Média Diária</th>
                      <th className="p-4 text-center bg-zinc-50/20">Stock Atual (Editável)</th>
                      <th className="p-4 text-center">Procura Projetada</th>
                      <th className="p-4 text-center">Custo Unit. (Editável)</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Sugestão de Compra</th>
                      <th className="p-4 text-right">Custo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {(data.topProducts || []).map((p: any, index: number) => {
                      const vdm = p.quantity / 30;
                      const proj = Math.ceil(vdm * coverageDays);
                      const safety = Math.ceil(proj * (safetyBuffer / 100));
                      const target = proj + safety;
                      const current = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : p.stock;
                      const sug = Math.max(0, target - current);
                      const cost = costOverrides[p.id] !== undefined ? costOverrides[p.id] : p.cost;
                      const totalCost = sug * cost;

                      // ABC Classification based on rank (sorted by sales revenue)
                      let abcClass = "C";
                      let abcColor = "text-emerald-700 bg-emerald-50 border-emerald-100";
                      let abcLabel = "Prioridade Baixa (Sob Pedido)";
                      if (index < 3) {
                        abcClass = "A";
                        abcColor = "text-rose-700 bg-rose-50 border-rose-100";
                        abcLabel = "Prioridade Alta (Foco Máximo)";
                      } else if (index < 7) {
                        abcClass = "B";
                        abcColor = "text-amber-700 bg-amber-50 border-amber-100";
                        abcLabel = "Prioridade Média (Acompanhar)";
                      }

                      // Status determination
                      let statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-100";
                      let statusText = "Equilibrado";
                      if (sug > 0) {
                        if (current <= safety * 0.5) {
                          statusBadge = "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
                          statusText = "Rutura Crítica";
                        } else {
                          statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                          statusText = "Stock Baixo";
                        }
                      } else if (current > target * 1.5) {
                        statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
                        statusText = "Excesso de Stock";
                      }

                      return (
                        <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors group">
                          {/* PRODUCT & ABC */}
                          <td className="p-4">
                            <div className="font-bold text-zinc-800">{p.name}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider", abcColor)} title={abcLabel}>
                                Classe {abcClass}
                              </span>
                              <span className="text-[10px] text-zinc-400 truncate max-w-[130px]">{abcLabel}</span>
                            </div>
                          </td>

                          {/* 30D SALES */}
                          <td className="p-4 text-center font-semibold text-zinc-700">{p.quantity} un</td>

                          {/* VDM */}
                          <td className="p-4 text-center font-medium text-zinc-500">
                            {vdm.toFixed(2)} / dia
                          </td>

                          {/* EDITABLE CURRENT STOCK */}
                          <td className="p-4 bg-zinc-50/20 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input 
                                type="number" 
                                min="0" 
                                value={current}
                                onChange={(e) => setStockOverrides(prev => ({ ...prev, [p.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                className="w-16 text-center text-xs font-bold py-1 border border-zinc-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                              />
                              <span className="text-[10px] text-zinc-400">un</span>
                            </div>
                            <span className="text-[9px] text-zinc-400 block mt-0.5">Original: {p.stock}</span>
                          </td>

                          {/* DEMAND FORECAST */}
                          <td className="p-4 text-center font-medium text-zinc-600">
                            <div>{proj} un</div>
                            <div className="text-[9px] text-zinc-400">Segurança: +{safety}</div>
                          </td>

                          {/* EDITABLE COST PRICE */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-[10px] text-zinc-400">Kz</span>
                              <input 
                                type="number" 
                                min="0" 
                                value={cost}
                                onChange={(e) => setCostOverrides(prev => ({ ...prev, [p.id]: Math.max(0, parseFloat(e.target.value) || 0) }))}
                                className="w-20 text-center text-xs font-bold py-1 border border-zinc-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                              />
                            </div>
                            <span className="text-[9px] text-zinc-400 block mt-0.5">Original: Kz {p.cost.toLocaleString()}</span>
                          </td>

                          {/* STATUS */}
                          <td className="p-4 text-center">
                            <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full border", statusBadge)}>
                              {statusText}
                            </span>
                          </td>

                          {/* SUGGESTED PROCUREMENT QUANTITY */}
                          <td className="p-4 text-right">
                            {sug > 0 ? (
                              <div className="text-orange-600 font-extrabold flex items-center justify-end gap-1 text-sm">
                                <ArrowRight className="h-3 w-3 text-orange-400" />
                                Comprar {sug} un
                              </div>
                            ) : (
                              <div className="text-zinc-400 font-bold text-xs flex items-center justify-end gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                0 (Não Comprar)
                              </div>
                            )}
                          </td>

                          {/* TOTAL ESTIMATED COST */}
                          <td className="p-4 text-right font-black text-zinc-950">
                            {sug > 0 ? `Kz ${totalCost.toLocaleString()}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* STOCK DECISION RECOMMENDATION NOTE */}
            <div className="mt-4 bg-orange-50/50 border border-orange-100 rounded-2xl p-4 flex gap-3 text-xs text-orange-800">
              <HelpCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Como esta calculadora inteligente ajuda o seu negócio?</p>
                <ul className="list-disc pl-4 space-y-1 text-orange-700/90">
                  <li><strong>Evitar Compra Inútil (Classe C):</strong> Produtos com baixo volume de vendas não exigem stock de cobertura elevado. Compre apenas sob encomenda.</li>
                  <li><strong>Concentrar Investimento (Classe A):</strong> O seu capital deve ser aplicado prioritariamente nos produtos Classe A, que geram o maior volume financeiro e têm maior velocidade de saída.</li>
                  <li><strong>Sintonia de Caixa:</strong> Se o seu stock atual de um produto já for maior que a Procura Recomendada para os próximos {coverageDays} dias, a sugestão de compra é zerada automaticamente para proteger a liquidez da sua empresa.</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* REPLENISHMENT / SUPPLIER ORDER SIMULATION MODAL */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-zinc-100 animate-scale-up">
              
              {/* MODAL HEADER */}
              <div className="bg-zinc-900 text-white p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 p-2.5 rounded-xl">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Fatu-R AI Restock Optimizer</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Nota de Encomenda & Proposta de Abastecimento</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPurchaseModal(false)}
                  className="text-zinc-400 hover:text-white transition-colors text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <div className="mb-6 flex justify-between border-b border-zinc-100 pb-4 text-xs text-zinc-500">
                  <div>
                    <span className="font-bold text-zinc-700 block mb-0.5">ESTABELECIMENTO</span>
                    Sede Global Fatu-R
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-zinc-700 block mb-0.5">DATA DO DOCUMENTO</span>
                    {new Date().toLocaleDateString('pt-PT')}
                  </div>
                </div>

                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Lista de Artigos Necessários para {coverageDays} dias</h4>
                
                <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-50 font-bold text-zinc-500 border-b border-zinc-200">
                        <th className="p-3">Artigo</th>
                        <th className="p-3 text-center">Stock Atual</th>
                        <th className="p-3 text-center">Qtd Encomenda</th>
                        <th className="p-3 text-right">Custo Unit.</th>
                        <th className="p-3 text-right">Total Est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                      {(data.topProducts || []).filter((p: any) => {
                        const vdm = p.quantity / 30;
                        const target = Math.ceil(vdm * coverageDays) + Math.ceil(Math.ceil(vdm * coverageDays) * (safetyBuffer / 100));
                        const current = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : p.stock;
                        return Math.max(0, target - current) > 0;
                      }).map((p: any) => {
                        const vdm = p.quantity / 30;
                        const proj = Math.ceil(vdm * coverageDays);
                        const target = proj + Math.ceil(proj * (safetyBuffer / 100));
                        const current = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : p.stock;
                        const sug = target - current;
                        const cost = costOverrides[p.id] !== undefined ? costOverrides[p.id] : p.cost;

                        return (
                          <tr key={p.id} className="hover:bg-zinc-50/50">
                            <td className="p-3 font-bold text-zinc-900">{p.name}</td>
                            <td className="p-3 text-center">{current} un</td>
                            <td className="p-3 text-center text-orange-600 font-extrabold">{sug} un</td>
                            <td className="p-3 text-right">Kz {cost.toLocaleString()}</td>
                            <td className="p-3 text-right font-black text-zinc-900">Kz {(sug * cost).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* SUMMARY DETAILS */}
                <div className="mt-6 bg-zinc-50 rounded-2xl p-4 flex flex-col gap-2 text-xs border border-zinc-100">
                  <div className="flex justify-between font-bold text-zinc-600">
                    <span>Subtotal de Artigos:</span>
                    <span>
                      {(data.topProducts || []).reduce((acc: number, p: any) => {
                        const vdm = p.quantity / 30;
                        const current = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : p.stock;
                        const target = Math.ceil(vdm * coverageDays) + Math.ceil(Math.ceil(vdm * coverageDays) * (safetyBuffer / 100));
                        return acc + Math.max(0, target - current);
                      }, 0)} unidades
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-zinc-600">
                    <span>Impostos Estimados (IVA 0% auto):</span>
                    <span>Kz 0</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-zinc-900 border-t border-zinc-200/80 pt-2 mt-1">
                    <span>CUSTO TOTAL DE AQUISIÇÃO:</span>
                    <span className="text-orange-600">
                      Kz {((data.topProducts || []).reduce((acc: number, p: any) => {
                        const vdm = p.quantity / 30;
                        const current = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : p.stock;
                        const target = Math.ceil(vdm * coverageDays) + Math.ceil(Math.ceil(vdm * coverageDays) * (safetyBuffer / 100));
                        const sug = Math.max(0, target - current);
                        const cost = costOverrides[p.id] !== undefined ? costOverrides[p.id] : p.cost;
                        return acc + (sug * cost);
                      }, 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* DATABASE EFFECT INFO */}
                <div className="mt-4 bg-blue-50 text-blue-800 border border-blue-100 rounded-xl p-3 flex gap-2 text-[11px]">
                  <ShieldAlert className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p>
                    <strong>Aviso de Sistema:</strong> Ao confirmar esta operação, o Fatu-R atualizará diretamente os níveis de stock físico no banco de dados e gerará faturas de compras (despesas de fornecedor) para cada produto, de modo a ajustar os seus relatórios financeiros globais automaticamente.
                  </p>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="bg-zinc-50 p-6 flex justify-end gap-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl transition-all"
                  disabled={isRestocking}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsRestocking(true);
                    try {
                      const itemsToReplenish = (data.topProducts || []).map((p: any) => {
                        const vdm = p.quantity / 30;
                        const target = Math.ceil(vdm * coverageDays) + Math.ceil(Math.ceil(vdm * coverageDays) * (safetyBuffer / 100));
                        const current = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : p.stock;
                        const sug = Math.max(0, target - current);
                        const cost = costOverrides[p.id] !== undefined ? costOverrides[p.id] : p.cost;
                        return { productId: p.id, quantity: sug, cost };
                      }).filter(item => item.quantity > 0);

                      if (itemsToReplenish.length === 0) {
                        setSuccessToast("Nenhum produto necessita de abastecimento.");
                        setShowPurchaseModal(false);
                        return;
                      }

                      const res = await fetch('/api/owner/bulk-replenish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items: itemsToReplenish })
                      });
                      
                      if (!res.ok) throw new Error("Erro de rede ao atualizar");
                      
                      setSuccessToast("Abastecimento realizado! Stocks e Despesas atualizados.");
                      setStockOverrides({});
                      setCostOverrides({});
                      setRefreshCounter(prev => prev + 1);
                      setShowPurchaseModal(false);
                    } catch (err) {
                      console.error(err);
                      alert("Erro ao reabastecer produtos. Tente novamente.");
                    } finally {
                      setIsRestocking(false);
                    }
                  }}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 font-bold text-xs text-white rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
                  disabled={isRestocking}
                >
                  {isRestocking ? (
                    <>
                      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      A Processar...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirmar Reabastecimento
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST SUCCESS NOTIFICATION */}
        {successToast && (
          <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in border border-zinc-800">
            <div className="bg-emerald-500 p-1 rounded-full text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-black">{successToast}</span>
          </div>
        )}
      </div>
    </div>
  );
};
