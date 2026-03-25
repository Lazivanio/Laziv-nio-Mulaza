import React, { useState, useEffect, FormEvent } from 'react';
import { 
  ShieldCheck, 
  Clock 
} from 'lucide-react';
import { User } from '../types';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div {...props} className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

export const OwnerSettings = ({ user }: { user: User }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: '',
    nif: '',
    address: '',
    company_name: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/clients/${user.id}/details`)
      .then(res => res.json())
      .then(data => {
        setFormData({
          ...formData,
          name: data.client.name,
          email: data.client.email,
          phone: data.client.phone || '',
          nif: data.client.nif || '',
          address: data.client.address || '',
          company_name: data.client.company_name || ''
        });
        setIsLoading(false);
      });
  }, [user.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert("As senhas não coincidem");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert("Perfil actualizado com sucesso!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-12 text-center text-zinc-500">Carregando configurações...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Configurações da Conta</h2>
        <p className="text-zinc-500">Gerencie seus dados de proprietário e preferências do sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-6 border-b border-zinc-100">
              <h3 className="font-bold">Informações Pessoais</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Telefone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">NIF</label>
                  <input 
                    type="text" 
                    value={formData.nif}
                    onChange={e => setFormData({...formData, nif: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome da Empresa</label>
                  <input 
                    type="text" 
                    value={formData.company_name}
                    onChange={e => setFormData({...formData, company_name: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Endereço Fiscal</label>
                  <textarea 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all h-24 resize-none"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100">
                <h4 className="font-bold text-sm mb-4">Alterar Palavra-passe</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nova Palavra-passe</label>
                    <input 
                      type="password" 
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                      placeholder="Deixe em branco para manter"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Confirmar Palavra-passe</label>
                    <input 
                      type="password" 
                      value={formData.confirmPassword}
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                      placeholder="Confirme a nova senha"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-black text-white">
            <h3 className="font-bold mb-4">Estado da Subscrição</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Plano Actual</span>
                <span className="font-bold bg-white/10 px-2 py-1 rounded text-xs uppercase">Profissional</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Expira em</span>
                <span className="font-bold">31/12/2026</span>
              </div>
              <div className="pt-4 border-t border-white/10">
                <button className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-100 transition-all">
                  Renovar Subscrição
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold mb-4">Segurança</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <ShieldCheck size={18} className="text-emerald-500" />
                Autenticação de dois factores activa
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <Clock size={18} className="text-zinc-400" />
                Último acesso: Hoje às 14:20
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
