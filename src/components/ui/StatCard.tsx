import { cn } from '../../lib/utils';
import { Sparkles } from 'lucide-react';

export const StatCard = ({ label, value, icon: Icon, trend, color = "blue" }: { label: string, value: string | number, icon: any, trend?: string, color?: string }) => (
  <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
        color === 'blue' ? "bg-blue-50 text-blue-600" :
        color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
        color === 'amber' ? "bg-amber-50 text-amber-600" :
        "bg-rose-50 text-rose-600"
      )}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className={cn(
          "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
          trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
    <div className="flex items-baseline gap-2">
      <h3 className="text-2xl font-black">{value}</h3>
      {color === 'emerald' && <Sparkles size={14} className="text-emerald-500 animate-pulse" />}
    </div>
  </div>
);
