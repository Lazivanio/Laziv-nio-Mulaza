import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  PieChart as PieChartIcon 
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
  const reportRef = useRef<HTMLDivElement>(null);

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
  }, [user.id]);

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
    
    // Write file
    XLSX.writeFile(wb, 'Relatorio_Global.xlsx');
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
      </div>
    </div>
  );
};
