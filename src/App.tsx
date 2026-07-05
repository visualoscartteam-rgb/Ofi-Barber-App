import React, { useState, useEffect } from 'react';
import ClientAuth from './ClientAuth';
import Dashboard from './Dashboard';
import BarberDashboard from './BarberDashboard';
import AdminDashboard from './AdminDashboard';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <ClientAuth onLogin={(u) => setUser(u)} />;
  }

  const role = user.user_metadata?.role || 'client';

  const handleLogout = () => {
    supabase.auth.signOut();
    setUser(null);
  };

  if (role === 'barber' || role === 'admin') {
    return <BarberDashboard onLogout={handleLogout} user={user} isAdmin={role === 'admin'} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App;
