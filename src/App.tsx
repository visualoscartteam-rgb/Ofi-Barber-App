import React, { useState, useEffect } from 'react';
import ClientAuth from './ClientAuth';
import Dashboard from './Dashboard';
import BarberDashboard from './BarberDashboard';
import AdminDashboard from './AdminDashboard';
import { supabase } from './lib/supabase';

function App() {
  const [user, setUser] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // One-time data wipe to clean all legacy mock data
    if (!localStorage.getItem('cb_data_wiped_v3')) {
      localStorage.removeItem('globalAppointments');
      localStorage.removeItem('globalPermisos');
      localStorage.removeItem('adminProducts');
      localStorage.removeItem('barberSales');
      localStorage.removeItem('lunchExceptions');
      localStorage.removeItem('adminPromos');
      localStorage.removeItem('adminServices');
      localStorage.setItem('cb_data_wiped_v3', 'true');
    }

    // Clean any Supabase auth tokens from localStorage to force sessionStorage isolation
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });

    // Start minimum display timer for the loader (1.8 seconds)
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1800);

    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        // No user logged in, so there's no dashboard to load. Set ready immediately.
        setDashboardReady(true);
      }
      setSessionLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        setDashboardReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const renderLoader = () => (
    <div className="w-full h-full min-h-screen bg-[#060608] flex flex-col items-center justify-center overflow-hidden relative">
      {/* Glow effect in background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex flex-col items-center select-none z-10">
        {/* Circular Loader Container - sized to match the video container exactly */}
        <div className="relative w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
          
          {/* Outer Slow Counter-Clockwise Dash Ring - now set relative to the video container */}
          <div className="absolute -inset-4 rounded-full border border-dashed border-teal-500/10 animate-[spin_15s_linear_infinite_reverse]" />
          
          {/* Middle Quick Clockwise Ring - now positioned very close to the video container */}
          <div className="absolute -inset-1.5 rounded-full border border-transparent border-t-[#35ECDE] animate-[spin_2s_linear_infinite]" />
          
          {/* Inner Pulsing Soft Glow & Thin Teal Border */}
          <div className="absolute -inset-0.5 rounded-full bg-teal-300/5 blur-[4px] animate-pulse" />
          <div className="absolute -inset-0.5 rounded-full border border-teal-500/20" />
          
          {/* Center Video Container - dark teal border and slightly increased scale to eliminate subpixel rounding gaps */}
          <div className="w-full h-full rounded-full overflow-hidden border border-teal-900/30 bg-[#09090b] shadow-2xl flex items-center justify-center relative">
            <video 
              src="/LOADER.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover scale-[1.05]"
            />
          </div>
        </div>
        
        {/* Loading text and indicator */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <span className="text-[10px] md:text-xs font-semibold tracking-[0.25em] text-zinc-400 uppercase animate-pulse">
            Cargando recursos
          </span>
          <div className="w-12 h-[2px] bg-zinc-800/80 rounded-full overflow-hidden relative mt-1">
            <div className="absolute top-0 bottom-0 left-0 bg-[#35ECDE] rounded-full animate-progress-slide" />
          </div>
        </div>
      </div>
    </div>
  );

  if (sessionLoading) {
    return renderLoader();
  }

  if (!user) {
    return (
      <ClientAuth 
        onLogin={(u) => {
          // Restart loader timer and state when logging in
          setDashboardReady(false);
          setMinTimeElapsed(false);
          setTimeout(() => {
            setMinTimeElapsed(true);
          }, 1800);
          setUser(u);
        }} 
      />
    );
  }

  const role = user.user_metadata?.role || 'client';

  const handleLogout = () => {
    supabase.auth.signOut();
    setUser(null);
    setDashboardReady(false);
    setMinTimeElapsed(false);
  };

  const showLoader = !dashboardReady || !minTimeElapsed;

  return (
    <div className="relative min-h-screen">
      {/* Loader Overlay */}
      {showLoader && (
        <div className="fixed inset-0 z-50">
          {renderLoader()}
        </div>
      )}

      {/* Main Dashboards - Mounted behind the loader, ready to be shown instantly */}
      {role === 'barber' || role === 'admin' ? (
        <BarberDashboard 
          onLogout={handleLogout} 
          user={user} 
          isAdmin={role === 'admin'} 
          onReady={() => setDashboardReady(true)} 
        />
      ) : (
        <Dashboard 
          onLogout={handleLogout} 
          onReady={() => setDashboardReady(true)} 
        />
      )}
    </div>
  );
}

export default App;
