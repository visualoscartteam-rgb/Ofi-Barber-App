import React, { useState } from 'react';
import { 
  LogOut, Users, DollarSign, Calendar, TrendingUp, Scissors, Check, Package,
  Settings, ChevronRight
} from 'lucide-react';

export default function AdminDashboard({ onLogout, user }: { onLogout: () => void, user: any }) {
  const [activeNav, setActiveNav] = useState('resumen');

  return (
    <div className="min-h-screen bg-[#09090b] text-white pb-10 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/5 blur-[130px] rounded-full pointer-events-none z-0" />

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header / Topbar */}
        <div className="flex items-center justify-between p-5 pt-8 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] flex-shrink-0">
              <span className="text-purple-400 font-bold text-xl uppercase tracking-widest">
                {user?.user_metadata?.full_name?.charAt(0) || 'A'}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Administrador</h1>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest font-bold">
                Control Total
              </p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors group"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors" />
          </button>
        </div>

        {/* Navigation Bar */}
        <div className="px-4 mb-6 animate-in zoom-in-95 duration-500 delay-100">
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 border-t-white/20 rounded-full p-2 flex justify-between items-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            {[
              { id: 'resumen', icon: TrendingUp, label: 'Resumen' },
              { id: 'barberos', icon: Users, label: 'Barberos' },
              { id: 'inventario', icon: Package, label: 'Inventario' },
              { id: 'finanzas', icon: DollarSign, label: 'Finanzas' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`relative p-3 rounded-full flex items-center justify-center transition-all duration-300 flex-1 ${isActive ? 'bg-white/15 shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)] border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Content area */}
        <div className="flex-1 px-4">
          
          {/* Section Header */}
          <div className="flex items-center gap-2 mb-6 px-1 animate-in fade-in duration-300">
             {activeNav === 'resumen' && <><TrendingUp className="w-5 h-5 text-purple-400" /><h2 className="text-xl font-bold text-white tracking-tight">Vista General</h2></>}
             {activeNav === 'barberos' && <><Users className="w-5 h-5 text-purple-400" /><h2 className="text-xl font-bold text-white tracking-tight">Gestión de Barberos</h2></>}
             {activeNav === 'inventario' && <><Package className="w-5 h-5 text-purple-400" /><h2 className="text-xl font-bold text-white tracking-tight">Inventario Global</h2></>}
             {activeNav === 'finanzas' && <><DollarSign className="w-5 h-5 text-purple-400" /><h2 className="text-xl font-bold text-white tracking-tight">Control Financiero</h2></>}
          </div>

          {activeNav === 'resumen' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/10 backdrop-blur-xl border border-purple-500/20 rounded-[2rem] p-6 mb-6 shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 blur-2xl rounded-full pointer-events-none"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Ingresos Totales (Mes)</p>
                <h3 className="text-4xl font-black text-white drop-shadow-md mb-2 relative z-10">₡0</h3>
                <p className="text-xs text-emerald-400 font-bold flex items-center gap-1 relative z-10">
                   <TrendingUp className="w-3 h-3" /> +0% vs mes pasado
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                 <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-lg">
                   <Scissors className="w-6 h-6 text-slate-400 mb-2" />
                   <h4 className="text-2xl font-black text-white">0</h4>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Cortes Hoy</p>
                 </div>
                 <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-lg">
                   <Users className="w-6 h-6 text-slate-400 mb-2" />
                   <h4 className="text-2xl font-black text-white">0</h4>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Clientes Nuevos</p>
                 </div>
              </div>
            </div>
          )}

          {activeNav === 'barberos' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <p className="text-slate-400 text-sm text-center mt-10">Módulo de Barberos en desarrollo...</p>
            </div>
          )}

          {activeNav === 'inventario' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <p className="text-slate-400 text-sm text-center mt-10">Módulo de Inventario en desarrollo...</p>
            </div>
          )}

          {activeNav === 'finanzas' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <p className="text-slate-400 text-sm text-center mt-10">Módulo de Finanzas en desarrollo...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
