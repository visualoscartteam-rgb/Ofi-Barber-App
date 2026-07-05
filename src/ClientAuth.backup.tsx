import React, { useState } from 'react';
import { Phone, Lock, User, Calendar, ArrowRight, Sparkles, X, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

function ClientAuth({ onLogin }: { onLogin: (user: any) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // State for forms
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const cleanPhone = phone.replace(/\s/g, '');
    const fakeEmail = `cliente506${cleanPhone}@carlosbarbero.app`;

    // Special case for barber and admin login test
    let loginEmail = fakeEmail;
    if (phone === '00000000') {
      loginEmail = 'barbero@carlosbarbero.app';
    } else if (phone === '99998888') {
      loginEmail = 'admin2@carlosbarbero.app';
    }

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });
      setIsLoading(false);
      
      if (error) {
        alert("Error al iniciar sesión: " + error.message);
      } else if (data.user) {
        onLogin(data.user);
      }
    } else {
      // Registrar
      if (!name || !lastName || !dob || !phone || !password) {
        alert("Por favor llena todos los campos para crear tu cuenta.");
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: fakeEmail,
        password: password,
        options: {
          data: {
            full_name: `${name} ${lastName}`,
            phone: `+506${cleanPhone}`,
            dob: dob
          }
        }
      });
      setIsLoading(false);

      if (error) {
        alert("Error al crear cuenta: " + error.message);
      } else {
        alert("¡Cuenta creada con éxito! Ahora puedes iniciar sesión.");
        setIsLogin(true);
        setPassword('');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden selection:bg-blue-500/30 font-sans p-4">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Main Glass Panel */}
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-[2.5rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden z-10 transition-all duration-500">
        
        {/* Top Toggle */}
        <div className="flex bg-black/40 rounded-2xl p-1 mb-8 relative border border-white/5">
           <div 
             className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white/10 rounded-xl shadow-sm border border-white/10 transition-transform duration-300 ease-out ${isLogin ? 'translate-x-0' : 'translate-x-[calc(100%+8px)]'}`}
           />
           <button 
             type="button"
             onClick={() => setIsLogin(true)}
             className={`flex-1 py-3 text-sm font-medium transition-colors relative z-10 ${isLogin ? 'text-white' : 'text-slate-400 hover:text-white'}`}
           >
             Sign In
           </button>
           <button 
             type="button"
             onClick={() => setIsLogin(false)}
             className={`flex-1 py-3 text-sm font-medium transition-colors relative z-10 ${!isLogin ? 'text-white' : 'text-slate-400 hover:text-white'}`}
           >
             Sign Up
           </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <Sparkles className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            {isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            {isLogin ? 'Ingresa tus datos para continuar' : 'Únete para agendar citas y ganar recompensas'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Sign Up Fields (Animated Height/Opacity) */}
          <div className={`space-y-4 overflow-hidden transition-all duration-500 ease-in-out ${isLogin ? 'max-h-0 opacity-0' : 'max-h-[400px] opacity-100'}`}>
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">Nombre</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">Apellido</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Pérez"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">Fecha de Nacimiento</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Common Fields */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">Teléfono</label>
            <div className="relative flex items-center bg-black/40 border border-white/5 rounded-2xl focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20 transition-all">
              <Phone className="absolute left-4 w-5 h-5 text-slate-500" />
              <div className="pl-12 pr-2 text-sm text-slate-400 border-r border-white/10 font-medium py-4">
                +506
              </div>
              <input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="1234 5678"
                className="w-full bg-transparent py-4 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Contraseña</label>
              {isLogin && (
                <button 
                  type="button" 
                  onClick={() => setShowModal(true)} 
                  className="text-xs text-white hover:text-slate-300 transition-colors underline underline-offset-2"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-white/5 backdrop-blur-xl border border-white/10 border-t-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-white hover:bg-white/10 rounded-full py-4 text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {isLogin ? 'Ingresar' : 'Crear cuenta'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

      </div>

      {/* Modal Olvidaste Contraseña */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <button 
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                <Lock className="text-white w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                ¿Olvidaste tu contraseña?
              </h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Restaurarla es sencillo: solo comunícate con Carlos Millán al 6452 3832.
              </p>
              <a 
                href="https://wa.me/50664523832" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Ir a WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ClientAuth;
