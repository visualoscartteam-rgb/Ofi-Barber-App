import React, { useState, useEffect } from 'react';
import { Phone, Lock, User, Calendar, ArrowRight, X, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

function ClientAuth({ onLogin }: { onLogin: (user: any) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/background.jpg');

  useEffect(() => {
    const loadLogo = async () => {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'app_logo')
        .maybeSingle();
      if (data && data.value) {
        setLogoUrl((data.value as any).url);
      }
    };
    loadLogo();
  }, []);

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

    if (isLogin) {
      let loginEmail = fakeEmail;
      
      // Hardcoded mappings for the test accounts
      if (cleanPhone === '99998888') {
        loginEmail = 'admin2@carlosbarbero.app';
      } else if (cleanPhone === '00000000') {
        loginEmail = 'barbero@carlosbarbero.app';
      } else if (cleanPhone === '11111111') {
        loginEmail = 'cliente@carlosbarbero.app';
      } else {
        try {
          const phoneWithPrefix = `+506${cleanPhone}`;
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .or(`phone.eq.${cleanPhone},phone.eq.${phoneWithPrefix}`)
            .maybeSingle();
            
          if (profile) {
            if (profile.role === 'admin') {
              loginEmail = 'admin2@carlosbarbero.app';
            } else if (profile.role === 'barber' || profile.role === 'barbero') {
              loginEmail = `barbero506${cleanPhone}@carlosbarbero.app`;
            }
          }
        } catch (err) {
          console.error("Error looking up profile role:", err);
        }
      }

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

      // Check if phone number is already registered in profiles
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle();
          
        if (existingProfile) {
          alert("Ya existe un usuario con este número de celular.");
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error checking existing phone:", err);
      }
      
      try {
        const { data, error } = await supabase.auth.signUp({
          email: fakeEmail,
          password: password,
          options: {
            data: {
              role: 'client',
              full_name: `${name} ${lastName}`,
              phone: cleanPhone,
              dob: dob
            }
          }
        });
        
        setIsLoading(false);
        if (error) {
          alert("Error al crear cuenta: " + error.message);
        } else if (data.user) {
          alert("¡Cuenta creada con éxito! Ahora puedes iniciar sesión.");
          setIsLogin(true);
          setPassword('');
        }
      } catch (err: any) {
        setIsLoading(false);
        alert("Error de conexión: " + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070709] relative overflow-hidden font-sans p-4">

      {/* Dynamic Immersive Background Spheres */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center z-0">
        {/* Sphere 1 - Slow orbit clockwise */}
        <div className="absolute w-[800px] h-[800px] animate-[spin_25s_linear_infinite]">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-teal-500/20 rounded-full blur-[120px]" />
        </div>
        
        {/* Sphere 2 - Slower orbit counter-clockwise */}
        <div className="absolute w-[1000px] h-[1000px] animate-[spin_35s_linear_infinite_reverse]">
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px]" />
        </div>

        {/* Sphere 3 - Floating and orbiting alternate */}
        <div className="absolute w-[600px] h-[600px] animate-[spin_40s_ease-in-out_infinite_alternate]">
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-teal-300/10 rounded-full blur-[100px]" />
        </div>
      </div>

      {/* Main Panel - Glassmorphism Card with Image Background */}
      <div className="relative w-full max-w-md rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] z-10 overflow-hidden border border-[#2a2a2c]/50">
        
        {/* Card Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/background.jpg")' }}
        />
        
        {/* Glassmorphism Overlay (Blur + Dark tint) */}
        <div className="absolute inset-0 bg-[#1a1a1c]/70 backdrop-blur-2xl" />

        {/* Card Content */}
        <div className="relative z-10 p-8 sm:p-10">

          {/* Top Toggle - Subtle dark tabs */}
          <div className="flex bg-black/40 rounded-2xl p-1.5 mb-10 border border-white/[0.05]">
             <button 
               type="button"
               onClick={() => setIsLogin(true)}
               className={`flex-1 py-3 text-sm font-medium transition-all duration-300 rounded-xl ${isLogin ? 'bg-white/10 text-teal-400 border border-teal-500/30 shadow-[0_4px_12px_rgba(53,236,222,0.1)] backdrop-blur-md' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
             >
               Sign In
             </button>
             <button 
               type="button"
               onClick={() => setIsLogin(false)}
               className={`flex-1 py-3 text-sm font-medium transition-all duration-300 rounded-xl ${!isLogin ? 'bg-white/10 text-teal-400 border border-teal-500/30 shadow-[0_4px_12px_rgba(53,236,222,0.1)] backdrop-blur-md' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
             >
               Sign Up
             </button>
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            {/* Small circular logo, now also using the background image or a logo */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full overflow-hidden border-2 border-white/10 shadow-lg bg-black/20 backdrop-blur-md">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <h1 className="text-2xl font-medium text-white tracking-tight mb-2 drop-shadow-md">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-sm text-slate-300 drop-shadow-sm">
              {isLogin ? 'Enter your details to continue' : 'Join us to book appointments'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Sign Up Fields */}
            <div className={`space-y-4 overflow-hidden transition-all duration-500 ${isLogin ? 'max-h-0 opacity-0' : 'max-h-[400px] opacity-100'}`}>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First name"
                    className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:bg-black/60 transition-colors backdrop-blur-sm"
                  />
                </div>
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-3.5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:bg-black/60 transition-colors backdrop-blur-sm"
                  />
                </div>
              </div>

              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-teal-500/50 focus:bg-black/60 transition-colors backdrop-blur-sm [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Common Fields */}
            <div className="relative flex items-center bg-black/40 border border-white/[0.05] rounded-2xl focus-within:border-teal-500/50 focus-within:bg-black/60 transition-colors backdrop-blur-sm">
              <Phone className="absolute left-4 w-4 h-4 text-slate-400" />
              <div className="pl-11 pr-3 text-sm text-slate-400 border-r border-white/10 py-3.5">
                +506
              </div>
              <input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full bg-transparent py-3.5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:bg-black/60 transition-colors backdrop-blur-sm"
                />
              </div>
              {isLogin && (
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(true)} 
                    className="text-[11px] text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-white/5 backdrop-blur-md border border-teal-500/50 text-teal-400 hover:bg-teal-500/10 rounded-2xl py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          {/* Test Users Guide */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Cuentas de Prueba / Test Accounts</h4>
            <div className="space-y-2 text-left">
              <div className="bg-black/30 border border-white/5 rounded-xl p-2.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-300">Cliente Test</p>
                  <p className="text-[10px] text-slate-500">Tel: 1111 1111 • Clave: 123456</p>
                </div>
                <span className="text-[9px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Cliente</span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-xl p-2.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-300">Barbero Test</p>
                  <p className="text-[10px] text-slate-500">Tel: 0000 0000 • Clave: 123456</p>
                </div>
                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Barbero</span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-xl p-2.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-300">Carlos Barbero</p>
                  <p className="text-[10px] text-slate-500">Tel: 9999 8888 • Clave: 123456</p>
                </div>
                <span className="text-[9px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Admin</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-[#1a1a1c]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <button 
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center mt-2">
              <div className="w-12 h-12 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Lock className="text-teal-400 w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Restaurar Contraseña
              </h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Comunícate con soporte al <span className="text-white">6452 3832</span> para recibir ayuda.
              </p>
              <a 
                href="https://wa.me/50664523832" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-black/40 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10 rounded-xl py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ClientAuth;
