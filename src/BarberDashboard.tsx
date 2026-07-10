import React, { useState, useEffect } from 'react';
import { 
  LogOut, Calendar as CalendarIcon, Clock, Scissors, X, Check,
  AlertCircle, CalendarOff, ArrowRight, User, ChevronRight, Cake, Info, Grid, ShoppingBag, ChevronLeft,
  TrendingUp, BarChart2, Receipt, Award, Camera, Package, DollarSign, Users,
  Settings, Plus, Trash2, Edit2, Save, Gift, Star, Image as ImageIcon, Upload
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const secondarySupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Helper to resize and compress images using HTML5 Canvas
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string || '');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Helper to convert 12-hour format string (e.g., '10:00 AM', '02:30 PM') to minutes from midnight (0 - 1439)
const parseTimeToMinutes = (timeStr: string): number => {
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.endsWith('PM');
  const isAM = clean.endsWith('AM');
  const timePart = clean.replace('AM', '').replace('PM', '').trim();
  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
};

// Helper to convert 24-hour format string (e.g., '12:00', '13:00') to minutes from midnight
const parse24TimeToMinutes = (timeStr: string): number => {
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  return h * 60 + m;
};
// Helper to determine if a given hour falls inside a lunch window
const isHourInLunch = (hourStr: string, lunchObj: { start: string, end: string }): boolean => {
  try {
    const hMins = parse24TimeToMinutes(hourStr);
    const sMins = parse24TimeToMinutes(lunchObj.start);
    const eMins = parse24TimeToMinutes(lunchObj.end);
    return hMins >= sMins && hMins < eMins;
  } catch (e) {
    return false;
  }
};


// Helper to resolve service name duration in minutes
const getServiceDurationMinutes = (serviceName: string, servicesList: any[]): number => {
  const s = servicesList.find((srv: any) => srv.name.toLowerCase() === serviceName.toLowerCase());
  if (s && s.duration) {
    const minVal = parseInt(s.duration.replace('min', '').trim(), 10);
    if (!isNaN(minVal)) return minVal;
  }
  return 45; // fallback default
};

export default function BarberDashboard({ onLogout, user, isAdmin = false, onReady }: { onLogout: () => void, user: any, isAdmin?: boolean, onReady?: () => void }) {
  const [adminModule, setAdminModule] = useState(isAdmin ? 'citas_globales' : 'mi_barbero');
  const [activeNav, setActiveNav] = useState('agenda');
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Admin Citas Globales State
  const [globalCitasTab, setGlobalCitasTab] = useState<'citas' | 'horarios' | 'permisos'>('citas');
  const [globalBarberFilter, setGlobalBarberFilter] = useState<string>('all');
  const [showPermisos, setShowPermisos] = useState(false);
  const [globalCitasView, setGlobalCitasView] = useState<'week'|'month'>('week');
  const [monthlyCitasFilter, setMonthlyCitasFilter] = useState<'all' | 'pending' | 'completed'>('all');
  
  // Appt state
  const [expandedApptId, setExpandedApptId] = useState<number | null>(null);
  const [cancelingApptId, setCancelingApptId] = useState<number | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [completingApptId, setCompletingApptId] = useState<number | null>(null);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [appliedMilestoneName, setAppliedMilestoneName] = useState<string>('');
  const [giftRewardName, setGiftRewardName] = useState<string>('');  // Physical gift (non-discount reward)

  // Logo & Config States
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=200&h=200&auto=format&fit=crop');

  const [carteleraImages, setCarteleraImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1521484346853-3cbaf92100cb?auto=format&fit=crop&w=1200&q=80'
  ]);

  const [promosList, setPromosList] = useState<any[]>([]);

  const [servicesList, setServicesList] = useState<any[]>([
    { id: 1, name: 'Corte Clásico', price: '₡ 6,000', duration: '30 min' },
    { id: 2, name: 'Corte + Barba', price: '₡ 9,000', duration: '45 min' },
    { id: 3, name: 'Fade / Degradado', price: '₡ 7,000', duration: '40 min' },
    { id: 4, name: 'Perfilado de Barba', price: '₡ 4,000', duration: '20 min' }
  ]);

  const [loyaltyRewards, setLoyaltyRewards] = useState<any>({
    Básico:   { reward1: { type: 'gift', value: 'Premio de bienvenida' }, reward5: { type: 'percent', value: '10' }, reward10: { type: 'percent', value: '100' } },
    Bronce:   { reward5: { type: 'percent', value: '10' }, reward10: { type: 'percent', value: '100' } },
    Plata:    { reward5: { type: 'percent', value: '15' }, reward10: { type: 'percent', value: '100' } },
    Oro:      { reward5: { type: 'percent', value: '20' }, reward10: { type: 'percent', value: '100' } },
    Diamante: { reward5: { type: 'percent', value: '25' }, reward10: { type: 'percent', value: '100' } },
  });

  // Payroll / Nómina & Global Month Filter States
  const [globalMonthDate, setGlobalMonthDate] = useState<Date>(new Date());
  const [activeCollaboratorPayId, setActiveCollaboratorPayId] = useState<string | null>(null);

  // Config Tab State
  const [configTab, setConfigTab] = useState<'logo' | 'cartelera' | 'premios'>('logo');

  // Inventario Tab State
  const [inventarioTab, setInventarioTab] = useState<'productos' | 'servicios' | 'promos'>('productos');

  // Config Inputs
  const [logoInput, setLogoInput] = useState(logoUrl);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoInput, setPromoInput] = useState({
    name: '', regularPrice: '', promoPrice: '', image: '', description: '', expires: '', commission: ''
  });
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceInput, setServiceInput] = useState({
    name: '', price: '', duration: '', commission: '', image: ''
  });

  // Load avatar on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
        if (data?.avatar_url) setProfileImage(data.avatar_url);
      }
    };
    fetchProfile();
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user?.id) {
      try {
        setIsUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update profile table
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;

        setProfileImage(publicUrl);
        alert('Foto de perfil actualizada con éxito.');
      } catch (error: any) {
        console.error('Error uploading image:', error);
        alert('Hubo un error: ' + (error.message || 'Verifica la configuración de tu bucket.'));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - 1);

  const myBarberId = user?.id || '1';

  const [globalAppointments, setGlobalAppointments] = useState<any[]>([]);

  // Load all app configuration and collections from Supabase on mount
  useEffect(() => {
    const loadAppData = async () => {
      // Fire ALL independent queries in parallel — no sequential waterfall
      const [
        { data: users },
        { data: appts },
        { data: clientProfiles },
        { data: appConfigs },
        { data: blocks },
        { data: exceptions },
        { data: permisos },
        { data: productsData },
        { data: salesData },
        { data: services },
        { data: promos },
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('appointments').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, avatar_url, preferences, birthday'),
        supabase.from('app_config').select('key, value').in('key', [
          'barber_schedules', 'barber_lunch_hours', 'app_logo', 'carousel_images', 'loyalty_rewards', 'collaborator_payments'
        ]),
        supabase.from('blocked_hours').select('*'),
        supabase.from('lunch_exceptions').select('*'),
        supabase.from('permisos').select('*'),
        supabase.from('products').select('*').order('name', { ascending: true }),
        supabase.from('sales').select('*, products(name, commission)').order('sale_date', { ascending: false }),
        supabase.from('services').select('*').order('name', { ascending: true }),
        supabase.from('promotions').select('*').eq('active', true),
      ]);

      // Process profiles/users
      if (users) {
        setCustomUsers(users.map(u => ({
          id: u.id,
          name: u.full_name,
          phone: u.phone,
          dob: u.birthday || '',
          role: (u.role === 'barber' || u.role === 'barbero') ? 'barbero' : (u.role === 'client' || u.role === 'cliente') ? 'cliente' : 'admin',
          image: u.avatar_url || null,
          createdAt: u.created_at ? u.created_at.split('T')[0] : ''
        })));
      }

      // Process appointments with client profile data
      const profileMap: Record<string, { photo: string | null, preferences: string, birthday: string | null }> = {};
      (clientProfiles || []).forEach((p: any) => {
        profileMap[p.id] = {
          photo: p.avatar_url || null,
          preferences: p.preferences || 'Sin especificaciones.',
          birthday: p.birthday || null
        };
      });
      if (appts) {
        setGlobalAppointments(appts.map(a => {
          const clientProf = a.client_id ? profileMap[a.client_id] : null;
          return {
            id: a.id,
            barberId: String(a.barber_id || '1'),
            barberName: a.barber_name || 'Barbero',
            client: a.client_name || a.client || 'Cliente',
            clientId: a.client_id,
            clientPhoto: clientProf ? clientProf.photo : null,
            clientPreferences: clientProf ? clientProf.preferences : 'Sin especificaciones.',
            clientBirthday: clientProf ? clientProf.birthday : null,
            service: a.service_name || a.service || 'Servicio',
            time: a.time || a.appointment_time || '',
            date: a.date || a.appointment_date || '',
            status: a.status?.startsWith('Finalizada') ? 'Finalizada' : (a.status || 'Pendiente'),
            rawStatus: a.status || 'Pendiente',
            discount: (() => {
              const match = String(a.status).match(/Loyalty\s+(\d+)%/i);
              return match ? parseInt(match[1], 10) : 0;
            })()
          };
        }));
      }

      // Process all app_config keys from the single batched query
      const configMap: Record<string, any> = {};
      (appConfigs || []).forEach((c: any) => { configMap[c.key] = c.value; });
      if (configMap['barber_schedules']) setGlobalBarberSchedules(configMap['barber_schedules']);
      if (configMap['barber_lunch_hours']) setBarberLunchHours(configMap['barber_lunch_hours']);
      if (configMap['app_logo']?.url) setLogoUrl(configMap['app_logo'].url);
      if (Array.isArray(configMap['carousel_images']?.images)) setCarteleraImages(configMap['carousel_images'].images);
      if (configMap['loyalty_rewards']) setLoyaltyRewards(configMap['loyalty_rewards']);
      if (configMap['collaborator_payments']) setCollaboratorPayments(configMap['collaborator_payments']);

      // Process blocked hours
      if (blocks) {
        const grouped: any = {};
        blocks.forEach(b => {
          const bId = String(b.barber_id);
          const dateStr = b.date;
          if (!grouped[bId]) grouped[bId] = {};
          if (!grouped[bId][dateStr]) grouped[bId][dateStr] = [];
          grouped[bId][dateStr].push(b.time);
        });
        setGlobalBlockedHours(grouped);
      }

      // Process lunch exceptions
      if (exceptions) {
        const grouped: any = {};
        exceptions.forEach(e => {
          const bId = String(e.barber_id);
          const dateStr = e.date;
          if (!grouped[bId]) grouped[bId] = {};
          grouped[bId][dateStr] = { start: e.start_time, end: e.end_time, isOff: e.is_off };
        });
        setLunchExceptions(grouped);
      }

      // Process permisos
      if (permisos) {
        setGlobalPermisos(permisos.map(p => ({
          id: p.id,
          barberId: p.barber_id,
          barberName: p.barber_name,
          startDate: p.start_date,
          endDate: p.end_date,
          reason: p.reason,
          status: p.status
        })));
      }

      // Process products
      if (productsData) setProducts(productsData);

      // Process sales
      if (salesData) {
        setSales((salesData as any[]).map(s => ({
          id: s.id,
          productName: s.products?.name || 'Producto',
          quantity: s.quantity,
          total: s.total_price || 0,
          date: s.sale_date ? s.sale_date.split('T')[0] : '',
          barberId: s.barber_id,
          commission: (s.products?.commission || 0) * s.quantity
        })));
      }

      // Process services
      if (services && services.length > 0) setServicesList(services);

      // Process promotions
      if (promos) {
        setPromosList(promos.map(p => ({
          id: p.id,
          name: p.name,
          regularPrice: p.regular_price,
          promoPrice: p.promo_price,
          description: p.description,
          expires: p.expires,
          commission: p.commission,
          image: p.image
        })));
      }
      onReady?.();
    };

    loadAppData();

    // Real-time synchronization
    const channel = supabase
      .channel('barber-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        async () => {
          const { data: appts } = await supabase
            .from('appointments')
            .select('*')
            .order('created_at', { ascending: false });
          const { data: cProfiles } = await supabase.from('profiles').select('id, avatar_url, preferences, birthday');
          const pMap: Record<string, { photo: string | null, preferences: string, birthday: string | null }> = {};
          (cProfiles || []).forEach((p: any) => { 
            pMap[p.id] = { 
              photo: p.avatar_url || null, 
              preferences: p.preferences || 'Sin especificaciones.',
              birthday: p.birthday || null
            }; 
          });
          if (appts) {
            setGlobalAppointments(appts.map(a => {
              const clientProf = a.client_id ? pMap[a.client_id] : null;
              return {
                id: a.id,
                barberId: String(a.barber_id || '1'),
                barberName: a.barber_name || 'Barbero',
                client: a.client_name || a.client || 'Cliente',
                clientId: a.client_id,
                clientPhoto: clientProf ? clientProf.photo : null,
                clientPreferences: clientProf ? clientProf.preferences : 'Sin especificaciones.',
                clientBirthday: clientProf ? clientProf.birthday : null,
                service: a.service_name || a.service || 'Servicio',
                time: a.time || a.appointment_time || '',
                date: a.date || a.appointment_date || '',
                status: a.status || 'Pendiente'
              };
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCancelGlobalAppt = async (id: any) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'Cancelada' })
      .eq('id', id);
    if (!error) {
      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });
      const { data: cProfiles } = await supabase.from('profiles').select('id, avatar_url, preferences, birthday');
      const pMap: Record<string, { photo: string | null, preferences: string, birthday: string | null }> = {};
      (cProfiles || []).forEach((p: any) => { 
        pMap[p.id] = { 
          photo: p.avatar_url || null, 
          preferences: p.preferences || 'Sin especificaciones.',
          birthday: p.birthday || null
        }; 
      });
      if (appts) {
        const mapped = appts.map(a => {
          const clientProf = a.client_id ? pMap[a.client_id] : null;
          return {
            id: a.id,
            barberId: String(a.barber_id || '1'),
            barberName: a.barber_name || 'Barbero',
            client: a.client_name || a.client || 'Cliente',
            clientId: a.client_id,
            clientPhoto: clientProf ? clientProf.photo : null,
            clientPreferences: clientProf ? clientProf.preferences : 'Sin especificaciones.',
            clientBirthday: clientProf ? clientProf.birthday : null,
            service: a.service_name || a.service || 'Servicio',
            time: a.time || a.appointment_time || '',
            date: a.date || a.appointment_date || '',
            status: a.status?.startsWith('Finalizada') ? 'Finalizada' : (a.status || 'Pendiente'),
            rawStatus: a.status || 'Pendiente',
            discount: (() => {
              const match = String(a.status).match(/Loyalty\s+(\d+)%/i);
              return match ? parseInt(match[1], 10) : 0;
            })()
          };
        });
        setGlobalAppointments(mapped);
        const appt = mapped.find(a => a.id === id);
        if (appt) {
          cleanLunchExceptionIfNoConflicts(appt.barberId, appt.date, mapped);
        }
      }
    }
  };

  const handleCompleteGlobalAppt = async (id: any, discount: number = 0) => {
    const statusVal = discount > 0 ? `Finalizada (Loyalty ${discount}%)` : 'Finalizada';
    const { error } = await supabase
      .from('appointments')
      .update({ status: statusVal })
      .eq('id', id);
    if (!error) {
      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });
      const { data: cProfiles } = await supabase.from('profiles').select('id, avatar_url, preferences, birthday');
      const pMap: Record<string, { photo: string | null, preferences: string, birthday: string | null }> = {};
      (cProfiles || []).forEach((p: any) => { 
        pMap[p.id] = { 
          photo: p.avatar_url || null, 
          preferences: p.preferences || 'Sin especificaciones.',
          birthday: p.birthday || null
        }; 
      });
      if (appts) {
        const mapped = appts.map(a => {
          const clientProf = a.client_id ? pMap[a.client_id] : null;
          return {
            id: a.id,
            barberId: String(a.barber_id || '1'),
            barberName: a.barber_name || 'Barbero',
            client: a.client_name || a.client || 'Cliente',
            clientId: a.client_id,
            clientPhoto: clientProf ? clientProf.photo : null,
            clientPreferences: clientProf ? clientProf.preferences : 'Sin especificaciones.',
            clientBirthday: clientProf ? clientProf.birthday : null,
            service: a.service_name || a.service || 'Servicio',
            time: a.time || a.appointment_time || '',
            date: a.date || a.appointment_date || '',
            status: a.status?.startsWith('Finalizada') ? 'Finalizada' : (a.status || 'Pendiente'),
            rawStatus: a.status || 'Pendiente',
            discount: (() => {
              const match = String(a.status).match(/Loyalty\s+(\d+)%/i);
              return match ? parseInt(match[1], 10) : 0;
            })()
          };
        });
        setGlobalAppointments(mapped);
        
        const appt = mapped.find(a => a.id === id);
        if (appt && appt.clientId) {
          const { data: profile } = await supabase.from('profiles').select('loyalty_points').eq('id', appt.clientId).maybeSingle();
          if (profile) {
            const newPoints = (profile.loyalty_points || 0) + 1;
            let newTier = 'Básico';
            if (newPoints >= 40) newTier = 'Diamante';
            else if (newPoints >= 30) newTier = 'Oro';
            else if (newPoints >= 20) newTier = 'Plata';
            else if (newPoints >= 10) newTier = 'Bronce';
            
            await supabase.from('profiles').update({ loyalty_points: newPoints, loyalty_tier: newTier }).eq('id', appt.clientId);
          }
        }
        
        if (appt) {
          cleanLunchExceptionIfNoConflicts(appt.barberId, appt.date, mapped);
        }
      }
    }
  };


  const [globalBarberSchedules, setGlobalBarberSchedules] = useState<Record<string, Record<number, { isOff: boolean, start: string, end: string }>>>({});

  const [isSavingSchedules, setIsSavingSchedules] = useState(false);

  const handleSaveSchedules = async () => {
    if (Object.keys(globalBarberSchedules).length === 0) return;
    setIsSavingSchedules(true);
    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'barber_schedules', value: globalBarberSchedules });
    setIsSavingSchedules(false);
    
    if (error) {
      alert("Error al guardar el horario: " + error.message);
    } else {
      alert("¡Horario de trabajo base actualizado con éxito!");
    }
  };


  const [globalBlockedHours, setGlobalBlockedHours] = useState<Record<string, Record<string, string[]>>>({});

  const [barberLunchHours, setBarberLunchHours] = useState<Record<string, { start: string, end: string }>>({
    '1': { start: '12:00', end: '13:00' },
    '2': { start: '13:00', end: '14:00' }
  });
  const [lunchExceptions, setLunchExceptions] = useState<Record<string, Record<string, { start: string, end: string, isOff: boolean }>>>({});

  useEffect(() => {
    const saveLunchHours = async () => {
      if (Object.keys(barberLunchHours).length > 0) {
        await supabase
          .from('app_config')
          .upsert({ key: 'barber_lunch_hours', value: barberLunchHours });
      }
    };
    saveLunchHours();
  }, [barberLunchHours]);


  const toggleGlobalHourBlock = async (hour: string, dateKey: string, barberId: string) => {
    const barberBlocks = globalBlockedHours[barberId] || {};
    const currentBlocked = barberBlocks[dateKey] || [];
    const isBlocked = currentBlocked.includes(hour);
    
    if (isBlocked) {
      await supabase
        .from('blocked_hours')
        .delete()
        .eq('barber_id', barberId)
        .eq('date', dateKey)
        .eq('time', hour);
    } else {
      await supabase
        .from('blocked_hours')
        .insert({
          barber_id: barberId,
          date: dateKey,
          time: hour
        });
    }

    const { data: blocks } = await supabase.from('blocked_hours').select('*');
    if (blocks) {
      const grouped: any = {};
      blocks.forEach(b => {
        const bId = String(b.barber_id);
        const dateStr = b.date;
        if (!grouped[bId]) grouped[bId] = {};
        if (!grouped[bId][dateStr]) grouped[bId][dateStr] = [];
        grouped[bId][dateStr].push(b.time);
      });
      setGlobalBlockedHours(grouped);
    }
  };

  const [lunchStartInput, setLunchStartInput] = useState('12:00');
  const [lunchEndInput, setLunchEndInput] = useState('13:00');

  useEffect(() => {
    const barberId = globalBarberFilter === 'all' ? '1' : globalBarberFilter;
    const lunch = barberLunchHours[barberId] || { start: '12:00', end: '13:00' };
    setLunchStartInput(lunch.start);
    setLunchEndInput(lunch.end);
  }, [globalBarberFilter, barberLunchHours]);

  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);

  const [globalPermisos, setGlobalPermisos] = useState<any[]>([]);

  const handleUpdatePermiso = async (id: any, newStatus: string) => {
    const { error } = await supabase
      .from('permisos')
      .update({ status: newStatus })
      .eq('id', id);
      
    if (!error) {
      const { data } = await supabase.from('permisos').select('*');
      if (data) {
        setGlobalPermisos(data.map(p => ({
          id: p.id,
          barberId: p.barber_id,
          barberName: p.barber_name,
          startDate: p.start_date,
          endDate: p.end_date,
          reason: p.reason,
          status: p.status
        })));
      }
    }
  };

  const handleSaveLunchHours = (barberId: string, newStart: string, newEnd: string) => {
    if (!newStart || !newEnd) {
      alert("Por favor ingresa una hora de inicio y de fin válida.");
      return;
    }
    const newStartMins = parse24TimeToMinutes(newStart);
    const newEndMins = parse24TimeToMinutes(newEnd);
    if (newStartMins >= newEndMins) {
      alert("La hora de inicio de almuerzo debe ser menor a la de fin.");
      return;
    }

    const currentLunch = barberLunchHours[barberId] || { start: '12:00', end: '13:00' };
    const oldStart = currentLunch.start;
    const oldEnd = currentLunch.end;

    const todayStr = toLocalDateStr(new Date());
    const conflictingDates: string[] = [];

    const activeAppts = globalAppointments.filter(appt => {
      const matchBarber = appt.barberId === barberId;
      const matchDate = appt.date >= todayStr;
      const matchStatus = appt.status === 'Pendiente' || appt.status === 'Confirmada';
      return matchBarber && matchDate && matchStatus;
    });

    activeAppts.forEach(appt => {
      const apptStart = parseTimeToMinutes(appt.time);
      const apptDuration = getServiceDurationMinutes(appt.service, servicesList);
      const apptEnd = apptStart + apptDuration;

      const overlap = apptStart < newEndMins && apptEnd > newStartMins;
      if (overlap) {
        if (!conflictingDates.includes(appt.date)) {
          conflictingDates.push(appt.date);
        }
      }
    });

    let updatedExceptions = { ...lunchExceptions };
    if (conflictingDates.length > 0) {
      const formattedDates = conflictingDates.map(dStr => {
        const [y, m, d] = dStr.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      });

      alert(
        `Conflicto en la agenda:\nNo se pudo aplicar el nuevo horario de almuerzo en las siguientes fechas porque ya existen citas:\n\n` +
        formattedDates.map(f => `• ${f}`).join('\n') +
        `\n\nEn estas fechas se mantendrá la hora de almuerzo anterior (${oldStart} a ${oldEnd}) hasta que se cumplan las citas. En los demás días se aplicará el cambio.`
      );

      const barberExceptions = { ...(updatedExceptions[barberId] || {}) };
      conflictingDates.forEach(dStr => {
        barberExceptions[dStr] = { start: oldStart, end: oldEnd, isOff: false };
      });
      updatedExceptions[barberId] = barberExceptions;
      setLunchExceptions(updatedExceptions);
    }

    setBarberLunchHours(prev => ({
      ...prev,
      [barberId]: { start: newStart, end: newEnd }
    }));

    alert("Horario de almuerzo base actualizado con éxito.");
  };

  const cleanLunchExceptionIfNoConflicts = (barberId: string, dateKey: string, currentAppts: any[]) => {
    if (!lunchExceptions[barberId] || !lunchExceptions[barberId][dateKey]) return;

    const globalLunch = barberLunchHours[barberId] || { start: '12:00', end: '13:00' };
    const lunchStartMins = parse24TimeToMinutes(globalLunch.start);
    const lunchEndMins = parse24TimeToMinutes(globalLunch.end);

    const hasRemainingConflict = currentAppts.some(appt => {
      const matchBarber = appt.barberId === barberId;
      const matchDate = appt.date === dateKey;
      const matchStatus = appt.status === 'Pendiente' || appt.status === 'Confirmada';
      if (matchBarber && matchDate && matchStatus) {
        const apptStart = parseTimeToMinutes(appt.time);
        const apptDuration = getServiceDurationMinutes(appt.service, servicesList);
        const apptEnd = apptStart + apptDuration;
        return apptStart < lunchEndMins && apptEnd > lunchStartMins;
      }
      return false;
    });

    if (!hasRemainingConflict) {
      const updatedExceptions = { ...lunchExceptions };
      if (updatedExceptions[barberId]) {
        const barberExceptions = { ...updatedExceptions[barberId] };
        delete barberExceptions[dateKey];
        updatedExceptions[barberId] = barberExceptions;
        setLunchExceptions(updatedExceptions);
      }
    }
  };

  // Products list loaded/saved from/to localStorage (starts clean as [])
  const [products, setProducts] = useState<any[]>([]);

  // Sales list loaded/saved from/to localStorage
  const [sales, setSales] = useState<any[]>([]);

  // Dynamic Collaborator Payments state & helpers
  const [collaboratorPayments, setCollaboratorPayments] = useState<any[]>([]);

  const [payStartDateInput, setPayStartDateInput] = useState<string>('');
  const [payEndDateInput, setPayEndDateInput] = useState<string>('');
  const [payBasePayInput, setPayBasePayInput] = useState<string>('');
  const [selectedHistoryPay, setSelectedHistoryPay] = useState<any>(null);
  const [showPayDetailModal, setShowPayDetailModal] = useState<boolean>(false);
  const [showExecutePayView, setShowExecutePayView] = useState<boolean>(false);

  // Profile management states
  const [customUsers, setCustomUsers] = useState<any[]>([]);

  const [perfilesTab, setPerfilesTab] = useState<'menu' | 'crear_barbero' | 'crear_cliente' | 'ver_usuarios'>('menu');
  const [verUsuariosRole, setVerUsuariosRole] = useState<'cliente' | 'barbero'>('cliente');
  
  // Create user form states
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserDob, setNewUserDob] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Edit user states
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editName, setEditName] = useState('');

  // Helper: converts a Date to YYYY-MM-DD using LOCAL date (avoids UTC timezone shift)
  const toLocalDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const addDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return toLocalDateStr(d);
  };

  const getEarliestDate = (collabId: string) => {
    const apptDates = globalAppointments
      .filter(a => a.barberId === collabId && a.status === 'Finalizada')
      .map(a => a.date);
    const saleDates = sales
      .filter(s => s.barberId === collabId)
      .map(s => s.date);
    const allDates = [...apptDates, ...saleDates].sort();
    if (allDates.length > 0) {
      return allDates[0];
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const getCollaboratorLastPayment = (collabId: string) => {
    const payments = collaboratorPayments.filter(p => p.collaboratorId === collabId);
    if (payments.length === 0) return null;
    return payments.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
  };

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [saleQuantity, setSaleQuantity] = useState(1);

  // States for Free Day Request Form (Modo Barbero)
  const [reqDate, setReqDate] = useState('');
  const [reqReason, setReqReason] = useState('');

  // States for Add Product Form (Modo Admin)
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdCommission, setNewProdCommission] = useState('');
  const [newProdDescription, setNewProdDescription] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);

  // State to track restock inputs per product in inventory grid
  const [restockInputs, setRestockInputs] = useState<Record<number, string>>({});

  const handleRegisterSale = async () => {
    if (!selectedProduct) return;
    if (saleQuantity > selectedProduct.stock) {
      alert("No hay suficiente stock disponible.");
      return;
    }

    const newDbSale = {
      barber_id: myBarberId,
      product_id: selectedProduct.id,
      quantity: saleQuantity,
      total_price: selectedProduct.price * saleQuantity,
      sale_date: toLocalDateStr(selectedDate)
    };

    const newStock = selectedProduct.stock - saleQuantity;
    const { error: saleError } = await supabase
      .from('sales')
      .insert(newDbSale);
      
    if (!saleError) {
      const { error: prodError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', selectedProduct.id);
        
      if (!prodError) {
        // Reload products and sales
        const { data: updatedProducts } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true });
        if (updatedProducts) setProducts(updatedProducts);
        
        const { data: updatedSales } = await supabase
          .from('sales')
          .select('*, products(name, commission)')
          .order('sale_date', { ascending: false });
        if (updatedSales) {
          setSales((updatedSales as any[]).map(s => ({
            id: s.id,
            productName: s.products?.name || 'Producto',
            quantity: s.quantity,
            total: s.total_price || 0,
            date: s.sale_date ? s.sale_date.split('T')[0] : '',
            barberId: s.barber_id,
            commission: (s.products?.commission || 0) * s.quantity
          })));
        }
        
        setSelectedProduct(null);
        setSaleQuantity(1);
        alert(`¡Venta registrada!\n${saleQuantity}x ${selectedProduct.name} - ₡${(selectedProduct.price * saleQuantity).toLocaleString()}`);
      } else {
        alert("Error al actualizar inventario: " + prodError.message);
      }
    } else {
      alert("Error al registrar venta: " + saleError.message);
    }
  };

  const blockedHoursByDate = globalBlockedHours[myBarberId] || {};

  const hours = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  // Calendar Helpers
  const getWeekDays = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday (0) to get Monday (1)
    const monday = new Date(d.setDate(diff));
    
    return Array.from({length: 7}).map((_, i) => {
      const dayOf = new Date(monday);
      dayOf.setDate(monday.getDate() + i);
      return dayOf;
    });
  };

  const weekDays = getWeekDays(selectedDate);

  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const monthDays = Array.from({length: daysInMonth}).map((_, i) => {
    const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
    return d;
  });

  // Global calendar uses globalMonthDate (separate navigation)
  const globalDaysInMonth = new Date(globalMonthDate.getFullYear(), globalMonthDate.getMonth() + 1, 0).getDate();
  const globalFirstDayOfMonth = new Date(globalMonthDate.getFullYear(), globalMonthDate.getMonth(), 1).getDay();
  const globalMonthDays = Array.from({length: globalDaysInMonth}).map((_, i) => {
    const d = new Date(globalMonthDate.getFullYear(), globalMonthDate.getMonth(), i + 1);
    return d;
  });

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate);
  };

  const handleCancelAppointment = (id: number) => {
    handleCancelGlobalAppt(id);
    setCancelingApptId(null);
    setExpandedApptId(null);
  };

  const handleInitiateComplete = async (appt: any) => {
    if (!appt.clientId) {
      setLoyaltyDiscount(0);
      setGiftRewardName('');
      setCompletingApptId(appt.id);
      setAppliedMilestoneName('');
      return;
    }

    try {
      // Fetch client profile AND full appointment history to count already-applied loyalty rewards
      const [{ data: profile }, { data: apptHistory }] = await Promise.all([
        supabase.from('profiles').select('loyalty_points, loyalty_tier').eq('id', appt.clientId).maybeSingle(),
        supabase.from('appointments').select('status').eq('client_id', appt.clientId)
      ]);

      if (profile) {
        const points = profile.loyalty_points || 0;
        const tier = profile.loyalty_tier || 'Básico';

        const getTierStartPoints = (t: string) => {
          switch (t) {
            case 'Bronce': return 10; case 'Plata': return 20;
            case 'Oro': return 30; case 'Diamante': return 40;
            default: return 0;
          }
        };

        const tierStart = getTierStartPoints(tier);
        const progressPoints = Math.max(0, points - tierStart);
        const nextProgressPoints = progressPoints + 1;

        // Count how many loyalty-discount appointments the client has had in the past
        const loyaltyAppliedCount = (apptHistory || []).filter(a =>
          String(a.status).includes('Loyalty')
        ).length;

        // Milestones the client has ALREADY crossed based on current points (before this appointment)
        const crossedMilestones: number[] = [];
        if (tier === 'Básico' && progressPoints >= 1) crossedMilestones.push(1);
        if (progressPoints >= 5) crossedMilestones.push(5);
        if (progressPoints >= 10) crossedMilestones.push(10);

        // Determine which milestone to apply:
        // First: check if there's an already-crossed milestone that hasn't been applied yet (pending)
        // Second: check if THIS appointment hits a NEW milestone
        let milestone = 0;
        if (loyaltyAppliedCount < crossedMilestones.length) {
          // There's a pending reward from already-accumulated points — apply the next unclaimed one
          milestone = crossedMilestones[loyaltyAppliedCount];
        } else {
          // No backlog — check if this appointment crosses a fresh milestone
          if (nextProgressPoints === 1 && tier === 'Básico') milestone = 1;
          else if (nextProgressPoints === 5) milestone = 5;
          else if (nextProgressPoints === 10 || (points + 1) % 10 === 0) milestone = 10;
        }

        // Resolve the reward for the detected milestone
        let discountPct = 0;
        let milestoneName = '';
        let giftName = '';
        if (milestone > 0) {
          const tierRewards = loyaltyRewards[tier] || {};
          let rawReward: any = null;
          if (milestone === 1) { rawReward = tierRewards.reward1; milestoneName = 'Premio Inicial (1 pt)'; }
          else if (milestone === 5) { rawReward = tierRewards.reward5; milestoneName = 'Premio Medio (5 pt)'; }
          else if (milestone === 10) { rawReward = tierRewards.reward10; milestoneName = 'Premio Mayor (10 pt)'; }

          // Handle typed rewards {type, value} or legacy strings
          if (rawReward) {
            let rewardType = 'percent';
            let rewardValue = '';
            if (typeof rawReward === 'object' && rawReward.type) {
              rewardType = rawReward.type;
              rewardValue = String(rawReward.value || '');
            } else if (typeof rawReward === 'string') {
              const m = rawReward.match(/(\d+)\s*%/);
              if (m) { rewardType = 'percent'; rewardValue = m[1]; }
              else { rewardType = 'gift'; rewardValue = rawReward; }
            }
            if (rewardType === 'gift') { giftName = rewardValue; discountPct = 0; }
            else { const pct = parseInt(rewardValue, 10); discountPct = isNaN(pct) ? 0 : pct; }
          }
        }

        setLoyaltyDiscount(discountPct);
        setGiftRewardName(giftName);
        setCompletingApptId(appt.id);
        setAppliedMilestoneName(milestoneName);
      } else {
        setLoyaltyDiscount(0);
        setGiftRewardName('');
        setCompletingApptId(appt.id);
        setAppliedMilestoneName('');
      }
    } catch (err) {
      console.error(err);
      setLoyaltyDiscount(0);
      setGiftRewardName('');
      setCompletingApptId(appt.id);
      setAppliedMilestoneName('');
    }
  };

  const handleCompleteAppointment = (id: number, clientName: string, discount: number = 0) => {
    handleCompleteGlobalAppt(id, discount);
    const discountText = discount > 0 ? ` con un ${discount}% de descuento de lealtad` : '';
    alert(`¡Cita completada con éxito!${discountText}\nSe le ha sumado 1 punto a la tarjeta de lealtad de ${clientName}.`);
    setCompletingApptId(null);
    setLoyaltyDiscount(0);
  };

  const toggleHourBlock = (hour: string) => {
    const dateKey = toLocalDateStr(selectedDate);
    toggleGlobalHourBlock(hour, dateKey, myBarberId);
  };

  // Helper to map service names to prices
  const getServicePrice = (serviceName: string) => {
    if (!serviceName) return 6000;
    const found = servicesList.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
    if (found) {
      if (typeof found.price === 'number') return found.price;
      const num = parseInt(found.price.replace(/[^\d]/g, ''), 10);
      if (!isNaN(num)) return num;
    }
    const s = serviceName.toLowerCase();
    if (s.includes('barba') && s.includes('corte')) return 9000;
    if (s.includes('clásico') || s.includes('corte')) return 6000;
    if (s.includes('fade') || s.includes('degradado')) return 7000;
    if (s.includes('perfilado') || s.includes('barba')) return 4000;
    return 8000; // default
  };

  // Helper to map service names to commissions
  const getServiceCommission = (serviceName: string) => {
    if (!serviceName) return 3000;
    const found = servicesList.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
    if (found && found.commission !== undefined && found.commission !== null && found.commission !== '') {
      const commNum = typeof found.commission === 'number' ? found.commission : parseInt(String(found.commission).replace(/[^\d]/g, ''), 10);
      if (!isNaN(commNum)) return commNum;
    }
    // Fallback: 50% of service price
    return getServicePrice(serviceName) * 0.50;
  };

  const getBarberCutsCommission = (bId: string) => {
    const comm = monthlyGlobalAppts
      .filter(a => a.barberId === bId && a.status === 'Finalizada')
      .reduce((sum, a) => sum + getServiceCommission(a.service), 0);
    // Baseline for demo if no real appointments are saved yet
    if (bId === '1' && comm === 0) {
      return 72000; // 50% of 144,000 baseline
    }
    return comm;
  };

  // Derive barber's personal appointments from globalAppointments
  const appointments = globalAppointments
    .filter(a => a.barberId === myBarberId)
    .map(a => {
      const isBirthdayToday = (birthdayStr: string | null | undefined, apptDateStr: string | null | undefined) => {
        if (!birthdayStr || !apptDateStr) return false;
        const bParts = birthdayStr.split('-');
        const aParts = apptDateStr.split('-');
        if (bParts.length < 3 || aParts.length < 3) return false;
        return bParts[1] === aParts[1] && bParts[2] === aParts[2];
      };

      return {
        id: a.id,
        client: a.client,
        clientPhoto: a.clientPhoto || null,
        service: a.service,
        price: getServicePrice(a.service) * (1 - (a.discount || 0) / 100),
        commission: getServiceCommission(a.service),
        time: a.time,
        date: a.date,
        status: a.status === 'Pendiente' ? 'pending' : a.status === 'Finalizada' ? 'completed' : 'canceled',
        preferences: a.clientPreferences || 'Sin especificaciones.',
        isBirthday: isBirthdayToday(a.clientBirthday, a.date),
        discount: a.discount || 0,
        rawStatus: a.rawStatus || 'Pendiente'
      };
    });

  // Filter appts for the selected date
  const filteredAppointments = appointments.filter(
    app => app.date === toLocalDateStr(selectedDate)
  );
  
  const isToday = toLocalDateStr(selectedDate) === toLocalDateStr(today);

  // Date Helpers for Global Calendar Month Filter
  const gMonth = globalMonthDate.getMonth();
  const gYear = globalMonthDate.getFullYear();
  const gMonthPrefix = `${gYear}-${String(gMonth + 1).padStart(2, '0')}`;

  // Filter global appointments and sales for selected month
  const monthlyGlobalAppts = globalAppointments.filter(a => a.date?.startsWith(gMonthPrefix));
  const monthlySales = sales.filter(s => s.date?.startsWith(gMonthPrefix));

  // Financial stats for the month (we use a baseline for demo, plus dynamic entries)
  const monthlyServiceRev = monthlyGlobalAppts
    .filter(a => a.status === 'Finalizada')
    .reduce((sum, a) => sum + getServicePrice(a.service) * (1 - (a.discount || 0) / 100), 0);

  const monthlyProductRev = monthlySales.reduce((sum, s) => sum + s.total, 0);
  const totalMonthRevenue = (monthlyServiceRev + monthlyProductRev) || 340000; // baseline if no data

  const completedCutsCount = (monthlyGlobalAppts.filter(a => a.status === 'Finalizada').length) || 12;

  // Barber calculations for selected month
  const getBarberCutsRevenue = (bId: string) => {
    const rev = monthlyGlobalAppts
      .filter(a => a.barberId === bId && a.status === 'Finalizada')
      .reduce((sum, a) => sum + getServicePrice(a.service) * (1 - (a.discount || 0) / 100), 0);
    // Baseline for demo
    if (bId === '1') return rev || 144000;
    return rev;
  };
  const getBarberCutsCount = (bId: string) => {
    const count = monthlyGlobalAppts.filter(a => a.barberId === bId && a.status === 'Finalizada').length;
    if (bId === '1') return count || 18;
    return count;
  };
  const getBarberPendingCount = (bId: string) => {
    const count = monthlyGlobalAppts.filter(a => a.barberId === bId && a.status === 'Pendiente').length;
    if (bId === '1') return count || 3;
    return count;
  };

  // Barbero Test (bId '1') metrics
  const testCutsRev = getBarberCutsRevenue('1');
  const testCutsCount = getBarberCutsCount('1');
  const testPending = getBarberPendingCount('1');
  const testProductsRev = sales.filter(s => s.barberId === '1' && s.date.startsWith(gMonthPrefix)).reduce((sum, s) => sum + s.total, 0);
  const testProductsComm = sales.filter(s => s.barberId === '1' && s.date.startsWith(gMonthPrefix)).reduce((sum, s) => sum + (s.commission || 0), 0);
  const testCutsComm = getBarberCutsCommission('1');

  // Default monthly pay calculation
  const getCollaboratorMonthlyTotal = (completedComm: number, productsComm: number, basePay: number) => {
    return basePay + completedComm + productsComm;
  };

  const selectedDateKey = toLocalDateStr(selectedDate);
  const isBaseOff = globalBarberSchedules[myBarberId]?.[selectedDate.getDay()]?.isOff;
  const isApprovedOff = globalPermisos.some(p => p.barberId === myBarberId && p.status === 'Aprobado' && selectedDateKey >= p.startDate && selectedDateKey <= p.endDate);
  const isDayOff = isBaseOff || isApprovedOff;
  const approvedPermiso = globalPermisos.find(p => p.barberId === myBarberId && p.status === 'Aprobado' && selectedDateKey >= p.startDate && selectedDateKey <= p.endDate);

  return (
    <div className="min-h-screen bg-[#09090b] text-white pb-10 font-sans selection:bg-teal-500/30 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-teal-600/10 blur-[130px] rounded-full pointer-events-none z-0" />

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header / Topbar */}
        <div className="flex items-center justify-between p-5 pt-8 animate-in fade-in slide-in-from-left-4 duration-500">
          {/* Left: App Logo & Greeting */}
          <div className="flex items-center gap-3">
            {/* App Logo (Square) */}
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-lg flex-shrink-0 group">
              <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            {!isAdmin && (
              <div>
                <h1 className="text-xl font-bold tracking-tight">Hola, {user?.user_metadata?.full_name?.split(' ')[0] || 'Barbero'}!</h1>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest font-bold">
                  Barbero
                </p>
              </div>
            )}
          </div>

          {/* Right: User Profile & Actions */}
          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                {adminModule === 'mi_barbero' ? (
                  <button
                    onClick={() => setAdminModule('citas_globales')}
                    className="px-3.5 py-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-[inset_0_2px_8px_rgba(53, 236, 222,0.1)] active:scale-95"
                    title="Cambiar a Vista Administrador"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Modo Admin</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setAdminModule('mi_barbero')}
                    className="px-3.5 py-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-[inset_0_2px_8px_rgba(53, 236, 222,0.1)] active:scale-95"
                    title="Cambiar a Vista Barbero"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Modo Barbero</span>
                  </button>
                )}
              </>
            )}
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex-shrink-0">
              {profileImage ? (
                <img src={profileImage} alt={user?.user_metadata?.full_name || 'Perfil'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-teal-500/20 flex items-center justify-center">
                  <span className="text-teal-400 font-bold text-sm uppercase">
                    {user?.user_metadata?.full_name?.charAt(0) || 'B'}
                  </span>
                </div>
              )}
            </div>
            <button 
              onClick={onLogout}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors group flex-shrink-0"
            >
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>

        {/* Top-Tier Admin Navigation */}
        {isAdmin && adminModule !== 'mi_barbero' && (
          <>
            {/* Global Calendar Month Filter */}
            <div className="px-3 mb-3 animate-in fade-in duration-500">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 flex items-center justify-between shadow-lg">
                <button
                  onClick={() => {
                    const newDate = new Date(globalMonthDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setGlobalMonthDate(newDate);
                    setSelectedDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
                  }}
                  className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-xs font-black uppercase tracking-widest text-teal-400 drop-shadow-[0_0_8px_rgba(53, 236, 222,0.3)]">
                  {globalMonthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                
                <button
                  onClick={() => {
                    const newDate = new Date(globalMonthDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setGlobalMonthDate(newDate);
                    setSelectedDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
                  }}
                  className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-3 mb-4 animate-in zoom-in-95 duration-500">
              <div className="bg-teal-950/40 backdrop-blur-3xl border border-teal-500/25 rounded-3xl p-1.5 flex justify-between items-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-full gap-0.5">
                {[
                  { id: 'citas_globales', icon: Grid, label: 'Citas' },
                  { id: 'inventario', icon: Package, label: 'Stock' },
                  { id: 'finanzas', icon: DollarSign, label: 'Finanzas' },
                  { id: 'nomina', icon: Receipt, label: 'Nómina' },
                  { id: 'perfiles', icon: Users, label: 'Perfiles' },
                  { id: 'config', icon: Settings, label: 'Config' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = adminModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setAdminModule(item.id)}
                      className={`relative py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 flex-1 ${isActive ? 'bg-teal-500/25 border border-teal-500/30 text-teal-400 shadow-[inset_0_2px_8px_rgba(53, 236, 222,0.15)]' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                    >
                      <Icon className={`w-4 h-4 mb-1 transition-colors ${isActive ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(53, 236, 222,0.4)]' : 'text-slate-400'}`} />
                      <span className={`text-[8px] font-bold tracking-tight uppercase text-center block leading-none ${isActive ? 'text-teal-300 font-black' : 'text-slate-500'}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Second-Tier Barber Navigation */}
        {adminModule === 'mi_barbero' && (
          <div className="px-4 mb-6 animate-in zoom-in-95 duration-500 delay-100">
            <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 border-t-white/20 rounded-full p-2 flex justify-between items-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              {[
                { id: 'agenda', icon: CalendarIcon, label: 'Agenda' },
                { id: 'tiempos', icon: Clock, label: 'Tiempos' },
                { id: 'ventas', icon: ShoppingBag, label: 'Ventas' },
                { id: 'rendimiento', icon: TrendingUp, label: 'Rend.' },
                { id: 'perfil', icon: User, label: 'Perfil' },
              ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`relative p-3 rounded-full flex items-center justify-center transition-all duration-300 flex-1 ${isActive ? 'bg-white/15 shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)] border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-teal-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-slate-400'}`} />
                </button>
              );
            })}
            </div>
          </div>
        )}

        {/* Dynamic Content area */}
        <div className="flex-1 px-4">
          
          {/* BARBER MODULE CONTENT */}
          {adminModule === 'mi_barbero' && (
            <>
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-4 px-1 animate-in fade-in duration-300">
                 {activeNav === 'agenda' && <><CalendarIcon className="w-5 h-5 text-teal-400" /><h2 className="text-xl font-bold text-white tracking-tight">Mi Agenda</h2></>}
                 {activeNav === 'tiempos' && <><Clock className="w-5 h-5 text-teal-400" /><h2 className="text-xl font-bold text-white tracking-tight">Gestión de Tiempos</h2></>}
                 {activeNav === 'ventas' && <><ShoppingBag className="w-5 h-5 text-teal-400" /><h2 className="text-xl font-bold text-white tracking-tight">Ventas del Día</h2></>}
                 {activeNav === 'rendimiento' && <><TrendingUp className="w-5 h-5 text-teal-400" /><h2 className="text-xl font-bold text-white tracking-tight">Mi Rendimiento</h2></>}
                 {activeNav === 'perfil' && <><User className="w-5 h-5 text-teal-400" /><h2 className="text-xl font-bold text-white tracking-tight">Mi Perfil</h2></>}
              </div>

          {/* Calendar Selector (Global for time-based views) */}
          {['agenda', 'tiempos'].includes(activeNav) && (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-4 mb-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                {calendarView === 'week' && (
                  <button 
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(selectedDate.getDate() - 7);
                      setSelectedDate(newDate);
                      if (newDate.getMonth() !== globalMonthDate.getMonth() || newDate.getFullYear() !== globalMonthDate.getFullYear()) {
                        setGlobalMonthDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
                      }
                    }} 
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                )}
                <span className="text-sm font-bold text-white capitalize">
                  {calendarView === 'week' 
                    ? `Sem. del ${weekDays[0].getDate()} al ${weekDays[6].getDate()} de ${selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`
                    : selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                  }
                </span>
                {calendarView === 'week' && (
                  <button 
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(selectedDate.getDate() + 7);
                      setSelectedDate(newDate);
                      if (newDate.getMonth() !== globalMonthDate.getMonth() || newDate.getFullYear() !== globalMonthDate.getFullYear()) {
                        setGlobalMonthDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
                      }
                    }} 
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button 
                onClick={() => setCalendarView(prev => prev === 'week' ? 'month' : 'week')}
                className="text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                {calendarView === 'week' ? 'Ver Mes' : 'Ver Semana'} <Grid className="w-3 h-3" />
              </button>
            </div>

            {calendarView === 'week' && (
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((d, i) => {
                  const isSelected = selectedDate.toDateString() === d.toDateString();
                  const isBaseOff = globalBarberSchedules[myBarberId]?.[d.getDay()]?.isOff;
                  const isApprovedOff = globalPermisos.some(p => p.barberId === myBarberId && p.status === 'Aprobado' && toLocalDateStr(d) >= p.startDate && toLocalDateStr(d) <= p.endDate);
                  const isDayOff = isBaseOff || isApprovedOff;
                  
                  return (
                    <button 
                      key={i}
                      onClick={() => setSelectedDate(d)}
                      className={`relative overflow-hidden flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300 border ${isSelected ? 'bg-black/60 border-white/10' : 'bg-black/40 border-white/5 text-slate-400 hover:bg-white/10'} ${isDayOff && !isSelected ? 'border-orange-500/30 bg-orange-500/10' : ''}`}
                    >
                      {isSelected && (
                        <>
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-teal-500/30 to-transparent opacity-80" />
                          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-teal-500 shadow-[0_0_15px_rgba(53, 236, 222,0.8)]" />
                        </>
                      )}
                      <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 relative z-10 ${isSelected ? 'text-teal-200' : isDayOff ? 'text-orange-300' : ''}`}>{d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.','')}</span>
                      <span className={`text-sm font-black relative z-10 ${isSelected ? 'text-white' : isDayOff ? 'text-orange-400' : 'text-slate-200'}`}>{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {calendarView === 'month' && (
              <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                  {['D','L','M','X','J','V','S'].map(d => (
                    <span key={d} className="text-[10px] font-bold text-slate-500">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay()}).map((_, i) => (
                    <div key={`blank-${i}`} />
                  ))}
                  {monthDays.map((d, i) => {
                    const isSelected = selectedDate.toDateString() === d.toDateString();
                    const hasAppt = appointments.some(a => a.date === toLocalDateStr(d));
                    const isBaseOff = globalBarberSchedules[myBarberId]?.[d.getDay()]?.isOff;
                    const isApprovedOff = globalPermisos.some(p => p.barberId === myBarberId && p.status === 'Aprobado' && toLocalDateStr(d) >= p.startDate && toLocalDateStr(d) <= p.endDate);
                    const isDayOff = isBaseOff || isApprovedOff;

                    return (
                      <button 
                        key={i}
                        onClick={() => setSelectedDate(d)}
                        className={`aspect-square relative flex items-center justify-center rounded-lg text-xs transition-all overflow-hidden ${isSelected ? 'bg-black/60 border border-white/10' : 'text-slate-300 hover:bg-white/10 border border-white/5 bg-black/40'} ${isDayOff && !isSelected ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' : ''}`}
                      >
                        {isSelected && (
                          <>
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-teal-500/30 to-transparent opacity-80" />
                            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-teal-500 shadow-[0_0_15px_rgba(53,236,222,0.8)]" />
                          </>
                        )}
                        <span className={`relative z-10 ${isSelected ? 'text-white font-bold' : ''}`}>{d.getDate()}</span>
                        {hasAppt && (
                          <div className={`absolute w-1 h-1 rounded-full z-10 ${isSelected ? 'bg-teal-400 top-1 right-1' : 'bg-teal-400 bottom-1'}`}></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )}

          {/* ========================================================= */}
          {/* ======================= AGENDA ========================== */}
          {/* ========================================================= */}
          {activeNav === 'agenda' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-sm font-bold text-slate-300 tracking-tight flex items-center gap-2 uppercase">
                  <CalendarIcon className="w-4 h-4 text-teal-400" />
                  {isToday ? 'Citas de Hoy' : `Citas para el ${selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
                </h2>
                <span className="bg-teal-500/20 text-teal-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-teal-500/30">
                  {filteredAppointments.length}
                </span>
              </div>
              
              <div className="space-y-3">
                {filteredAppointments.length === 0 ? (
                  <div className="p-8 text-center bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl">
                    <p className="text-slate-400 text-sm">No hay citas programadas para este día.</p>
                  </div>
                ) : (
                  filteredAppointments.map(app => {
                    const isExpanded = expandedApptId === app.id;
                    const isCanceling = cancelingApptId === app.id;
                    const isCompleted = app.status === 'completed';
                    const isCanceled = app.status === 'canceled';

                    return (
                      <div key={app.id} className={`bg-white/[0.02] backdrop-blur-xl border ${isExpanded ? 'border-teal-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'border-white/10'} rounded-3xl overflow-hidden transition-all duration-300`}>
                        {/* Compact Header */}
                        <button 
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedApptId(null);
                              setCancelingApptId(null);
                            } else {
                              setExpandedApptId(app.id);
                              setCancelingApptId(null);
                            }
                          }}
                          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : isCanceled ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400'}`}>
                              <span className="text-[9px] font-bold uppercase">{app.time.split(' ')[1]}</span>
                              <span className="text-base font-black leading-none">{app.time.split(' ')[0]}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              {app.clientPhoto ? (
                                <img src={app.clientPhoto} alt={app.client} className="w-9 h-9 rounded-full object-cover border-2 border-white/10 shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-700 border-2 border-white/10 flex items-center justify-center font-bold text-white text-sm shrink-0">
                                  {app.client.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                                  {app.client}
                                  {app.isBirthday && <Cake className="w-3.5 h-3.5 text-yellow-400" />}
                                </h3>
                                <p className="text-slate-400 text-[10px] font-medium mt-0.5 uppercase tracking-wider">
                                  {selectedDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {isCompleted && (
                              <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/20 uppercase font-bold tracking-wider">
                                <Check className="w-3 h-3" /> Completada
                              </span>
                            )}
                            {isCanceled && (
                              <span className="flex items-center gap-1 text-[9px] bg-red-500/10 text-red-400 px-2 py-1 rounded-lg border border-red-500/20 uppercase font-bold tracking-wider">
                                <X className="w-3 h-3" /> Cancelada
                              </span>
                            )}
                            {app.status === 'pending' && (
                              <span className="flex items-center gap-1 text-[9px] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-lg border border-yellow-500/20 uppercase font-bold tracking-wider">
                                <Clock className="w-3 h-3" /> Pendiente
                              </span>
                            )}
                            
                            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="pt-3 border-t border-white/5 space-y-3">
                              
                              <div className="bg-black/40 rounded-2xl p-3 border border-white/5 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-slate-400 font-medium">Servicio a realizar</span>
                                  <span className="text-white font-bold text-right">{app.service}</span>
                                </div>
                                <div className="pt-2 border-t border-white/5">
                                  <span className="text-[10px] text-teal-300 font-bold uppercase tracking-widest block mb-1">Indicaciones del cliente</span>
                                  <p className="text-xs text-slate-300 italic leading-relaxed">"{app.preferences}"</p>
                                </div>
                                {app.isBirthday && (
                                  <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                                    <Cake className="w-4 h-4 text-yellow-400" />
                                    <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider">¡Hoy es su cumpleaños!</span>
                                  </div>
                                )}
                              </div>

                              {app.status === 'pending' && !isCanceling && completingApptId !== app.id && (
                                <div className="flex gap-2 mt-2">
                                  <button 
                                    onClick={() => setCancelingApptId(app.id)}
                                    className="flex-1 py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-colors border border-red-500/20 flex items-center justify-center gap-2"
                                  >
                                    <X className="w-4 h-4" /> Cancelar Cita
                                  </button>
                                  <button 
                                    onClick={() => handleInitiateComplete(app)}
                                    className="flex-1 py-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-xs font-bold transition-colors border border-emerald-500/20 flex items-center justify-center gap-2"
                                  >
                                    <Check className="w-4 h-4" /> Finalizar
                                  </button>
                                </div>
                              )}

                              {completingApptId === app.id && (
                                <div className="mt-2 animate-in fade-in zoom-in-95 duration-300 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                                  <p className="text-xs text-emerald-200 font-bold text-center uppercase tracking-wider">Finalizar Cita / Regalo de Lealtad</p>
                                  
                                  {appliedMilestoneName ? (
                                    <div className={`border rounded-xl p-3 text-center text-xs ${giftRewardName ? 'bg-teal-500/10 border-teal-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                                      <p className={`font-bold ${giftRewardName ? 'text-teal-400' : 'text-orange-400'}`}>¡Hito de Lealtad Detectado!</p>
                                      <p className="text-slate-300 mt-1">Hito: <span className="font-bold text-white">{appliedMilestoneName}</span></p>
                                      {giftRewardName ? (
                                        <>
                                          <p className="text-teal-200 mt-1.5 font-bold">🎁 Regalo a entregar:</p>
                                          <p className="text-white font-black text-sm mt-0.5">{giftRewardName}</p>
                                          <p className="text-[9px] text-teal-300/70 mt-1">Entrega el regalo al cliente. El cobro del servicio es normal.</p>
                                        </>
                                      ) : (
                                        <p className="text-[10px] text-orange-300/80 mt-1 font-semibold">({loyaltyDiscount}% de descuento en el servicio)</p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-center text-xs text-slate-400">
                                      <p>El cliente no califica para ningún premio de lealtad en este corte.</p>
                                      <p className="text-[9px] mt-0.5">(Se sumará 1 punto a su tarjeta)</p>
                                    </div>
                                  )}

                                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 space-y-1 text-[10px]">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Precio Original:</span>
                                      <span className="text-white font-bold">₡{app.price.toLocaleString()}</span>
                                    </div>
                                    {loyaltyDiscount > 0 && (
                                      <div className="flex justify-between text-orange-400 font-medium">
                                        <span>Descuento ({loyaltyDiscount}%):</span>
                                        <span>-₡{(app.price * (loyaltyDiscount / 100)).toLocaleString()}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between pt-1 border-t border-white/5 font-black text-teal-400">
                                      <span>Cobro Final:</span>
                                      <span>₡{(app.price * (1 - loyaltyDiscount / 100)).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-400 pt-1 border-t border-white/5 font-bold">
                                      <span>Comisión Barbero (100%):</span>
                                      <span>₡{app.commission.toLocaleString()}</span>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        setCompletingApptId(null);
                                        setLoyaltyDiscount(0);
                                        setAppliedMilestoneName('');
                                        setGiftRewardName('');
                                      }}
                                      className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl py-2.5 text-xs font-bold transition-all border border-white/10"
                                    >
                                      Volver
                                    </button>
                                    <button 
                                      onClick={() => handleCompleteAppointment(app.id, app.client, loyaltyDiscount)}
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                    >
                                      Confirmar y Cobrar
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isCanceling && (
                                <div className="mt-2 animate-in fade-in zoom-in-95 duration-300 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
                                  <p className="text-xs text-red-200 font-medium mb-3 text-center">¿Estás seguro que deseas cancelar esta cita? Esta acción no se puede deshacer.</p>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => setCancelingApptId(null)}
                                      className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl py-2.5 text-xs font-bold transition-all border border-white/10"
                                    >
                                      No, Volver
                                    </button>
                                    <button 
                                      onClick={() => handleCancelAppointment(app.id)}
                                      className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                    >
                                      Sí, Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}

                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ======================= TIEMPOS ========================= */}
          {/* ========================================================= */}
          {activeNav === 'tiempos' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
              
              {/* --- BLOQUEAR HORAS --- */}
              <div className="flex items-center gap-2 mb-4 px-2">
                <Clock className="w-5 h-5 text-teal-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Bloquear Horas ({isToday ? 'Hoy' : selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})
                </h2>
              </div>

              {isDayOff ? (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-6 text-center backdrop-blur-sm mb-6">
                  <CalendarOff className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <h4 className="text-orange-100 font-bold text-sm capitalize">
                    {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h4>
                  <p className="text-slate-400 text-xs mt-1">
                    {isApprovedOff ? 'Día Libre / Permiso Aprobado' : 'Descanso Semanal Planificado'}
                  </p>
                  {isApprovedOff && (
                    <p className="text-[10px] text-orange-300/80 font-bold uppercase mt-2">
                      Motivo: {approvedPermiso?.reason}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-slate-400 text-xs mb-6 px-2 leading-relaxed">Selecciona las horas en las que no estarás disponible el día seleccionado (ej. almuerzo, emergencias).</p>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {hours.map(hour => {
                      const currentBlocked = blockedHoursByDate[selectedDateKey] || [];
                      const isBlocked = currentBlocked.includes(hour);
                      const exceptions = lunchExceptions[myBarberId] || {};
                      const lunch = exceptions[selectedDateKey] || barberLunchHours[myBarberId] || { start: '12:00', end: '13:00' };
                      const isLunch = isHourInLunch(hour, lunch);

                      if (isLunch) {
                        return (
                          <div
                            key={hour}
                            className="py-3.5 rounded-2xl text-xs font-bold border bg-amber-500/10 border-amber-500/20 text-amber-400 flex flex-col items-center justify-center cursor-default select-none shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                            title="Horario de Almuerzo"
                          >
                            <span>{hour}</span>
                            <span className="text-[8px] font-black uppercase mt-0.5 tracking-wider">Almuerzo</span>
                          </div>
                        );
                      }
                      
                      return (
                        <button
                          key={hour}
                          onClick={() => toggleHourBlock(hour)}
                          className={`py-3.5 rounded-2xl text-sm font-bold transition-all border ${isBlocked ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'bg-black/40 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20'}`}
                        >
                          {hour}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="mt-6 p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-start gap-3 backdrop-blur-sm">
                    <AlertCircle className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-teal-200/80 font-medium leading-relaxed">
                      El administrador define tus horas de trabajo generales. Aquí solo bloqueas horas específicas dentro de tu turno diario. Tu horario de almuerzo se bloquea automáticamente.
                    </p>
                  </div>
                </>
              )}

              {/* DIVIDER */}
              <div className="my-10 border-t border-white/10 relative">
                <div className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-[#09090b] px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Días Libres</div>
              </div>

              {/* --- SOLICITAR DÍA LIBRE --- */}
              <div className="flex items-center gap-2 mb-6 px-2">
                <CalendarOff className="w-5 h-5 text-teal-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">Solicitar Día Libre</h2>
              </div>

              <form className="p-5 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha solicitada</label>
                  <input 
                    type="date"
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-all [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Motivo</label>
                  <textarea 
                    rows={3}
                    placeholder="Escribe brevemente el motivo..."
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 transition-all resize-none"
                  ></textarea>
                </div>
                <button 
                  type="button"
                  onClick={async () => {
                    if (!reqDate || !reqReason.trim()) {
                      alert("Por favor ingresa la fecha y el motivo de la solicitud.");
                      return;
                    }
                    
                    const { data: inserted, error } = await supabase
                      .from('permisos')
                      .insert({
                        barber_id: myBarberId,
                        barber_name: user?.user_metadata?.full_name || 'Barbero Test',
                        start_date: reqDate,
                        end_date: reqDate,
                        reason: reqReason,
                        status: 'Pendiente'
                      })
                      .select();
                      
                    if (error) {
                      alert("Error al enviar solicitud: " + error.message);
                    } else if (inserted) {
                      const { data: updatedData } = await supabase.from('permisos').select('*');
                      if (updatedData) {
                        setGlobalPermisos(updatedData.map(p => ({
                          id: p.id,
                          barberId: p.barber_id,
                          barberName: p.barber_name,
                          startDate: p.start_date,
                          endDate: p.end_date,
                          reason: p.reason,
                          status: p.status
                        })));
                      }
                      setReqDate('');
                      setReqReason('');
                      alert("Solicitud de día libre enviada al administrador.");
                    }
                  }}
                  className="w-full mt-2 bg-teal-600/90 hover:bg-teal-500 border border-teal-500 text-white rounded-full py-4 text-xs font-bold transition-all flex items-center justify-center gap-2 group active:scale-[0.98] shadow-[0_8px_20px_rgba(53, 236, 222,0.2)]"
                >
                  Enviar Solicitud al Admin
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <div className="mt-8 px-2">
                <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">Historial de Solicitudes</h3>
                <div className="space-y-3">
                  {globalPermisos.filter(p => p.barberId === myBarberId).length === 0 ? (
                    <div className="bg-black/20 border border-white/5 rounded-2xl p-6 text-center">
                      <p className="text-xs text-slate-500 italic">No tienes solicitudes registradas.</p>
                    </div>
                  ) : (
                    globalPermisos.filter(p => p.barberId === myBarberId).map(permiso => (
                      <div key={permiso.id} className="flex items-center justify-between p-4 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl">
                        <div>
                          <p className="text-white font-bold text-sm">
                            {new Date(permiso.startDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-slate-400 text-[10px] uppercase font-semibold mt-0.5">{permiso.reason}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          permiso.status === 'Pendiente' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                          permiso.status === 'Aprobado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {permiso.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* ======================= VENTAS ========================== */}
          {/* ========================================================= */}
          {activeNav === 'ventas' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-2">
              
              {!selectedProduct ? (
                <>
                  <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">Catálogo de Productos</h3>
                  
                  {/* Product Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {products.map(prod => (
                      <button 
                        key={prod.id}
                        onClick={() => {
                          setSelectedProduct(prod);
                          setSaleQuantity(1);
                        }}
                        className="relative text-left bg-black/40 border border-white/5 hover:border-white/20 transition-all rounded-2xl overflow-hidden group active:scale-[0.98]"
                      >
                        <div className="h-28 overflow-hidden relative">
                          <img src={prod.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" alt={prod.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                          <span className={`absolute bottom-2 left-2 text-[10px] font-black uppercase ${prod.stock > 0 ? 'text-teal-300' : 'text-red-400'}`}>
                            Stock: {prod.stock}
                          </span>
                        </div>
                        <div className="p-3">
                          <h4 className="text-xs font-bold text-white line-clamp-1">{prod.name}</h4>
                          <p className="text-sm font-black text-teal-400 mt-1">₡{prod.price.toLocaleString()}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Sales History */}
                  <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2 border-t border-white/10 pt-8">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Ventas de Hoy
                  </h3>
                  
                  <div className="space-y-3">
                    {sales.filter(s => s.date === toLocalDateStr(today)).length === 0 ? (
                       <div className="bg-black/20 border border-white/5 rounded-2xl p-6 text-center">
                         <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-30" />
                         <p className="text-xs text-slate-500 italic">No has registrado ventas hoy.</p>
                       </div>
                    ) : (
                      sales.filter(s => s.date === toLocalDateStr(today)).map(sale => (
                        <div key={sale.id} className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-4 flex justify-between items-center hover:bg-white/[0.04] transition-colors">
                          <div>
                            <p className="text-white font-bold text-sm">{sale.productName}</p>
                            <p className="text-slate-400 text-xs mt-0.5 font-medium">Cantidad vendida: <span className="text-white font-bold">{sale.quantity}</span></p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <p className="text-teal-400 font-black tracking-tight">₡{sale.total.toLocaleString()}</p>
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 inline-block mt-1">Pagado</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="animate-in slide-in-from-right-4 duration-300">
                  <button 
                    onClick={() => setSelectedProduct(null)} 
                    className="mb-6 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold bg-white/5 hover:bg-white/10 py-2 px-4 rounded-full w-fit"
                  >
                    <ChevronLeft className="w-4 h-4" /> Volver al catálogo
                  </button>

                  <div className="bg-white/[0.03] backdrop-blur-xl border border-teal-500/30 shadow-[0_0_30px_rgba(53, 236, 222,0.1)] rounded-3xl overflow-hidden mb-8 relative">
                    <div className="h-48 w-full relative">
                      <img src={selectedProduct.image} className="w-full h-full object-cover opacity-60" alt="Product" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5">
                         <h4 className="text-2xl font-black text-white mb-1 drop-shadow-lg leading-tight">{selectedProduct.name}</h4>
                         <p className="text-teal-400 font-black text-xl drop-shadow-md">₡{selectedProduct.price.toLocaleString()} c/u</p>
                      </div>
                    </div>

                    <div className="p-5 relative z-10 -mt-2">
                      <div className="flex justify-between items-center bg-black/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 mb-6 shadow-lg">
                        <span className="text-slate-300 text-sm font-medium">Stock Disponible</span>
                        <span className={`text-lg font-black ${selectedProduct.stock > 0 ? 'text-white' : 'text-red-400'}`}>{selectedProduct.stock} unidades</span>
                      </div>

                      <div className="flex items-center justify-between mb-8">
                        <span className="text-sm font-bold text-slate-300">Cantidad a vender</span>
                        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full p-1.5 shadow-inner">
                          <button onClick={() => setSaleQuantity(Math.max(1, saleQuantity - 1))} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors font-bold text-xl active:scale-90">-</button>
                          <span className="text-xl font-black w-6 text-center text-white">{saleQuantity}</span>
                          <button onClick={() => setSaleQuantity(Math.min(selectedProduct.stock, saleQuantity + 1))} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors font-bold text-xl active:scale-90">+</button>
                        </div>
                      </div>

                      <div className="flex justify-between items-end mb-6 pt-5 border-t border-white/10">
                        <span className="text-sm text-slate-400 font-medium pb-1">Total a cobrar</span>
                        <span className="text-4xl font-black text-teal-400 drop-shadow-[0_0_15px_rgba(53, 236, 222,0.5)] tracking-tighter">₡{(selectedProduct.price * saleQuantity).toLocaleString()}</span>
                      </div>

                      <button 
                        onClick={handleRegisterSale}
                        disabled={selectedProduct.stock === 0}
                        className={`w-full text-white rounded-2xl py-5 text-sm font-bold transition-all shadow-[0_10px_30px_rgba(53, 236, 222,0.3)] active:scale-95 flex items-center justify-center gap-2 ${selectedProduct.stock === 0 ? 'bg-slate-600 opacity-50 cursor-not-allowed shadow-none' : 'bg-teal-600 hover:bg-teal-500 border border-teal-400'}`}
                      >
                        <Check className="w-5 h-5" /> Registrar y Marcar Pagado
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================= */}
          {/* ======================= RENDIMIENTO ===================== */}
          {/* ========================================================= */}
          {activeNav === 'rendimiento' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-2">
              
              {/* Month Selector for Rendimiento */}
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-full p-2 flex justify-between items-center mb-8 shadow-lg">
                <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400 hover:text-white bg-black/40 rounded-full transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-bold text-white capitalize tracking-widest">
                  {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => changeMonth(1)} className="p-2 text-slate-400 hover:text-white bg-black/40 rounded-full transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>

              {(() => {
                const month = selectedDate.getMonth();
                const year = selectedDate.getFullYear();

                // Dynamically filter data for the selected month
                const monthAppointments = appointments.filter(a => {
                  const prefix = `${year}-${String(month+1).padStart(2,'0')}`;
                  return a.date.startsWith(prefix);
                });

                // Filter sales by month prefix AND the logged-in barber
                const monthSales = sales.filter(s => {
                  const prefix = `${year}-${String(month+1).padStart(2,'0')}`;
                  return s.date.startsWith(prefix) && s.barberId === myBarberId;
                });

                const monthReceipts = collaboratorPayments
                  .filter(p => String(p.collaboratorId) === String(myBarberId))
                  .map(p => {
                    const payDateObj = new Date(p.endDate + 'T12:00:00');
                    const formattedDate = payDateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                    return {
                      id: `REC-${p.id}`,
                      date: p.endDate,
                      formattedDate: formattedDate,
                      amount: p.totalAmount,
                      status: 'Pagado',
                      rawPayment: p
                    };
                  })
                  .filter(r => {
                    const prefix = `${year}-${String(month+1).padStart(2,'0')}`;
                    return r.date.startsWith(prefix);
                  });

                const completedCuts = monthAppointments.filter(a => a.status === 'completed').length;
                const pendingCuts = monthAppointments.filter(a => a.status === 'pending').length;
                
                const revenueServices = monthAppointments.filter(a => a.status === 'completed').reduce((sum, a) => sum + (a.price || 0), 0);
                const revenueProducts = monthSales.reduce((sum, s) => sum + s.total, 0);

                // Helper to check if an item has been paid
                const isPaid = (dateStr: string) => {
                  return collaboratorPayments.some(p => 
                    String(p.collaboratorId) === String(myBarberId) &&
                    dateStr >= p.startDate &&
                    dateStr <= p.endDate
                  );
                };

                const commissionServices = monthAppointments
                  .filter(a => a.status === 'completed' && !isPaid(a.date))
                  .reduce((sum, a) => sum + (a.commission || 0), 0);
                const commissionProducts = monthSales
                  .filter(s => !isPaid(s.date))
                  .reduce((sum, s) => sum + (s.commission || 0), 0); 
                const totalPay = commissionServices + commissionProducts;
                
                const prevMonthTotal = 295900;
                // Compact chart height scaling (if 0, give it a tiny sliver so it's visible, else scale relative to prev month)
                const chartHeight = totalPay === 0 ? 5 : Math.min(100, Math.max(10, (totalPay / prevMonthTotal) * 100));

                return (
                  <>
                    {/* General Summary - SMALLER & COMPACT */}
                    <div className="bg-white/[0.03] backdrop-blur-xl border border-teal-500/20 rounded-[1.5rem] p-5 mb-6 relative overflow-hidden shadow-xl flex items-center justify-between">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/10 blur-2xl rounded-full pointer-events-none"></div>
                      
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pago Estimado</p>
                        <h3 className="text-3xl font-black text-white drop-shadow-md tracking-tight">₡{totalPay.toLocaleString()}</h3>
                      </div>

                      {/* Mini Bar Chart */}
                      <div className="flex items-end justify-center gap-3 h-14 relative z-10 mt-1">
                         <div className="flex flex-col items-center gap-1 w-8">
                           <div className="w-full bg-white/10 rounded-t-md relative transition-all duration-1000" style={{ height: '70%' }}></div>
                           <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Ant.</span>
                         </div>
                         <div className="flex flex-col items-center gap-1 w-8">
                           <div className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-md relative shadow-[0_0_10px_rgba(53, 236, 222,0.4)] transition-all duration-1000 delay-300" style={{ height: `${chartHeight}%` }}></div>
                           <span className="text-[8px] font-bold text-white uppercase tracking-widest leading-none">Act.</span>
                         </div>
                      </div>
                    </div>

                    {/* Cuts Breakdown */}
                    <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                      <Scissors className="w-3 h-3 text-slate-500" /> Cortes del Mes
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-8">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Completados</p>
                        <p className="text-2xl font-black text-white">{completedCuts}</p>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pendientes</p>
                        <p className="text-2xl font-black text-yellow-500">{pendingCuts}</p>
                      </div>
                    </div>

                    {/* Earnings Breakdown */}
                    <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                      <BarChart2 className="w-3 h-3 text-slate-500" /> Desglose de Comisión
                    </h3>
                    <div className="space-y-3 mb-8">
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                          <p className="text-white font-bold text-sm">Servicios de Barbería</p>
                          <p className="text-slate-400 text-xs mt-0.5">Comisión por servicios completados</p>
                        </div>
                        <p className="text-teal-400 font-black">₡{commissionServices.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                          <p className="text-white font-bold text-sm">Productos Vendidos</p>
                          <p className="text-slate-400 text-xs mt-0.5">Comisión por ventas de productos</p>
                        </div>
                        <p className="text-teal-400 font-black">₡{commissionProducts.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Receipts Section */}
                    <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2 border-t border-white/10 pt-8">
                      <Receipt className="w-3 h-3 text-slate-500" /> Comprobantes de Pago ({selectedDate.toLocaleDateString('es-ES', { month: 'long' })})
                    </h3>
                    <div className="space-y-3">
                      {monthReceipts.length === 0 ? (
                        <div className="bg-black/20 border border-white/5 rounded-2xl p-6 text-center">
                          <Receipt className="w-6 h-6 text-slate-600 mx-auto mb-2 opacity-30" />
                          <p className="text-xs text-slate-500 italic">No hay comprobantes de pago registrados en este mes.</p>
                        </div>
                      ) : (
                        monthReceipts.map(rec => (
                          <button
                            key={rec.id}
                            onClick={() => {
                              if (rec.rawPayment) {
                                setSelectedHistoryPay(rec.rawPayment);
                                setShowPayDetailModal(true);
                              }
                            }}
                            className="w-full bg-black/40 border border-white/5 hover:border-white/20 transition-all rounded-2xl p-4 text-left flex justify-between items-center group relative overflow-hidden"
                          >
                            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div>
                              <p className="text-white font-bold text-sm flex items-center gap-2">
                                {rec.formattedDate}
                                <span className="text-[8px] uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">{rec.status}</span>
                              </p>
                              <p className="text-slate-500 text-xs mt-1 font-mono">{rec.id}</p>
                            </div>
                            <div className="flex items-center gap-3 relative z-10">
                              <span className="text-white font-black">₡{rec.amount.toLocaleString()}</span>
                              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}

            </div>
          )}

          {/* ========================================================= */}
          {/* ======================= PERFIL ========================== */}
          {/* ========================================================= */}
          {activeNav === 'perfil' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-2">
              
              {/* Profile Card with Image Upload */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 text-center shadow-lg mb-6 relative overflow-hidden">
                 <div className="relative w-24 h-24 mx-auto mb-4 group cursor-pointer">
                   <div className="w-full h-full rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(53, 236, 222,0.2)] transition-all group-hover:border-teal-400">
                     {profileImage ? (
                       <img src={profileImage} className="w-full h-full object-cover" alt="Profile" />
                     ) : (
                       <User className="w-10 h-10 text-teal-400" />
                     )}
                   </div>
                   {/* Overlay Icon */}
                   <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                     <Camera className="w-6 h-6 text-white" />
                   </div>
                   {/* Hidden File Input */}
                   <input 
                     type="file" 
                     accept="image/*" 
                     onChange={handleImageUpload}
                     disabled={isUploading}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                     title="Cambiar foto de perfil"
                   />
                 </div>
                 {isUploading && <p className="text-[10px] text-teal-400 font-bold uppercase tracking-widest mt-2 animate-pulse">Subiendo foto...</p>}
                 <h3 className="text-white font-black text-xl tracking-tight mt-2">{user?.user_metadata?.full_name || 'Barbero'}</h3>
                 <p className="text-teal-300 text-[10px] font-bold uppercase tracking-widest mt-1">Especialista / Barber</p>
              </div>

              {/* Achievements & Barber of the Month Placeholder */}
              <div className="bg-gradient-to-br from-teal-600/10 to-teal-600/10 backdrop-blur-md border border-teal-500/20 rounded-3xl p-6 text-center shadow-lg mb-8 relative overflow-hidden">
                 <div className="absolute -top-10 -left-10 w-32 h-32 bg-teal-500/10 blur-2xl rounded-full pointer-events-none"></div>
                 <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                 <h3 className="text-white font-bold mb-1">Barbero del Mes & Logros</h3>
                 <p className="text-slate-400 text-xs">Próximamente: Aquí podrás ver tus medallas obtenidas y quién es el Barbero del Mes.</p>
              </div>

              {/* Working Schedule & Lunch Hour Display */}
              <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2 px-1">
                <Clock className="w-3 h-3 text-slate-500" /> Mi Horario y Almuerzo
              </h3>
              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 shadow-lg mb-8 space-y-4">
                {/* Lunch hour display */}
                <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                      <Clock className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-bold text-sm">Hora de Almuerzo</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Base diaria</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-teal-300 font-black text-sm">
                      {(() => {
                        const lunch = barberLunchHours[myBarberId] || { start: '12:00', end: '13:00' };
                        return `${lunch.start} - ${lunch.end}`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Weekly Days Schedule */}
                <div className="pt-2 space-y-2.5">
                  {[
                    { index: 1, label: 'Lunes' },
                    { index: 2, label: 'Martes' },
                    { index: 3, label: 'Miércoles' },
                    { index: 4, label: 'Jueves' },
                    { index: 5, label: 'Viernes' },
                    { index: 6, label: 'Sábado' },
                    { index: 0, label: 'Domingo' }
                  ].map((day) => {
                    const dayData = globalBarberSchedules[myBarberId]?.[day.index] || { isOff: false, start: '09:00', end: '18:00' };
                    
                    return (
                      <div key={day.index} className="flex justify-between items-center text-xs px-1 py-1 border-b border-white/[0.02] last:border-b-0">
                        <span className="text-slate-400 font-medium">{day.label}</span>
                        {dayData.isOff ? (
                          <span className="text-red-400 font-bold uppercase tracking-wider text-[8px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/10">Día Libre</span>
                        ) : (
                          <span className="text-white font-bold">{dayData.start} - {dayData.end}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Birthdays (Staff) */}
              <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                <Cake className="w-3 h-3 text-slate-500" /> Próximos Cumpleaños del Staff
              </h3>
              <div className="space-y-3 mb-8">
                 {[
                   { name: 'Luis Miguel', role: 'Barbero', date: '25 de Mayo', days: 8 },
                   { name: 'Ana', role: 'Administración', date: '12 de Junio', days: 26 },
                 ].map((bday, i) => (
                   <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                         <Cake className="w-5 h-5 text-teal-400" />
                       </div>
                       <div>
                         <p className="text-white font-bold text-sm">{bday.name}</p>
                         <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold mt-0.5">{bday.role} • {bday.date}</p>
                       </div>
                     </div>
                     <div className="text-right flex flex-col items-end">
                       <p className="text-teal-400 font-black text-xl leading-none">{bday.days}</p>
                       <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1">días</span>
                     </div>
                   </div>
                 ))}
              </div>


            </div>
          )}
            </>
          )}

          {/* OTHER ADMIN MODULES */}
          {adminModule === 'citas_globales' && (
            <div className="animate-in fade-in duration-500">
               {/* Header and Top Actions */}
               <div className="flex flex-col gap-4 mb-6">
                 <div className="flex items-center gap-2 px-1">
                   <Grid className="w-5 h-5 text-teal-400" />
                   <h2 className="text-xl font-bold text-white tracking-tight">Gestión de Agenda Global</h2>
                 </div>

                 {/* Citas Globales Sub-Tabs */}
                 <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-1 flex items-center shadow-lg">
                   {[
                     { id: 'citas', label: 'Citas' },
                     { id: 'horarios', label: 'Horarios de Trabajo' },
                     { id: 'permisos', label: 'Solicitudes / Permisos' },
                   ].map((tab) => (
                     <button
                       key={tab.id}
                       onClick={() => setGlobalCitasTab(tab.id as any)}
                       className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                         globalCitasTab === tab.id 
                           ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-[inset_0_2px_10px_rgba(53, 236, 222,0.2)]' 
                           : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                       }`}
                     >
                       {tab.label}
                     </button>
                   ))}
                 </div>
               </div>

               {/* TAB: CITAS */}
               {globalCitasTab === 'citas' && (
                 <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                   {/* Filters & Calendar */}
                   <div className="mb-6">
                     <select 
                       value={globalBarberFilter}
                       onChange={(e) => setGlobalBarberFilter(e.target.value)}
                       className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/50 appearance-none font-bold mb-6"
                     >
                       <option value="all" className="bg-slate-900 text-white">Todos los Barberos</option>
                       {customUsers
                         .filter((u: any) => u.role === 'barbero' || u.role === 'admin')
                         .map((barber: any) => (
                           <option key={barber.id} value={barber.id} className="bg-slate-900 text-white">
                             {barber.name}{barber.role === 'admin' ? ' (Admin)' : ''}
                           </option>
                         ))
                       }
                     </select>

                     <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-4 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            {globalCitasView === 'week' && (
                              <button 
                                onClick={() => {
                                  const newDate = new Date(selectedDate);
                                  newDate.setDate(selectedDate.getDate() - 7);
                                  setSelectedDate(newDate);
                                  if (newDate.getMonth() !== globalMonthDate.getMonth() || newDate.getFullYear() !== globalMonthDate.getFullYear()) {
                                    setGlobalMonthDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
                                  }
                                }} 
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <ChevronRight className="w-4 h-4 rotate-180" />
                              </button>
                            )}
                            <span className="text-sm font-bold text-white capitalize">
                              {globalCitasView === 'week' 
                                ? `Sem. del ${weekDays[0].getDate()} al ${weekDays[6].getDate()} de ${selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`
                                : selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                              }
                            </span>
                            {globalCitasView === 'week' && (
                              <button 
                                onClick={() => {
                                  const newDate = new Date(selectedDate);
                                  newDate.setDate(selectedDate.getDate() + 7);
                                  setSelectedDate(newDate);
                                  if (newDate.getMonth() !== globalMonthDate.getMonth() || newDate.getFullYear() !== globalMonthDate.getFullYear()) {
                                    setGlobalMonthDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
                                  }
                                }} 
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                         <button 
                           onClick={() => setGlobalCitasView(prev => prev === 'week' ? 'month' : 'week')}
                           className="text-[10px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white font-bold hover:bg-white/10 transition-colors uppercase tracking-wider"
                         >
                           {globalCitasView === 'week' ? 'Ver Mes' : 'Ver Semana'} <Grid className="w-3 h-3 inline ml-1" />
                         </button>
                       </div>

                       {globalCitasView === 'week' && (
                         <div className="grid grid-cols-7 gap-1.5">
                           {weekDays.map((d, i) => {
                             const isSelected = selectedDate.toDateString() === d.toDateString();
                             const hasAppt = globalAppointments.some(a => a.date === toLocalDateStr(d) && (globalBarberFilter === 'all' || a.barberId === globalBarberFilter));
                             return (
                               <button 
                                 key={i}
                                 onClick={() => setSelectedDate(d)}
                                 className={`relative overflow-hidden flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300 border ${isSelected ? 'bg-black/60 border-white/10' : 'bg-black/40 border-white/5 hover:bg-white/10'}`}
                               >
                                 {isSelected && (
                                   <>
                                     <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-teal-500/30 to-transparent opacity-80" />
                                     <div className="absolute inset-x-0 bottom-0 h-[3px] bg-teal-500 shadow-[0_0_15px_rgba(53, 236, 222,0.8)]" />
                                   </>
                                 )}
                                 <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 relative z-10 ${isSelected ? 'text-teal-200' : 'text-slate-400'}`}>{d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.','')}</span>
                                 <span className={`text-sm font-black relative z-10 ${isSelected ? 'text-white' : 'text-slate-200'}`}>{d.getDate()}</span>
                                 {hasAppt && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]" />}
                               </button>
                             );
                           })}
                         </div>
                       )}

                       {globalCitasView === 'month' && (
                         <div className="animate-in fade-in duration-300">
                           <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                             {['D','L','M','X','J','V','S'].map(d => (
                               <span key={d} className="text-[10px] font-bold text-slate-500">{d}</span>
                             ))}
                           </div>
                           <div className="grid grid-cols-7 gap-1">
                             {Array.from({length: globalFirstDayOfMonth}).map((_, i) => (
                               <div key={`blank-${i}`} />
                             ))}
                             {globalMonthDays.map((d, i) => {
                               const isSelected = selectedDate.toDateString() === d.toDateString();
                               const hasAppt = globalAppointments.some(a => a.date === toLocalDateStr(d) && (globalBarberFilter === 'all' || a.barberId === globalBarberFilter));
                               return (
                                 <button 
                                   key={i}
                                   onClick={() => setSelectedDate(d)}
                                   className={`aspect-square relative flex items-center justify-center rounded-lg text-xs transition-all overflow-hidden ${isSelected ? 'bg-black/60 border border-white/10' : 'bg-black/40 border border-white/5 hover:bg-white/10'}`}
                                 >
                                   {isSelected && (
                                     <>
                                       <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-teal-500/30 to-transparent opacity-80" />
                                       <div className="absolute inset-x-0 bottom-0 h-[2px] bg-teal-500 shadow-[0_0_15px_rgba(53,236,222,0.8)]" />
                                     </>
                                   )}
                                   <span className={`relative z-10 ${isSelected ? 'text-white font-bold' : 'text-slate-300'}`}>{d.getDate()}</span>
                                   {hasAppt && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-teal-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]" />}
                                 </button>
                               );
                             })}
                           </div>
                         </div>
                       )}
                     </div>
                   </div>

                   {/* Appointment List for Selected Date */}
                   <div className="space-y-4">
                     <h3 className="text-sm font-bold text-white capitalize flex items-center gap-2">
                       <CalendarIcon className="w-4 h-4 text-teal-400" /> Citas para {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                     </h3>
                     
                     {globalAppointments
                     .filter(app => app.date === toLocalDateStr(selectedDate) && (globalBarberFilter === 'all' || app.barberId === globalBarberFilter))
                     .length === 0 ? (
                       <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-3xl">
                         <CalendarOff className="w-10 h-10 text-slate-500/50 mx-auto mb-3" />
                         <p className="text-sm text-slate-400 font-bold">No hay citas para este día.</p>
                       </div>
                     ) : (
                       globalAppointments
                       .filter(app => app.date === toLocalDateStr(selectedDate) && (globalBarberFilter === 'all' || app.barberId === globalBarberFilter))
                       .map((app) => (
                         <div key={app.id} className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
                           <div className="flex justify-between items-start mb-4">
                             <div className="flex items-center gap-3">
                               {app.clientPhoto ? (
                                 <img src={app.clientPhoto} alt={app.client} className="w-11 h-11 rounded-full object-cover border-2 border-white/10 shrink-0" />
                               ) : (
                                 <div className="w-11 h-11 rounded-full bg-slate-700 border-2 border-white/10 flex items-center justify-center font-bold text-white text-base shrink-0">
                                   {app.client.charAt(0).toUpperCase()}
                                 </div>
                               )}
                               <div>
                                 <h3 className="font-bold text-white">{app.client}</h3>
                                 <p className="text-xs text-teal-400 font-semibold">{app.barberName}</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <p className="text-white font-black">{app.time}</p>
                               <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{isToday ? 'HOY' : ''}</p>
                             </div>
                           </div>
                           
                           <div className="bg-white/5 rounded-2xl p-3 flex justify-between items-center mb-4">
                              <span className="text-sm text-slate-300">{app.service}</span>
                              <div className="flex items-center gap-1.5">
                                {app.discount > 0 && (
                                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                    {app.discount === 100 ? 'GRATIS' : `-${app.discount}%`}
                                  </span>
                                )}
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                  app.status === 'Pendiente' ? 'text-amber-400 border border-amber-400/20 bg-amber-400/10' :
                                  app.status === 'Finalizada' ? 'text-emerald-400 border border-emerald-400/20 bg-emerald-400/10' :
                                  'text-red-400 border border-red-400/20 bg-red-400/10'
                                }`}>
                                  {app.status}
                                </span>
                              </div>
                            </div>
                           
                           {app.status === 'Pendiente' && (
                             <button 
                               onClick={() => handleCancelGlobalAppt(app.id)}
                               className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors"
                             >
                               Cancelar Cita
                             </button>
                           )}
                         </div>
                       ))
                     )}
                  </div>

                  {/* Resumen de Citas del Mes */}
                  <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                     <div className="flex items-center justify-between">
                       <h3 className="text-sm font-bold text-white capitalize flex items-center gap-2">
                         <Receipt className="w-4 h-4 text-teal-400" /> Citas del Mes ({globalMonthDate.toLocaleDateString('es-ES', { month: 'long' })})
                       </h3>
                       <span className="text-teal-400 text-xs font-bold bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                         Total: {monthlyGlobalAppts.filter(app => globalBarberFilter === 'all' || app.barberId === globalBarberFilter).length}
                       </span>
                     </div>

                     {/* Filter Toggles */}
                     <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5 w-fit">
                       {[
                         { id: 'all', label: 'Todas' },
                         { id: 'pending', label: 'Pendientes' },
                         { id: 'completed', label: 'Completadas' }
                       ].map(opt => {
                         const isActive = monthlyCitasFilter === opt.id;
                         const count = monthlyGlobalAppts.filter(app => {
                           const matchesBarber = globalBarberFilter === 'all' || app.barberId === globalBarberFilter;
                           const matchesStatus = 
                             opt.id === 'all' ||
                             (opt.id === 'pending' && app.status === 'Pendiente') ||
                             (opt.id === 'completed' && app.status === 'Finalizada');
                           return matchesBarber && matchesStatus;
                         }).length;

                         return (
                           <button
                             key={opt.id}
                             onClick={() => setMonthlyCitasFilter(opt.id as any)}
                             className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                               isActive 
                                 ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' 
                                 : 'text-slate-400 hover:text-white'
                             }`}
                           >
                             {opt.label} ({count})
                           </button>
                         );
                       })}
                     </div>

                     {/* Monthly List */}
                     <div className="space-y-3 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                       {(() => {
                         const filtered = monthlyGlobalAppts.filter(app => {
                           const matchesBarber = globalBarberFilter === 'all' || app.barberId === globalBarberFilter;
                           const matchesStatus = 
                             monthlyCitasFilter === 'all' ||
                             (monthlyCitasFilter === 'pending' && app.status === 'Pendiente') ||
                             (monthlyCitasFilter === 'completed' && app.status === 'Finalizada');
                           return matchesBarber && matchesStatus;
                         });

                         if (filtered.length === 0) {
                           return (
                             <div className="text-center py-8 bg-black/20 border border-white/5 rounded-2xl">
                               <p className="text-xs text-slate-500 italic">No hay citas registradas en esta categoría para este mes.</p>
                             </div>
                           );
                         }

                         // Sort by date/time
                         const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

                         return sorted.map(app => {
                           const formattedDate = new Date(app.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                           return (
                             <div key={app.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex justify-between items-center hover:bg-white/[0.04] transition-colors">
                               <div className="flex items-center gap-3">
                                 <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-col items-center justify-center text-teal-400">
                                   <span className="text-[10px] font-black uppercase leading-none">{formattedDate.split(' ')[1]}</span>
                                   <span className="text-sm font-black mt-0.5 leading-none">{formattedDate.split(' ')[0]}</span>
                                 </div>
                                 <div>
                                   <h4 className="font-bold text-white text-xs">{app.client}</h4>
                                   <p className="text-[9px] text-slate-400 mt-0.5">{app.barberName} • {app.service}</p>
                                 </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                 <span className="text-[10px] font-black text-slate-300">{app.time}</span>
                                 <div className="flex items-center gap-1">
                                   {app.discount > 0 && (
                                     <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-orange-500/20 bg-orange-500/10 text-orange-400">
                                       {app.discount === 100 ? 'GRATIS' : `-${app.discount}%`}
                                     </span>
                                   )}
                                   <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                     app.status === 'Pendiente' ? 'text-amber-400 border-amber-400/20 bg-amber-400/10' :
                                     app.status === 'Finalizada' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' :
                                     'text-red-400 border-red-400/20 bg-red-400/10'
                                   }`}>
                                     {app.status}
                                   </span>
                                 </div>
                               </div>
                             </div>
                           );
                         });
                       })()}
                     </div>
                  </div>
                 </div>
               )}

               {/* TAB: HORARIOS */}
               {globalCitasTab === 'horarios' && (
                 <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="mb-6">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Seleccionar Barbero</label>
                     <select 
                       value={globalBarberFilter}
                       onChange={(e) => setGlobalBarberFilter(e.target.value)}
                       className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/50 appearance-none font-bold"
                     >
                       {customUsers
                         .filter((u: any) => u.role === 'barbero' || u.role === 'admin')
                         .map((barber: any) => (
                           <option key={barber.id} value={barber.id} className="bg-slate-900 text-white">
                             {barber.name}
                           </option>
                         ))
                       }
                     </select>
                   </div>

                   <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 shadow-lg mb-6">
<button 
                       onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
                       className="w-full flex justify-between items-center group"
                     >
                       <h3 className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors">Horario Base (Semanal)</h3>
                       <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isScheduleExpanded ? 'rotate-90' : ''}`} />
                     </button>
                     
                     {isScheduleExpanded && (
                       <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                         {/* Hora de Almuerzo Base */}
                         {(() => {
                           const barberId = globalBarberFilter === 'all' ? '1' : globalBarberFilter;
                           return (
                             <div className="mb-6 bg-teal-500/10 border border-teal-500/20 p-4 rounded-2xl">
                               <div className="flex items-center gap-2 mb-3">
                                 <Clock className="w-4 h-4 text-teal-400" />
                                 <h4 className="text-xs font-bold text-white uppercase tracking-widest">Hora de Almuerzo Base</h4>
                               </div>
                               <p className="text-[10px] text-slate-400 mb-4">
                                 Esta hora quedará bloqueada en todos los meses. Si coincide con alguna cita agendada, se creará una excepción para mantener el horario anterior en esa fecha.
                               </p>
                               <div className="flex items-center gap-3">
                                 <div className="flex-1 flex gap-2 items-center">
                                   <div className="w-full">
                                     <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Inicio</span>
                                     <input 
                                       type="time" 
                                       value={lunchStartInput} 
                                       onChange={(e) => setLunchStartInput(e.target.value)} 
                                       className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs text-center font-bold" 
                                     />
                                   </div>
                                   <span className="text-slate-500 mt-4">-</span>
                                   <div className="w-full">
                                     <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Fin</span>
                                     <input 
                                       type="time" 
                                       value={lunchEndInput} 
                                       onChange={(e) => setLunchEndInput(e.target.value)} 
                                       className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs text-center font-bold" 
                                     />
                                   </div>
                                 </div>
                                 <button 
                                   onClick={() => handleSaveLunchHours(barberId, lunchStartInput, lunchEndInput)}
                                   className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs transition-colors self-end shadow-md hover:shadow-teal-500/20"
                                 >
                                   Actualizar Almuerzo
                                 </button>
                               </div>
                             </div>
                           );
                         })()}

                         <div className="space-y-4">
                       {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dayName, idx) => {
                         const dayIndex = idx === 6 ? 0 : idx + 1; // 0 is Sunday
                         const dayData = globalBarberSchedules[globalBarberFilter]?.[dayIndex] || { isOff: false, start: '09:00', end: '18:00' };

                         const updateDay = (field: string, value: any) => {
                           setGlobalBarberSchedules({
                             ...globalBarberSchedules,
                             [globalBarberFilter]: {
                               ...(globalBarberSchedules[globalBarberFilter] || {}),
                               [dayIndex]: { ...dayData, [field]: value }
                             }
                           });
                         };

                         return (
                           <div key={dayIndex} className="flex items-center justify-between gap-3 bg-black/30 p-3 rounded-2xl border border-white/5">
                             <div className="w-24">
                               <span className="text-xs font-bold text-slate-300">{dayName}</span>
                             </div>
                             <div className="flex-1 flex gap-2 items-center">
                               {dayData.isOff ? (
                                 <div className="flex-1 text-center text-[10px] text-orange-400 font-bold bg-orange-400/10 py-2 rounded-xl">
                                   DÍA LIBRE
                                 </div>
                               ) : (
                                 <>
                                   <input type="time" value={dayData.start} onChange={(e) => updateDay('start', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-2 py-1.5 text-white text-xs text-center" />
                                   <span className="text-slate-500">-</span>
                                   <input type="time" value={dayData.end} onChange={(e) => updateDay('end', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-2 py-1.5 text-white text-xs text-center" />
                                 </>
                               )}
                             </div>
                             <button 
                               onClick={() => updateDay('isOff', !dayData.isOff)}
                               className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${dayData.isOff ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                             >
                               {dayData.isOff ? <CalendarOff className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                             </button>
                           </div>
                          );
                        })}
                        </div>
                        <button 
                          onClick={handleSaveSchedules}
                          disabled={isSavingSchedules}
                          className="w-full mt-5 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-850 text-white rounded-xl font-bold transition-colors shadow-lg shadow-teal-500/20 disabled:cursor-not-allowed"
                        >
                          {isSavingSchedules ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                      </div>
                     )}
                   </div>

                   <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
                     <div className="flex justify-between items-center mb-6">
                       <div className="flex items-center gap-2">
                         {globalCitasView === 'week' && (
                           <button 
                             onClick={() => {
                               const newDate = new Date(selectedDate);
                               newDate.setDate(selectedDate.getDate() - 7);
                               setSelectedDate(newDate);
                               if (newDate.getMonth() !== globalMonthDate.getMonth() || newDate.getFullYear() !== globalMonthDate.getFullYear()) {
                                 setGlobalMonthDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
                               }
                             }} 
                             className="p-1 text-slate-400 hover:text-white"
                           >
                             <ChevronRight className="w-4 h-4 rotate-180" />
                           </button>
                         )}
                         <span className="text-sm font-bold text-white capitalize">
                           {globalCitasView === 'week' 
                             ? `Sem. del ${weekDays[0].getDate()} al ${weekDays[6].getDate()} de ${selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`
                             : selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                           }
                         </span>
                         {globalCitasView === 'week' && (
                           <button 
                             onClick={() => {
                               const newDate = new Date(selectedDate);
                               newDate.setDate(selectedDate.getDate() + 7);
                               setSelectedDate(newDate);
                               if (newDate.getMonth() !== globalMonthDate.getMonth() || newDate.getFullYear() !== globalMonthDate.getFullYear()) {
                                 setGlobalMonthDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
                               }
                             }} 
                             className="p-1 text-slate-400 hover:text-white"
                           >
                             <ChevronRight className="w-4 h-4" />
                           </button>
                         )}
                       </div>
                       <button 
                         onClick={() => setGlobalCitasView(prev => prev === 'week' ? 'month' : 'week')}
                         className="text-[10px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white font-bold hover:bg-white/10 transition-colors uppercase tracking-wider"
                       >
                         {globalCitasView === 'week' ? 'Ver Mes' : 'Ver Semana'} <Grid className="w-3 h-3 inline ml-1" />
                       </button>
                     </div>

                     {/* Calendar Renderer */}
                     {globalCitasView === 'week' && (
                       <div className="grid grid-cols-7 gap-1.5 mb-6">
                         {weekDays.map((d, i) => {
                            const isSelected = selectedDate.toDateString() === d.toDateString();
                            const isBaseOff = globalBarberSchedules[globalBarberFilter]?.[d.getDay()]?.isOff;
                            const isApprovedOff = globalPermisos.some(p => p.barberId === globalBarberFilter && p.status === 'Aprobado' && toLocalDateStr(d) >= p.startDate && toLocalDateStr(d) <= p.endDate);
                            const isDayOff = isBaseOff || isApprovedOff;
                           return (
                             <button 
                               key={i}
                               onClick={() => setSelectedDate(d)}
                               className={`relative overflow-hidden flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300 border ${isSelected ? 'bg-black/60 border-white/10' : 'bg-black/40 border-white/5 hover:bg-white/10'} ${isDayOff && !isSelected ? 'border-orange-500/30 bg-orange-500/10' : ''}`}
                             >
                               {isSelected && (
                                 <>
                                   <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-teal-500/30 to-transparent opacity-80" />
                                   <div className="absolute inset-x-0 bottom-0 h-[3px] bg-teal-500 shadow-[0_0_15px_rgba(53, 236, 222,0.8)]" />
                                 </>
                               )}
                               <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 relative z-10 ${isSelected ? 'text-teal-200' : isDayOff ? 'text-orange-300' : 'text-slate-400'}`}>{d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.','')}</span>
                               <span className={`text-sm font-black relative z-10 ${isSelected ? 'text-white' : isDayOff ? 'text-orange-400' : 'text-slate-200'}`}>{d.getDate()}</span>
                             </button>
                           );
                         })}
                       </div>
                     )}

                     {globalCitasView === 'month' && (
                       <div className="animate-in fade-in duration-300 mb-6">
                         <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                           {['D','L','M','X','J','V','S'].map(d => (
                             <span key={d} className="text-[10px] font-bold text-slate-500">{d}</span>
                           ))}
                         </div>
                         <div className="grid grid-cols-7 gap-1">
                           {monthDays.map((d, i) => {
                             const isSelected = selectedDate.toDateString() === d.toDateString();
                             const isBaseOff = globalBarberSchedules[globalBarberFilter]?.[d.getDay()]?.isOff;
                             const isApprovedOff = globalPermisos.some(p => p.barberId === globalBarberFilter && p.status === 'Aprobado' && toLocalDateStr(d) >= p.startDate && toLocalDateStr(d) <= p.endDate);
                             const isDayOff = isBaseOff || isApprovedOff;
                             return (
                             <button 
                               key={i}
                               onClick={() => setSelectedDate(d)}
                               className={`aspect-square relative flex items-center justify-center rounded-lg text-xs transition-all overflow-hidden ${isSelected ? 'bg-black/60 border border-white/10' : isDayOff ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-black/40 border border-white/5 hover:bg-white/10'}`}
                             >
                               {isSelected && (
                                   <>
                                     <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-teal-500/30 to-transparent opacity-80" />
                                     <div className="absolute inset-x-0 bottom-0 h-[2px] bg-teal-500 shadow-[0_0_15px_rgba(53,236,222,0.8)]" />
                                   </>
                                 )}
                                 <span className={`relative z-10 ${isSelected ? 'text-white font-bold' : isDayOff ? 'text-orange-400 font-bold' : 'text-slate-300'}`}>{d.getDate()}</span>
                                 {isDayOff && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.8)]" />}
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     )}

                     {/* HORARIO DEL DÍA SELECCIONADO */}
                     <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex flex-col gap-3 relative overflow-hidden animate-in fade-in duration-300 mt-6">
                        {(() => {
                          const dateKey = toLocalDateStr(selectedDate);
                          const approvedPermiso = globalPermisos.find(p => p.barberId === globalBarberFilter && p.status === 'Aprobado' && dateKey >= p.startDate && dateKey <= p.endDate);
                          const isBaseOff = globalBarberSchedules[globalBarberFilter]?.[selectedDate.getDay()]?.isOff;

                          if (approvedPermiso) {
                            return (
                              <>
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                                <div className="flex justify-between items-center pl-2">
                                  <h4 className="text-orange-100 font-bold text-sm capitalize">{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                                  <span className="text-[10px] text-orange-400 border border-orange-400/20 bg-orange-400/10 px-2 py-1 rounded-md font-bold uppercase flex items-center gap-1">
                                    <Check className="w-3 h-3" /> {approvedPermiso.reason}
                                  </span>
                                </div>
                                <p className="text-xs text-orange-300/80 pl-2">Día libre aprobado por motivos personales.</p>
                              </>
                            );
                          }

                          if (isBaseOff) {
                            return (
                              <>
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                                <div className="flex justify-between items-center pl-2">
                                  <h4 className="text-orange-100 font-bold text-sm capitalize">{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                                  <span className="text-[10px] text-orange-400 border border-orange-400/20 bg-orange-400/10 px-2 py-1 rounded-md font-bold uppercase flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Día Libre Asignado
                                  </span>
                                </div>
                                <p className="text-xs text-orange-300/80 pl-2">Este día está configurado como descanso semanal.</p>
                              </>
                            );
                          }

                          return (
                          <>
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                            <div className="flex justify-between items-center pl-2">
                              <h4 className="text-white font-bold text-sm capitalize">{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                              <span className="text-[10px] text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 rounded-md font-bold uppercase">Laboral</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pb-1 pl-2">
                               <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex flex-col justify-center items-center">
                                 <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Jornada</p>
                                 <p className="text-sm text-white font-black">{globalBarberSchedules[globalBarberFilter]?.[selectedDate.getDay()]?.start} - {globalBarberSchedules[globalBarberFilter]?.[selectedDate.getDay()]?.end}</p>
                               </div>
                               {(() => {
                                 const barberId = globalBarberFilter === 'all' ? '1' : globalBarberFilter;
                                 const dateKey = toLocalDateStr(selectedDate);
                                 const exceptions = lunchExceptions[barberId] || {};
                                 const lunch = exceptions[dateKey] || barberLunchHours[barberId] || { start: '12:00', end: '13:00' };
                                 return (
                                   <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-2 flex flex-col justify-center items-center">
                                     <p className="text-[9px] text-amber-400 uppercase font-bold mb-1">Almuerzo</p>
                                     <p className="text-sm text-white font-black">{lunch.start} - {lunch.end}</p>
                                   </div>
                                 );
                               })()}
                               {(globalBlockedHours[globalBarberFilter]?.[toLocalDateStr(selectedDate)] || []).map(bh => (
                                 <div key={bh} className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 flex flex-col justify-center items-center relative group cursor-pointer">
                                   <p className="text-[9px] text-red-400 uppercase font-bold mb-1">Bloqueo (Pausa)</p>
                                   <p className="text-sm text-white font-black">{bh}</p>
                                   <button 
                                     onClick={() => toggleGlobalHourBlock(bh, toLocalDateStr(selectedDate), globalBarberFilter)}
                                     className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                   >
                                     <X className="w-3 h-3" />
                                   </button>
                                 </div>
                               ))}
                               <button 
                                 onClick={() => {
                                   const nextHour = prompt("Ingresa la hora a bloquear (Ej: 14:00 o 15:30):", "14:00");
                                   if (nextHour) toggleGlobalHourBlock(nextHour, toLocalDateStr(selectedDate), globalBarberFilter);
                                 }}
                                 className="bg-white/[0.02] border border-dashed border-white/20 rounded-xl px-4 py-2 flex flex-col justify-center items-center hover:bg-white/5 transition-colors col-span-2"
                               >
                                 <span className="text-xl text-slate-400 font-light">+</span>
                                 <span className="text-[9px] text-slate-400 uppercase font-bold mt-1">Añadir Bloqueo</span>
                               </button>
                            </div>
                          </>
                        );
                        })()}
                     </div>
                   </div>
                 </div>
               )}

               {/* TAB: PERMISOS */}
               {globalCitasTab === 'permisos' && (
                 <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-4">
                      {globalPermisos.map(permiso => (
                        <div key={permiso.id} className="bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30 text-orange-400">
                                <CalendarOff className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-white">{permiso.barberName}</h3>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Días Libres</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                              permiso.status === 'Pendiente' ? 'text-orange-400 bg-orange-400/10 border border-orange-400/20' :
                              permiso.status === 'Aprobado' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' :
                              'text-red-400 bg-red-400/10 border border-red-400/20'
                            }`}>
                              {permiso.status}
                            </span>
                          </div>
                          
                          <div className="bg-black/40 rounded-xl p-3 mb-4">
                            <p className="text-sm text-slate-300"><strong className="text-white">Fechas:</strong> {new Date(permiso.startDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al {new Date(permiso.endDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                            <p className="text-sm text-slate-300 mt-1"><strong className="text-white">Motivo:</strong> {permiso.reason}</p>
                          </div>

                          {permiso.status === 'Pendiente' && (
                            <div className="flex gap-3">
                              <button 
                                onClick={() => handleUpdatePermiso(permiso.id, 'Aprobado')}
                                className="flex-1 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold hover:bg-emerald-500/30 transition-colors flex justify-center items-center gap-2"
                              >
                                <Check className="w-4 h-4" /> Aprobar
                              </button>
                              <button 
                                onClick={() => handleUpdatePermiso(permiso.id, 'Denegado')}
                                className="flex-1 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold hover:bg-red-500/20 transition-colors flex justify-center items-center gap-2"
                              >
                                <X className="w-4 h-4" /> Denegar
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                 </div>
               )}
            </div>
          )}

          {adminModule === 'inventario' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-2">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-400" />
                  <h2 className="text-xl font-bold text-white tracking-tight">Inventario Global</h2>
                </div>
                {inventarioTab === 'productos' && (
                  <button
                    onClick={() => {
                      setShowAddProduct(!showAddProduct);
                      setNewProdName('');
                      setNewProdPrice('');
                      setNewProdStock('');
                      setNewProdImage('');
                      setNewProdCommission('');
                    }}
                    className="py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    {showAddProduct ? 'Cerrar' : <><Plus className="w-3.5 h-3.5" /> Nuevo Producto</>}
                  </button>
                )}
                {inventarioTab === 'servicios' && (
                  <button
                    onClick={() => {
                      setShowServiceForm(!showServiceForm);
                      setServiceInput({ name: '', price: '', duration: '', commission: '', image: '' });
                    }}
                    className="py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    {showServiceForm ? 'Cerrar' : <><Plus className="w-3.5 h-3.5" /> Nuevo Servicio</>}
                  </button>
                )}
                {inventarioTab === 'promos' && (
                  <button
                    onClick={() => {
                      setShowPromoForm(!showPromoForm);
                      setPromoInput({ name: '', regularPrice: '', promoPrice: '', image: '', description: '', expires: '', commission: '' });
                    }}
                    className="py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    {showPromoForm ? 'Cerrar' : <><Plus className="w-3.5 h-3.5" /> Nueva Promo</>}
                  </button>
                )}
              </div>

              {/* Sub-navigation tabs */}
              <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-1 flex items-center shadow-lg mb-6 overflow-x-auto no-scrollbar gap-1">
                {[
                  { id: 'productos', label: 'Productos' },
                  { id: 'servicios', label: 'Servicios' },
                  { id: 'promos', label: 'Promociones' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setInventarioTab(tab.id as any)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                      inventarioTab === tab.id 
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-[inset_0_2px_10px_rgba(53, 236, 222,0.2)]' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* PRODUCTOS TAB CONTENT */}
              {inventarioTab === 'productos' && (
                <>
                  {showAddProduct && (
                    <div className="p-4 bg-black/40 rounded-2xl border border-teal-500/20 space-y-3 mb-6 animate-in slide-in-from-top-2 duration-300">
                      <h4 className="text-xs font-bold text-white">Agregar Nuevo Producto</h4>
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="Nombre del producto"
                          value={newProdName}
                          onChange={e => setNewProdName(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input 
                            type="number" 
                            placeholder="Precio (₡)"
                            value={newProdPrice}
                            onChange={e => setNewProdPrice(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40"
                          />
                          <input 
                            type="number" 
                            placeholder="Stock inicial"
                            value={newProdStock}
                            onChange={e => setNewProdStock(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40"
                          />
                          <input 
                            type="number" 
                            placeholder="Comisión (₡)"
                            value={newProdCommission}
                            onChange={e => setNewProdCommission(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40"
                          />
                        </div>
                        <textarea 
                          placeholder="Descripción del producto (opcional)"
                          value={newProdDescription}
                          onChange={e => setNewProdDescription(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40 h-16 resize-none"
                        />
                        {!newProdImage ? (
                          <>
                            <input 
                              type="file" 
                              id="prod-image-upload" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const resized = await resizeImage(file);
                                    setNewProdImage(resized);
                                  } catch (err) {
                                    alert("Error al procesar la imagen: " + (err as Error).message);
                                  }
                                }
                              }}
                            />
                            <label htmlFor="prod-image-upload" className="w-full border border-dashed border-white/20 hover:border-teal-500/40 rounded-xl py-4 px-3 flex flex-col items-center justify-center cursor-pointer bg-black/30 hover:bg-black/50 transition-all text-slate-400 hover:text-white">
                              <Upload className="w-5 h-5 mb-1.5 text-teal-400" />
                              <span className="text-[11px] font-bold">Subir Imagen desde Dispositivo</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">La imagen se optimizará automáticamente</span>
                            </label>
                          </>
                        ) : (
                          <div className="relative w-full h-32 rounded-xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
                            <img src={newProdImage} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setNewProdImage('')}
                              className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 rounded-full text-white transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          if (!newProdName.trim() || !newProdPrice || !newProdStock) {
                            alert("Por favor ingresa nombre, precio y stock.");
                            return;
                          }
                          const imgUrl = newProdImage.trim() || 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=500&q=80';
                          const newProd = {
                            name: newProdName.trim(),
                            price: Number(newProdPrice),
                            stock: Number(newProdStock),
                            image: imgUrl,
                            commission: Number(newProdCommission) || 0,
                            description: newProdDescription.trim()
                          };
                          const { error } = await supabase
                            .from('products')
                            .insert(newProd);
                          if (!error) {
                            const { data: updatedProducts } = await supabase
                              .from('products')
                              .select('*')
                              .order('name', { ascending: true });
                            if (updatedProducts) setProducts(updatedProducts);
                            setNewProdName('');
                            setNewProdPrice('');
                            setNewProdStock('');
                            setNewProdImage('');
                            setNewProdCommission('');
                            setNewProdDescription('');
                            setShowAddProduct(false);
                            alert("Producto agregado correctamente.");
                          } else {
                            alert("Error al agregar producto: " + error.message);
                          }
                        }}
                        className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold"
                      >
                        Guardar Producto
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {products.length === 0 ? (
                      <div className="bg-black/20 border border-white/5 rounded-3xl p-8 text-center">
                        <Package className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-35" />
                        <p className="text-xs text-slate-500 italic">No hay productos en el inventario. Agrega productos reales desde el botón superior.</p>
                      </div>
                    ) : (
                      products.map(prod => (
                        <div key={prod.id} className="bg-black/35 rounded-2xl border border-white/5 p-4 flex justify-between items-center gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/50 flex-shrink-0">
                              <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white line-clamp-1">{prod.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wide ${prod.stock > 0 ? 'text-teal-400' : 'text-red-400'}`}>
                                  Stock: {prod.stock}
                                </span>
                                <span className="text-[10px] text-slate-500">•</span>
                                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide">
                                  Comisión: ₡{(prod.commission || 0).toLocaleString()}
                                </span>
                              </div>
                              
                              {/* Inline Restocking Interface */}
                              <div className="flex items-center gap-2 mt-2.5 bg-black/20 p-1.5 rounded-xl border border-white/5 w-fit">
                                <input 
                                  type="number"
                                  min="1"
                                  placeholder="+ Cantidad"
                                  value={restockInputs[prod.id] || ''}
                                  onChange={e => setRestockInputs({ ...restockInputs, [prod.id]: e.target.value })}
                                  className="w-16 bg-black/40 border border-white/10 rounded-lg py-0.5 px-2 text-[10px] text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40"
                                />
                                <button
                                  onClick={async () => {
                                    const addAmount = parseInt(restockInputs[prod.id] || '0', 10);
                                    if (isNaN(addAmount) || addAmount <= 0) {
                                      alert("Por favor ingresa una cantidad válida a sumar.");
                                      return;
                                    }
                                    const { error } = await supabase
                                      .from('products')
                                      .update({ stock: prod.stock + addAmount })
                                      .eq('id', prod.id);
                                    if (!error) {
                                      const { data: updatedProds } = await supabase
                                        .from('products')
                                        .select('*')
                                        .order('name', { ascending: true });
                                      if (updatedProds) setProducts(updatedProds);
                                      setRestockInputs({ ...restockInputs, [prod.id]: '' });
                                      alert(`Se agregaron ${addAmount} unidades al producto "${prod.name}".`);
                                    } else {
                                      alert("Error al recargar stock: " + error.message);
                                    }
                                  }}
                                  className="py-0.5 px-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-[9px] transition-all"
                                >
                                  Cargar
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-xs font-black text-white">₡{prod.price.toLocaleString()}</span>
                            <button
                              onClick={async () => {
                                if (confirm(`¿Seguro que deseas eliminar "${prod.name}" del inventario?`)) {
                                  const { error } = await supabase
                                    .from('products')
                                    .delete()
                                    .eq('id', prod.id);
                                  if (!error) {
                                    const { data: updatedProds } = await supabase
                                      .from('products')
                                      .select('*')
                                      .order('name', { ascending: true });
                                    if (updatedProds) setProducts(updatedProds);
                                  } else {
                                    alert("Error al eliminar producto: " + error.message);
                                  }
                                }
                              }}
                              className="bg-red-500/10 text-red-400 p-2 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* SERVICIOS TAB CONTENT */}
              {inventarioTab === 'servicios' && (
                <>
                  {showServiceForm && (
                    <div className="p-4 bg-black/40 rounded-2xl border border-teal-500/20 space-y-3 mb-6 animate-in slide-in-from-top-2 duration-300">
                      <h4 className="text-xs font-bold text-white">Agregar Nuevo Servicio</h4>
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="Nombre del servicio"
                          value={serviceInput.name}
                          onChange={e => setServiceInput({ ...serviceInput, name: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input 
                            type="number" 
                            placeholder="Precio (₡)"
                            value={serviceInput.price}
                            onChange={e => setServiceInput({ ...serviceInput, price: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40"
                          />
                          <select 
                            value={serviceInput.duration}
                            onChange={e => setServiceInput({ ...serviceInput, duration: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40"
                          >
                            <option value="" disabled className="text-slate-500 bg-zinc-950">Duración</option>
                            <option value="30 min" className="bg-zinc-950">30 mins</option>
                            <option value="60 min" className="bg-zinc-950">1 hora</option>
                            <option value="90 min" className="bg-zinc-950">1 hora y media</option>
                            <option value="120 min" className="bg-zinc-950">2 horas</option>
                            <option value="150 min" className="bg-zinc-950">2 horas y media</option>
                            <option value="180 min" className="bg-zinc-950">3 horas</option>
                            <option value="210 min" className="bg-zinc-950">3 horas y media</option>
                            <option value="240 min" className="bg-zinc-950">4 horas</option>
                          </select>
                          <input 
                            type="number" 
                            placeholder="Comisión Barbero (₡)"
                            value={serviceInput.commission}
                            onChange={e => setServiceInput({ ...serviceInput, commission: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40"
                          />
                        </div>
                        {!serviceInput.image ? (
                          <>
                            <input 
                              type="file" 
                              id="service-image-upload" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const resized = await resizeImage(file);
                                    setServiceInput({ ...serviceInput, image: resized });
                                  } catch (err) {
                                    alert("Error al cargar la imagen. Por favor intenta con otra.");
                                    console.error(err);
                                  }
                                }
                              }}
                            />
                            <label htmlFor="service-image-upload" className="w-full border border-dashed border-white/20 hover:border-teal-500/40 rounded-xl py-4 px-3 flex flex-col items-center justify-center cursor-pointer bg-black/30 hover:bg-black/50 transition-all text-slate-400 hover:text-white">
                              <Upload className="w-5 h-5 mb-1.5 text-teal-400" />
                              <span className="text-[11px] font-bold">Subir Imagen desde Dispositivo</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">La imagen se optimizará automáticamente</span>
                            </label>
                          </>
                        ) : (
                          <div className="relative w-full h-32 rounded-xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
                            <img src={serviceInput.image} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setServiceInput({ ...serviceInput, image: '' })}
                              className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 rounded-full text-white transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          if (!serviceInput.name.trim() || !serviceInput.price || !serviceInput.duration) {
                            alert("Por favor ingresa nombre, precio y duración.");
                            return;
                          }
                          const rawPrice = parseInt(serviceInput.price.replace(/[^\d]/g, ''), 10);
                          const formattedPrice = `₡ ${rawPrice.toLocaleString()}`;
                          const newService = {
                            name: serviceInput.name.trim(),
                            price: formattedPrice,
                            duration: serviceInput.duration,
                            commission: serviceInput.commission ? Number(serviceInput.commission) : null,
                            image: serviceInput.image || ''
                          };
                          const { error } = await supabase
                            .from('services')
                            .insert(newService);
                          if (!error) {
                            const { data: updated } = await supabase
                              .from('services')
                              .select('*')
                              .order('name', { ascending: true });
                            if (updated) setServicesList(updated);
                            setServiceInput({ name: '', price: '', duration: '', commission: '', image: '' });
                            setShowServiceForm(false);
                            alert("Servicio agregado correctamente.");
                          } else {
                            alert("Error al agregar servicio: " + error.message);
                          }
                        }}
                        className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold"
                      >
                        Guardar Servicio
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {servicesList.length === 0 ? (
                      <div className="bg-black/20 border border-white/5 rounded-3xl p-8 text-center">
                        <Scissors className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-35" />
                        <p className="text-xs text-slate-500 italic">No hay servicios en el catálogo. Agrega servicios desde el botón superior.</p>
                      </div>
                    ) : (
                      servicesList.map(serv => (
                        <div key={serv.id} className="bg-black/35 rounded-2xl border border-white/5 p-4 flex justify-between items-center gap-3 animate-in fade-in duration-300">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/50 flex-shrink-0 flex items-center justify-center border border-white/10">
                              {serv.image ? (
                                <img src={serv.image} alt={serv.name} className="w-full h-full object-cover" />
                              ) : (
                                <Scissors className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white line-clamp-1">{serv.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400">
                                  Duración: {serv.duration}
                                </span>
                                <span className="text-[10px] text-slate-500">•</span>
                                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide">
                                  Comisión: {serv.commission ? `₡${Number(serv.commission).toLocaleString()}` : '50%'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-xs font-black text-white">{typeof serv.price === 'number' ? `₡${serv.price.toLocaleString()}` : serv.price}</span>
                            <button
                              onClick={async () => {
                                if (confirm(`¿Seguro que deseas eliminar el servicio "${serv.name}"?`)) {
                                  const { error } = await supabase
                                    .from('services')
                                    .delete()
                                    .eq('id', serv.id);
                                  if (!error) {
                                    const { data: updated } = await supabase
                                      .from('services')
                                      .select('*')
                                      .order('name', { ascending: true });
                                    if (updated) setServicesList(updated);
                                  } else {
                                    alert("Error al eliminar servicio: " + error.message);
                                  }
                                }
                              }}
                              className="bg-red-500/10 text-red-400 p-2 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* PROMOS TAB CONTENT */}
              {inventarioTab === 'promos' && (
                <>
                  {showPromoForm && (
                    <div className="p-4 bg-black/40 rounded-2xl border border-teal-500/20 space-y-3 mb-6 animate-in slide-in-from-top-2 duration-300">
                      <h4 className="text-xs font-bold text-white">Agregar Nueva Promoción / Combo</h4>
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="Nombre de la promoción o combo"
                          value={promoInput.name}
                          onChange={e => setPromoInput({ ...promoInput, name: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="number" 
                            placeholder="Precio Normal (₡)"
                            value={promoInput.regularPrice}
                            onChange={e => setPromoInput({ ...promoInput, regularPrice: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                          />
                          <input 
                            type="number" 
                            placeholder="Precio Promo (₡)"
                            value={promoInput.promoPrice}
                            onChange={e => setPromoInput({ ...promoInput, promoPrice: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="text" 
                            placeholder="Ej: Válido hasta 30 Junio"
                            value={promoInput.expires}
                            onChange={e => setPromoInput({ ...promoInput, expires: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                          />
                          <input 
                            type="number" 
                            placeholder="Comisión Barbero (₡)"
                            value={promoInput.commission}
                            onChange={e => setPromoInput({ ...promoInput, commission: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                          />
                        </div>
                        <textarea 
                          placeholder="Descripción detallada de lo que incluye la promo..."
                          value={promoInput.description}
                          onChange={e => setPromoInput({ ...promoInput, description: e.target.value })}
                          rows={2}
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/40 resize-none"
                        />
                        {!promoInput.image ? (
                          <>
                            <input 
                              type="file" 
                              id="promo-image-upload" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const resized = await resizeImage(file);
                                    setPromoInput({ ...promoInput, image: resized });
                                  } catch (err) {
                                    alert("Error al cargar la imagen. Por favor intenta con otra.");
                                    console.error(err);
                                  }
                                }
                              }}
                            />
                            <label htmlFor="promo-image-upload" className="w-full border border-dashed border-white/20 hover:border-teal-500/40 rounded-xl py-4 px-3 flex flex-col items-center justify-center cursor-pointer bg-black/30 hover:bg-black/50 transition-all text-slate-400 hover:text-white">
                              <Upload className="w-5 h-5 mb-1.5 text-teal-400" />
                              <span className="text-[11px] font-bold">Subir Imagen desde Dispositivo</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">La imagen se optimizará automáticamente</span>
                            </label>
                          </>
                        ) : (
                          <div className="relative w-full h-32 rounded-xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
                            <img src={promoInput.image} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setPromoInput({ ...promoInput, image: '' })}
                              className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 rounded-full text-white transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          if (!promoInput.name.trim() || !promoInput.regularPrice || !promoInput.promoPrice) {
                            alert("Por favor ingresa nombre, precio regular y precio promo.");
                            return;
                          }
                          const newPromo = {
                            name: promoInput.name.trim(),
                            regular_price: Number(promoInput.regularPrice),
                            promo_price: Number(promoInput.promoPrice),
                            description: promoInput.description,
                            expires: promoInput.expires,
                            commission: promoInput.commission ? Number(promoInput.commission) : null,
                            image: promoInput.image || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=500&q=80',
                            active: true
                          };
                          const { error } = await supabase
                            .from('promotions')
                            .insert(newPromo);
                          if (!error) {
                            const { data: updated } = await supabase
                              .from('promotions')
                              .select('*')
                              .eq('active', true);
                            if (updated) {
                              setPromosList(updated.map(p => ({
                                id: p.id,
                                name: p.name,
                                regularPrice: p.regular_price,
                                promoPrice: p.promo_price,
                                description: p.description,
                                expires: p.expires,
                                commission: p.commission,
                                image: p.image
                              })));
                            }
                            setPromoInput({
                              name: '', regularPrice: '', promoPrice: '', image: '', description: '', expires: '', commission: ''
                            });
                            setShowPromoForm(false);
                            alert("Promoción agregada correctamente.");
                          } else {
                            alert("Error al agregar promoción: " + error.message);
                          }
                        }}
                        className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold"
                      >
                        Guardar Promoción
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {promosList.length === 0 ? (
                      <div className="bg-black/20 border border-white/5 rounded-3xl p-8 text-center">
                        <Gift className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-35" />
                        <p className="text-xs text-slate-500 italic">No hay promociones activas. Agrega promos desde el botón superior.</p>
                      </div>
                    ) : (
                      promosList.map(promo => (
                        <div key={promo.id} className="bg-black/35 rounded-2xl border border-white/5 p-4 flex justify-between items-center gap-3 animate-in fade-in duration-300">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/50 flex-shrink-0 border border-white/10">
                              <img src={promo.image} alt={promo.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white line-clamp-1">{promo.name}</h4>
                              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{promo.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {promo.expires && (
                                  <>
                                    <span className="text-[9px] text-orange-400 font-medium">
                                      {promo.expires}
                                    </span>
                                    <span className="text-[10px] text-slate-500">•</span>
                                  </>
                                )}
                                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide">
                                  Comisión: {promo.commission ? `₡${Number(promo.commission).toLocaleString()}` : 'No definida'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 line-through block">₡{Number(promo.regularPrice).toLocaleString()}</span>
                              <span className="text-xs font-black text-white block">₡{Number(promo.promoPrice).toLocaleString()}</span>
                            </div>
                            <button
                              onClick={async () => {
                                if (confirm(`¿Seguro que deseas eliminar la promoción "${promo.name}"?`)) {
                                  const { error } = await supabase
                                    .from('promotions')
                                    .delete()
                                    .eq('id', promo.id);
                                  if (!error) {
                                    const { data: updated } = await supabase
                                      .from('promotions')
                                      .select('*')
                                      .eq('active', true);
                                    if (updated) {
                                      setPromosList(updated.map(p => ({
                                        id: p.id,
                                        name: p.name,
                                        regularPrice: p.regular_price,
                                        promoPrice: p.promo_price,
                                        description: p.description,
                                        expires: p.expires,
                                        commission: p.commission,
                                        image: p.image
                                      })));
                                    }
                                  } else {
                                    alert("Error al eliminar promoción: " + error.message);
                                  }
                                }
                              }}
                              className="bg-red-500/10 text-red-400 p-2 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {adminModule === 'finanzas' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center gap-2 mb-6 px-1">
                 <DollarSign className="w-5 h-5 text-teal-400" />
                 <h2 className="text-xl font-bold text-white tracking-tight">Finanzas</h2>
               </div>
               <div className="bg-gradient-to-br from-teal-600/20 to-teal-600/10 backdrop-blur-xl border border-teal-500/20 rounded-[2rem] p-6 mb-6 shadow-xl relative overflow-hidden">
                 <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/10 blur-2xl rounded-full pointer-events-none"></div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Ingresos Totales (Mes)</p>
                 <h3 className="text-4xl font-black text-white drop-shadow-md mb-2 relative z-10">₡{totalMonthRevenue.toLocaleString()}</h3>
                 <p className="text-xs text-emerald-400 font-bold flex items-center gap-1 relative z-10">
                    <TrendingUp className="w-3 h-3" /> +12% vs mes pasado
                 </p>
               </div>

               <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-lg">
                    <Scissors className="w-6 h-6 text-slate-400 mb-2" />
                    <h4 className="text-2xl font-black text-white">{completedCutsCount}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Cortes Totales (Mes)</p>
                  </div>
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-lg">
                    <User className="w-6 h-6 text-slate-400 mb-2" />
                    <h4 className="text-2xl font-black text-white">4</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Nuevos Clientes</p>
                  </div>
               </div>

               <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-lg">
                   <h3 className="text-sm font-bold text-white mb-4">Top Barberos del Mes</h3>
                   <div className="space-y-3">
                      {customUsers
                        .filter((u: any) => u.role === 'barbero' || u.role === 'admin')
                        .map((barber: any, idx: number) => ({
                          name: barber.name,
                          amount: getBarberCutsRevenue(barber.id),
                          initial: barber.name.charAt(0).toUpperCase(),
                          bg: idx % 2 === 0
                            ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' 
                            : 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                        }))
                        .sort((a, b) => b.amount - a.amount)
                        .map((barber, index) => (
                          <div key={barber.name} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${barber.bg} font-bold flex items-center justify-center text-xs`}>
                                  {barber.initial}
                                </div>
                                <div>
                                   <p className="text-sm font-bold text-white">{barber.name}</p>
                                   <p className="text-xs text-slate-400">₡{barber.amount.toLocaleString()}</p>
                                </div>
                             </div>
                             {index === 0 ? (
                               <Award className="w-5 h-5 text-yellow-400" />
                             ) : (
                               <div className="w-5 h-5 flex items-center justify-center font-bold text-slate-500 text-xs">{index + 1}</div>
                             )}
                          </div>
                        ))}
                   </div>
                </div>
            </div>
          )}
{adminModule === 'nomina' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
               <div className="flex items-center gap-2 mb-6 px-1">
                 <Receipt className="w-5 h-5 text-teal-400" />
                 <h2 className="text-xl font-bold text-white tracking-tight">Nómina de Colaboradores</h2>
               </div>

               <div className="space-y-4">
                 {customUsers
                    .filter((u: any) => u.role === 'barbero' || u.role === 'admin')
                    .map((barber: any) => {
                      const cutsRev = getBarberCutsRevenue(barber.id);
                      const cutsCount = getBarberCutsCount(barber.id);
                      const pending = getBarberPendingCount(barber.id);
                      const productsRev = sales.filter(s => s.barberId === barber.id && s.date.startsWith(gMonthPrefix)).reduce((sum, s) => sum + s.total, 0);
                      const productsComm = sales.filter(s => s.barberId === barber.id && s.date.startsWith(gMonthPrefix)).reduce((sum, s) => sum + (s.commission || 0), 0);
                      const cutsComm = getBarberCutsCommission(barber.id);
                      const monthlyTotal = getCollaboratorMonthlyTotal(cutsComm, productsComm, 50000);
                      
                      return {
                        id: barber.id,
                        name: barber.name,
                        image: barber.image || (barber.id === '1'
                          ? 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=300&q=80'
                          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'),
                        completedCount: cutsCount,
                        completedAmount: cutsRev,
                        completedCommission: cutsComm,
                        pendingCount: pending,
                        productSales: productsRev,
                        productCommission: productsComm,
                        basePay: 50000,
                        monthlyTotal: monthlyTotal
                      };
                    })
                    .map((collab) => {
                    const isExpanded = activeCollaboratorPayId === collab.id;

                    // Dynamic Monthly Metrics
                    const collabMonthPayments = collaboratorPayments.filter(
                      p => p.collaboratorId === collab.id && 
                           p.datePaid.includes(`/${String(gMonth + 1).padStart(2, '0')}/${gYear}`)
                    );
                    const totalPaidInMonth = collabMonthPayments.reduce((sum, p) => sum + p.totalAmount, 0);

                    const lastPay = getCollaboratorLastPayment(collab.id);
                    const defaultStart = lastPay ? addDays(lastPay.endDate, 1) : getEarliestDate(collab.id);
                    const pendingAppts = globalAppointments.filter(
                      a => a.barberId === collab.id && 
                           a.status === 'Finalizada' && 
                           a.date >= defaultStart
                    );
                    const pendingSales = sales.filter(
                      s => s.barberId === collab.id && 
                           s.date >= defaultStart
                    );
                    const pendingServicesComm = pendingAppts.reduce((sum, a) => sum + getServiceCommission(a.service), 0);
                    const pendingProductsComm = pendingSales.reduce((sum, s) => sum + (s.commission || 0), 0);
                    const totalPendingInMonth = pendingServicesComm + pendingProductsComm;

                    const serviceCommission = collab.completedCommission; // Dynamic!
                    const productCommission = collab.productCommission; // Dynamic!
                    const monthName = globalMonthDate.toLocaleDateString('es-ES', { month: 'long' });

                    return (
                      <div key={collab.id} className={`bg-white/[0.02] backdrop-blur-xl border ${isExpanded ? 'border-teal-500/40 shadow-[0_0_20px_rgba(53, 236, 222,0.15)]' : 'border-white/10'} rounded-3xl overflow-hidden transition-all duration-300`}>
                        {/* Card Header Summary */}
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-slate-800">
                                <img src={collab.image} alt={collab.name} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <h3 className="text-white font-bold text-base">{collab.name}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Barbero Staff</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-sm font-black text-slate-400">Total Pagado (Mes)</p>
                              <p className="text-xl font-black text-teal-400">₡{totalPaidInMonth.toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Collapsed Stats Grid */}
                          <div className="grid grid-cols-2 gap-2 bg-black/40 rounded-2xl p-3 border border-white/5 mb-3">
                            <div>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Servicios Completados</p>
                              <p className="text-xs font-bold text-white mt-0.5">{collab.completedCount} cortes (₡{collab.completedAmount.toLocaleString()})</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Servicios Pendientes</p>
                              <p className="text-xs font-bold text-yellow-500 mt-0.5">{collab.pendingCount} citas</p>
                            </div>
                            <div className="pt-2 border-t border-white/5 col-span-2 flex justify-between items-center">
                              <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Venta Productos</p>
                                <p className="text-xs font-bold text-white mt-0.5">₡{collab.productSales.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-right">Pendiente de Liquidar</p>
                                <p className="text-xs font-bold text-slate-200 mt-0.5 text-right">₡{totalPendingInMonth.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>

                          <button
                           onClick={() => {
                             const willExpand = !isExpanded;
                             setActiveCollaboratorPayId(willExpand ? collab.id : null);
                             setPayStartDateInput('');
                             setPayEndDateInput('');
                             setPayBasePayInput('');
                           }}
                           className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 border border-white/10"
                         >
                           {isExpanded ? 'Ocultar Detalles' : 'Ver Historial y Ejecutar Pagos'}
                           <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                         </button>
                       </div>

                       {/* Expandable Panel */}
                       {isExpanded && (() => {
                         const lastPay = getCollaboratorLastPayment(collab.id);
                         const defaultStart = lastPay ? addDays(lastPay.endDate, 1) : getEarliestDate(collab.id);
                         const currentStart = payStartDateInput || defaultStart;
                         const currentEnd = payEndDateInput || toLocalDateStr(new Date());

                         // Filter data within chosen range
                         const periodAppts = globalAppointments.filter(
                           a => a.barberId === collab.id && 
                                a.status === 'Finalizada' && 
                                a.date >= currentStart && 
                                a.date <= currentEnd
                         );
                         const periodSales = sales.filter(
                           s => s.barberId === collab.id && 
                                s.date >= currentStart && 
                                s.date <= currentEnd
                         );

                         const servicesCommSum = periodAppts.reduce((sum, a) => sum + getServiceCommission(a.service), 0);
                         const productsCommSum = periodSales.reduce((sum, s) => sum + (s.commission || 0), 0);

                         const timeDiff = new Date(currentEnd + 'T12:00:00').getTime() - new Date(currentStart + 'T12:00:00').getTime();
                         const numDays = timeDiff < 0 ? 0 : Math.round(timeDiff / (1000 * 60 * 60 * 24)) + 1;
                         const calculatedBasePay = numDays > 0 ? Math.round((50000 / 30) * numDays) : 0;
                         const actualBasePay = payBasePayInput !== '' ? Number(payBasePayInput) : calculatedBasePay;
                         const totalPeriodPay = actualBasePay + servicesCommSum + productsCommSum;

                         const collabHistory = collaboratorPayments.filter(p => p.collaboratorId === collab.id);

                         return (
                           <div className="px-5 pb-5 pt-3 border-t border-white/5 bg-black/20 animate-in slide-in-from-top-2 duration-300 space-y-5">
                             {/* Execute Payment Section */}
                             <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
                               <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ejecutar Pago de Período</h4>
                               
                               <div className="space-y-2 text-xs">
                                 <div className="flex justify-between items-center">
                                   <span className="text-slate-400">Desde (Fecha de Inicio):</span>
                                   <input 
                                     type="date"
                                     value={currentStart}
                                     onChange={e => setPayStartDateInput(e.target.value)}
                                     className="bg-black/50 border border-white/10 rounded-lg py-1 px-2.5 text-xs text-white font-mono focus:outline-none focus:border-teal-500/40 text-center"
                                   />
                                 </div>
                                 <div className="flex justify-between items-center">
                                   <span className="text-slate-400">Hasta (Fecha de Liquidación):</span>
                                   <input 
                                     type="date"
                                     value={currentEnd}
                                     onChange={e => setPayEndDateInput(e.target.value)}
                                     className="bg-black/50 border border-white/10 rounded-lg py-1 px-2.5 text-xs text-white font-mono focus:outline-none focus:border-teal-500/40 text-center"
                                   />
                                 </div>
                                 <div className="flex justify-between items-center">
                                   <span className="text-slate-400">Días transcurridos:</span>
                                   <span className="text-white font-bold">{numDays} días</span>
                                 </div>
                                 <div className="flex justify-between items-center">
                                   <span className="text-slate-400">Salario base (Proporcional/Ajustable):</span>
                                   <div className="flex items-center gap-1.5">
                                     <span className="text-slate-400 text-xs">₡</span>
                                     <input 
                                       type="number"
                                       placeholder={calculatedBasePay.toString()}
                                       value={payBasePayInput}
                                       onChange={e => setPayBasePayInput(e.target.value)}
                                       className="w-24 bg-black/50 border border-white/10 rounded-lg py-1 px-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500/40 text-center"
                                     />
                                   </div>
                                 </div>
                               </div>

                               <div className="border-t border-white/5 pt-3 space-y-2 text-xs">
                                 <div className="flex justify-between">
                                   <span className="text-slate-400">Servicios completados ({periodAppts.length}):</span>
                                   <span className="text-white font-bold">₡{servicesCommSum.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between">
                                   <span className="text-slate-400">Comisión de productos:</span>
                                   <span className="text-white font-bold">₡{productsCommSum.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between text-sm font-black text-teal-400 pt-2 border-t border-white/5">
                                   <span>Total a Liquidar:</span>
                                   <span>₡{totalPeriodPay.toLocaleString()}</span>
                                 </div>
                               </div>

                               <button
                                 onClick={async () => {
                                   if (numDays <= 0) {
                                     alert("La fecha final del período debe ser posterior o igual a la fecha de inicio.");
                                     return;
                                   }
                                   if (confirm(`¿Confirmas realizar este pago por un total de ₡${totalPeriodPay.toLocaleString()} a ${collab.name}?`)) {
                                     const newPayment = {
                                       id: Date.now(),
                                       collaboratorId: collab.id,
                                       startDate: currentStart,
                                       endDate: currentEnd,
                                       datePaid: new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                                       basePay: actualBasePay,
                                       servicesAmount: servicesCommSum,
                                       productsAmount: productsCommSum,
                                       totalAmount: totalPeriodPay,
                                       services: periodAppts.map(a => ({
                                         name: a.service,
                                         date: a.date,
                                         client: a.client,
                                         price: getServicePrice(a.service),
                                         commission: getServiceCommission(a.service)
                                       })),
                                       products: periodSales.map(s => ({
                                         name: s.productName,
                                         date: s.date,
                                         quantity: s.quantity,
                                         total: s.total,
                                         commission: s.commission || 0
                                       }))
                                     };
                                     
                                     const updatedPayments = [newPayment, ...collaboratorPayments];
                                     setCollaboratorPayments(updatedPayments);
                                     
                                     const { error } = await supabase
                                       .from('app_config')
                                       .upsert({ key: 'collaborator_payments', value: updatedPayments });
                                       
                                     if (error) {
                                       console.error("Error saving payment to Supabase:", error);
                                       alert("Error al guardar el pago en la base de datos: " + error.message);
                                     } else {
                                       alert("¡Pago de período registrado correctamente!");
                                     }
                                     
                                     setPayStartDateInput('');
                                     setPayEndDateInput('');
                                     setPayBasePayInput('');
                                   }
                                 }}
                                 className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_2px_8px_rgba(53, 236, 222,0.15)] flex items-center justify-center gap-1.5"
                               >
                                 Ejecutar Pago del Período
                               </button>
                             </div>

                             {/* History of Payments */}
                             <div className="space-y-3">
                               <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Historial de Pagos</h4>
                               {collabHistory.length === 0 ? (
                                 <p className="text-[10px] text-slate-500 italic text-center py-2 bg-black/10 border border-white/5 rounded-2xl">
                                   No hay pagos registrados para este colaborador.
                                 </p>
                               ) : (
                                 <div className="space-y-2 max-h-60 overflow-y-auto">
                                   {collabHistory.map((pay) => (
                                     <div key={pay.id} className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col gap-2">
                                       <div className="flex justify-between items-center text-xs">
                                         <div>
                                           <span className="text-white font-bold block">Liquidación</span>
                                           <span className="text-slate-400 text-[9px] block font-mono mt-0.5">{pay.startDate} al {pay.endDate}</span>
                                         </div>
                                         <div className="text-right">
                                           <span className="text-emerald-400 font-black block">₡{pay.totalAmount.toLocaleString()}</span>
                                           <span className="text-[9px] text-slate-500 block font-mono mt-0.5">{pay.datePaid}</span>
                                         </div>
                                       </div>
                                       <button
                                         onClick={() => {
                                           setSelectedHistoryPay(pay);
                                           setShowPayDetailModal(true);
                                         }}
                                         className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                                       >
                                         <Info className="w-3.5 h-3.5 text-teal-400" />
                                         Ver Detalles de Servicios y Ventas
                                       </button>
                                     </div>
                                   ))}
                                 </div>
                               )}
                             </div>
                           </div>
                         );
                       })()}
                     </div>
                   );
                 })}
               </div>
            </div>
          )}

          {adminModule === 'config' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
               <div className="flex items-center gap-2 mb-6 px-1">
                 <Settings className="w-5 h-5 text-teal-400" />
                 <h2 className="text-xl font-bold text-white tracking-tight">Configuración General</h2>
               </div>

               {/* Sub-navigation tabs */}
               <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-1 flex items-center shadow-lg mb-6 overflow-x-auto no-scrollbar gap-1">
                 {[
                   { id: 'logo', label: 'Logo' },
                   { id: 'cartelera', label: 'Cartelera' },
                   { id: 'premios', label: 'Premios' },
                 ].map((tab) => (
                   <button
                     key={tab.id}
                     onClick={() => setConfigTab(tab.id as any)}
                     className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                       configTab === tab.id 
                         ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-[inset_0_2px_10px_rgba(53, 236, 222,0.2)]' 
                         : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                     }`}
                   >
                     {tab.label}
                   </button>
                 ))}
               </div>

                {/* TAB: LOGO */}
                {configTab === 'logo' && (
                  <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 shadow-lg space-y-4 animate-in fade-in duration-350">
                    <h3 className="text-sm font-bold text-white">Modificar Logo de la Marca</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">Selecciona un archivo de imagen desde tu ordenador para actualizar el logo en toda la aplicación.</p>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subir Imagen desde el Ordenador</label>
                      <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-teal-500/50 rounded-3xl p-6 bg-black/20 hover:bg-black/30 transition-all cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressedBase64 = await resizeImage(file);
                                setLogoInput(compressedBase64);
                              } catch (err) {
                                alert("Error al procesar la imagen: " + (err as Error).message);
                              }
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-teal-400 group-hover:scale-110 transition-all mb-2" />
                        <span className="text-xs text-slate-300 font-bold group-hover:text-teal-300">Seleccionar Archivo</span>
                        <span className="text-[10px] text-slate-500 mt-1">Formatos recomendados: PNG, JPG, WEBP (Máx. 2MB)</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Vista Previa</p>
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shadow-lg flex-shrink-0 bg-black/20">
                        <img src={logoInput} alt="Preview Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=200&h=200&auto=format&fit=crop"; }} />
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        await supabase
                          .from('app_config')
                          .upsert({ key: 'app_logo', value: { url: logoInput } });
                        setLogoUrl(logoInput);
                        alert("Logo actualizado con éxito en la aplicación.");
                      }}
                      className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-bold text-xs transition-all shadow-[0_4px_15px_rgba(53, 236, 222,0.2)] flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Guardar Logo
                    </button>
                  </div>
                )}

                {/* TAB: CARTELERA */}
                {configTab === 'cartelera' && (
                  <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 shadow-lg space-y-4 animate-in fade-in duration-350">
                    <h3 className="text-sm font-bold text-white">Imágenes de Cartelera</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">Estas fotos rotan en el home del cliente (carrusel de cartelera).</p>

                    {/* Add new image */}
                    <div className="space-y-3 p-3 bg-black/40 rounded-2xl border border-white/5">
                      <div className="flex flex-col gap-2">
                        <input 
                          type="file" 
                          id="cartelera-image-upload" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const resized = await resizeImage(file);
                                const updated = [...carteleraImages, resized];
                                setCarteleraImages(updated);
                                await supabase
                                  .from('app_config')
                                  .upsert({ key: 'carousel_images', value: { images: updated } });
                                alert("Imagen subida y agregada a la cartelera.");
                              } catch (err) {
                                alert("Error al cargar la imagen. Por favor intenta con otra.");
                                console.error(err);
                              }
                            }
                          }}
                        />
                        <label 
                          htmlFor="cartelera-image-upload" 
                          className="w-full border border-dashed border-white/20 hover:border-teal-500/40 rounded-xl py-4 px-3 flex flex-col items-center justify-center cursor-pointer bg-black/30 hover:bg-black/50 transition-all text-slate-400 hover:text-white"
                        >
                          <Upload className="w-5 h-5 mb-1.5 text-teal-400" />
                          <span className="text-[11px] font-bold">Subir Foto desde el Ordenador</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">Formatos aceptados: JPG, PNG, WEBP</span>
                        </label>
                      </div>
                      
                      <div className="flex gap-2 items-center">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">o agregar por link</span>
                        <div className="h-px bg-white/10 flex-1" />
                      </div>
                      
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                            placeholder="Pegar link de imagen (https://...)"
                          />
                        </div>
                        <button
                          onClick={async () => {
                            if (!newImageUrl.trim()) return;
                            const updated = [...carteleraImages, newImageUrl.trim()];
                            setCarteleraImages(updated);
                            await supabase
                              .from('app_config')
                              .upsert({ key: 'carousel_images', value: { images: updated } });
                            setNewImageUrl('');
                            alert("Imagen agregada a la cartelera.");
                          }}
                          className="py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1 flex-shrink-0 h-9"
                        >
                          <Plus className="w-3.5 h-3.5" /> Añadir Link
                        </button>
                      </div>
                    </div>

                   {/* Image list */}
                   <div className="grid grid-cols-2 gap-3">
                     {carteleraImages.map((img, idx) => (
                       <div key={idx} className="relative rounded-2xl overflow-hidden border border-white/5 bg-black/40 h-28 group" style={{ contentVisibility: 'auto' }}>
                         <img src={img} alt="Cartelera Preview" className="w-full h-full object-cover" />
                         <button
                           onClick={async () => {
                             if (confirm("¿Seguro que deseas eliminar esta imagen de la cartelera?")) {
                               const updated = carteleraImages.filter((_, i) => i !== idx);
                               setCarteleraImages(updated);
                               await supabase
                                 .from('app_config')
                                 .upsert({ key: 'carousel_images', value: { images: updated } });
                               alert("Imagen eliminada.");
                             }
                           }}
                           className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-full transition-all shadow-lg opacity-80 group-hover:opacity-100"
                         >
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* TAB: PREMIOS */}
               {configTab === 'premios' && (
                 <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 shadow-lg space-y-6 animate-in fade-in duration-350">
                   <div className="flex justify-between items-center">
                     <h3 className="text-sm font-bold text-white">Premios de Tarjeta de Lealtad</h3>
                     <button
                       onClick={async () => {
                         await supabase
                           .from('app_config')
                           .upsert({ key: 'loyalty_rewards', value: loyaltyRewards });
                         alert("Todos los premios guardados con éxito.");
                       }}
                       className="py-2 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                     >
                       <Save className="w-3.5 h-3.5" /> Guardar Todo
                     </button>
                   </div>

                    {['Básico', 'Bronce', 'Plata', 'Oro', 'Diamante'].map((tier) => {
                      const tRewards = loyaltyRewards[tier] || {};
                      const normalize = (r: any) => {
                        if (!r) return { type: 'percent', value: '' };
                        if (typeof r === 'string') {
                          const m = r.match(/(\d+)\s*%/);
                          return m ? { type: 'percent', value: m[1] } : { type: 'gift', value: r };
                        }
                        return { type: r.type || 'percent', value: r.value || '' };
                      };
                      const r1 = normalize(tRewards.reward1);
                      const r5 = normalize(tRewards.reward5);
                      const r10 = normalize(tRewards.reward10);

                      const updateReward = (field: 'reward1' | 'reward5' | 'reward10', patch: Partial<{type: string; value: string}>) => {
                        const current = normalize(tRewards[field]);
                        setLoyaltyRewards({ ...loyaltyRewards, [tier]: { ...tRewards, [field]: { ...current, ...patch } } });
                      };

                      let tierColorClass = 'text-white border-white/20';
                      if (tier === 'Básico') tierColorClass = 'text-teal-400 border-teal-400/35';
                      if (tier === 'Bronce') tierColorClass = 'text-[#CD7F32] border-[#CD7F32]/35';
                      if (tier === 'Plata') tierColorClass = 'text-slate-300 border-slate-300/35';
                      if (tier === 'Oro') tierColorClass = 'text-yellow-400 border-yellow-400/35';
                      if (tier === 'Diamante') tierColorClass = 'text-cyan-300 border-cyan-300/35';
                      const isBasico = tier === 'Básico';

                      const RewardEditor = ({ field, reward, label }: { field: 'reward1'|'reward5'|'reward10', reward: {type:string,value:string}, label: string }) => (
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                          <div className="flex rounded-xl overflow-hidden border border-white/10">
                            <button
                              onClick={() => updateReward(field, { type: 'percent' })}
                              className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${reward.type === 'percent' ? 'bg-orange-500/80 text-white' : 'bg-black/40 text-slate-500 hover:text-slate-300'}`}
                            >% Descuento</button>
                            <button
                              onClick={() => updateReward(field, { type: 'gift' })}
                              className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${reward.type === 'gift' ? 'bg-teal-600/80 text-white' : 'bg-black/40 text-slate-500 hover:text-slate-300'}`}
                            >🎁 Regalo</button>
                          </div>
                          {reward.type === 'percent' ? (
                            <div className="relative">
                              <input
                                type="number" min="0" max="100" step="10"
                                value={reward.value}
                                onChange={(e) => updateReward(field, { value: e.target.value })}
                                className="w-full bg-black/50 border border-orange-500/20 rounded-xl py-2 pl-3 pr-10 text-xs text-white focus:outline-none focus:border-orange-500/50"
                                placeholder="10, 20, 50, 100..."
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-orange-400 font-bold">%</span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={reward.value}
                              onChange={(e) => updateReward(field, { value: e.target.value })}
                              className="w-full bg-black/50 border border-teal-500/20 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-teal-500/50"
                              placeholder="Ej: Mascarilla capilar, Gel de cabello..."
                            />
                          )}
                          {reward.value && (
                            <div className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full ${reward.type === 'percent' ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20' : 'bg-teal-500/15 text-teal-300 border border-teal-500/20'}`}>
                              {reward.type === 'percent' ? (reward.value === '100' ? '🎉 GRATIS' : `${reward.value}% OFF`) : `🎁 ${reward.value}`}
                            </div>
                          )}
                        </div>
                      );

                      return (
                        <div key={tier} className={`p-4 bg-black/40 rounded-2xl border ${tierColorClass} space-y-4`}>
                          <h4 className="text-xs font-black uppercase tracking-widest">{isBasico ? 'Inicial (Básico)' : tier}</h4>
                          <div className="space-y-4">
                            {isBasico && <RewardEditor field="reward1" reward={r1} label="Premio Inicial (1 Punto)" />}
                            <RewardEditor field="reward5" reward={r5} label="Premio Medio (5 Puntos)" />
                            <RewardEditor field="reward10" reward={r10} label={isBasico ? 'Premio Mayor (10 Puntos / Ascenso a Bronce)' : 'Premio Mayor (10 Puntos / Ascenso)'} />
                          </div>
                        </div>
                      );
                    })}
                 </div>
               )}
            </div>
          )}

          {adminModule === 'perfiles' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
              <div className="flex items-center gap-2 mb-6 px-1">
                <Users className="w-5 h-5 text-teal-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">Gestión de Perfiles</h2>
              </div>

              {perfilesTab === 'menu' && (
                <div className="space-y-4">
                  <button 
                    onClick={() => {
                      setPerfilesTab('crear_barbero');
                      setNewUserName('');
                      setNewUserPhone('');
                      setNewUserDob('');
                      setNewUserPassword('');
                    }}
                    className="w-full text-left bg-gradient-to-br from-teal-600/10 to-teal-800/5 hover:from-teal-600/15 hover:to-teal-800/10 border border-teal-500/20 hover:border-teal-500/40 rounded-3xl p-5 shadow-lg transition-all duration-300 flex items-center justify-between group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform duration-300">
                        <Scissors className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm group-hover:text-teal-300 transition-colors">Crear Barbero</h4>
                        <p className="text-xs text-slate-400 mt-1">Registra nuevos barberos en la plataforma.</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all duration-300" />
                  </button>

                  <button 
                    onClick={() => {
                      setPerfilesTab('crear_cliente');
                      setNewUserName('');
                      setNewUserPhone('');
                      setNewUserDob('');
                      setNewUserPassword('');
                    }}
                    className="w-full text-left bg-gradient-to-br from-teal-600/10 to-teal-800/5 hover:from-teal-600/15 hover:to-teal-800/10 border border-teal-500/20 hover:border-teal-500/40 rounded-3xl p-5 shadow-lg transition-all duration-300 flex items-center justify-between group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform duration-300">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm group-hover:text-teal-300 transition-colors">Crear Cliente</h4>
                        <p className="text-xs text-slate-400 mt-1">Crea cuentas de clientes manualmente.</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all duration-300" />
                  </button>

                  <button 
                    onClick={() => {
                      setPerfilesTab('ver_usuarios');
                      setEditingUser(null);
                    }}
                    className="w-full text-left bg-gradient-to-br from-slate-600/10 to-slate-800/5 hover:from-slate-600/15 hover:to-slate-800/10 border border-white/10 hover:border-white/20 rounded-3xl p-5 shadow-lg transition-all duration-300 flex items-center justify-between group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform duration-300">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm group-hover:text-slate-300 transition-colors">Ver Usuarios</h4>
                        <p className="text-xs text-slate-400 mt-1">Lista, edita y elimina cuentas de clientes y barberos.</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                  </button>
                </div>
              )}

              {(perfilesTab === 'crear_barbero' || perfilesTab === 'crear_cliente') && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 mb-5">
                    <button 
                      onClick={() => setPerfilesTab('menu')}
                      className="p-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 animate-in fade-in duration-300" />
                    </button>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      {perfilesTab === 'crear_barbero' ? 'Crear Nuevo Barbero' : 'Crear Nuevo Cliente'}
                    </h3>
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newUserName.trim() || !newUserPhone.trim() || !newUserDob || !newUserPassword.trim()) {
                      alert("Por favor completa todos los campos.");
                      return;
                    }
                    const cleanPhone = newUserPhone.replace(/\s/g, '');
                    if (customUsers.some((u: any) => u.phone.replace(/\s/g, '') === cleanPhone)) {
                      alert("Ya existe un usuario con este número de celular.");
                      return;
                    }

                    const isBarber = perfilesTab === 'crear_barbero';
                    const newId = String(Date.now());
                    const newUserObj = {
                      id: newId,
                      name: newUserName.trim(),
                      phone: cleanPhone,
                      dob: newUserDob,
                      password: newUserPassword.trim(),
                      role: isBarber ? 'barbero' : 'cliente',
                      image: null,
                      createdAt: toLocalDateStr(new Date())
                    };

                    setCustomUsers([...customUsers, newUserObj]);
                    alert(`¡Usuario (${isBarber ? 'Barbero' : 'Cliente'}) creado con éxito!`);
                    setPerfilesTab('menu');
                  }} className="space-y-4 text-left">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Nombre Completo</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej: Juan Pérez"
                        value={newUserName}
                        onChange={e => setNewUserName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 px-4 text-xs text-white focus:outline-none focus:border-teal-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Número de Celular</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="Ej: 8888 8888"
                        value={newUserPhone}
                        onChange={e => setNewUserPhone(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 px-4 text-xs text-white focus:outline-none focus:border-teal-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Fecha de Nacimiento</label>
                      <input 
                        type="date" 
                        required
                        value={newUserDob}
                        onChange={e => setNewUserDob(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 px-4 text-xs text-white focus:outline-none focus:border-teal-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Crear Contraseña</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={newUserPassword}
                        onChange={e => setNewUserPassword(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 px-4 text-xs text-white focus:outline-none focus:border-teal-500/50 font-mono"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white rounded-full py-4 text-xs font-bold transition-all mt-4 active:scale-[0.98] shadow-[0_8px_20px_rgba(53, 236, 222,0.25)]"
                    >
                      Guardar Cuenta
                    </button>
                  </form>
                </div>
              )}

              {perfilesTab === 'ver_usuarios' && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <button 
                      onClick={() => {
                        setPerfilesTab('menu');
                        setEditingUser(null);
                      }}
                      className="p-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ver Usuarios</h3>
                  </div>

                  {/* Sub tabs: Clientes / Barberos */}
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-1 flex">
                    <button 
                      onClick={() => {
                        setVerUsuariosRole('cliente');
                        setEditingUser(null);
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${verUsuariosRole === 'cliente' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Clientes
                    </button>
                    <button 
                      onClick={() => {
                        setVerUsuariosRole('barbero');
                        setEditingUser(null);
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${verUsuariosRole === 'barbero' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Barberos
                    </button>
                  </div>

                  {/* Edit User View */}
                  {editingUser ? (
                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-300 text-left">
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                        <div>
                          <h4 className="font-bold text-white text-sm">Editar Cuenta</h4>
                          <p className="text-[10px] text-teal-400 uppercase tracking-widest font-bold mt-0.5">{editingUser.role}</p>
                        </div>
                        <button 
                          onClick={() => setEditingUser(null)}
                          className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Nombre Completo</label>
                          <input 
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:border-teal-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Número de Celular</label>
                          <input 
                            type="tel"
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:border-teal-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Contraseña</label>
                          <input 
                            type="text"
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:border-teal-500/50 font-mono"
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 px-1 font-medium">
                          Registrado: {editingUser.createdAt || 'N/A'} • Nacimiento: {editingUser.dob || 'N/A'}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => {
                            if (window.confirm("¿Seguro que deseas eliminar esta cuenta? Esta acción no se puede deshacer.")) {
                              setCustomUsers(customUsers.filter((u: any) => u.id !== editingUser.id));
                              alert("Usuario eliminado correctamente.");
                              setEditingUser(null);
                            }
                          }}
                          className="flex-1 bg-red-600/20 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white rounded-full py-3.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                        <button 
                          onClick={() => {
                            if (!editName.trim() || !editPhone.trim() || !editPassword.trim()) {
                              alert("Completa todos los campos.");
                              return;
                            }
                            const cleanP = editPhone.replace(/\s/g, '');
                            if (customUsers.some((u: any) => u.id !== editingUser.id && u.phone.replace(/\s/g, '') === cleanP)) {
                              alert("Este celular ya está registrado por otro usuario.");
                              return;
                            }
                            setCustomUsers(customUsers.map((u: any) => u.id === editingUser.id ? {
                              ...u,
                              name: editName.trim(),
                              phone: cleanP,
                              password: editPassword.trim()
                            } : u));
                            alert("Datos actualizados correctamente.");
                            setEditingUser(null);
                          }}
                          className="flex-1 bg-teal-600 hover:bg-teal-500 text-white border border-teal-500 rounded-full py-3.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(53, 236, 222,0.2)]"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Users List */
                    <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                      {customUsers.filter((u: any) => u.role === (verUsuariosRole === 'cliente' ? 'cliente' : 'barbero')).length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-500 font-bold border border-dashed border-white/5 rounded-2xl">
                          No hay usuarios de este tipo registrados.
                        </div>
                      ) : (
                        customUsers
                          .filter((u: any) => u.role === (verUsuariosRole === 'cliente' ? 'cliente' : 'barbero'))
                          .map((u: any) => (
                            <div 
                              key={u.id}
                              onClick={() => {
                                setEditingUser(u);
                                setEditName(u.name);
                                setEditPhone(u.phone);
                                setEditPassword(u.password);
                              }}
                              className="w-full text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl p-4 flex justify-between items-center transition-all duration-200 cursor-pointer hover:translate-x-0.5 active:scale-[0.99] group"
                            >
                              <div className="flex items-center gap-3">
                                {u.image ? (
                                  <img src={u.image} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-bold text-xs text-teal-400 shrink-0">
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-xs font-bold text-white">{u.name}</h4>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Cel: {u.phone}</p>
                                </div>
                              </div>
                              <Edit2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


        </div>

        {/* Dynamic Payment Detail Modal */}
        {showPayDetailModal && selectedHistoryPay && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[999] p-4 animate-in fade-in duration-300">
            <div className="bg-[#0e0e11] border border-white/10 rounded-[2rem] w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
              
              <div className="p-5 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                <div>
                  <h3 className="font-black text-white text-sm">Detalle de Pago</h3>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono mt-0.5">
                    {selectedHistoryPay.startDate} al {selectedHistoryPay.endDate}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowPayDetailModal(false);
                    setSelectedHistoryPay(null);
                  }}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-0">
                {/* Financial Summary */}
                <div className="bg-teal-500/5 border border-teal-500/10 rounded-2xl p-4 space-y-2 text-[11px]">
                  <h4 className="font-bold text-teal-300 text-[10px] uppercase tracking-wider mb-2">Resumen de Liquidación</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Salario Base Fijo:</span>
                    <span className="text-white font-bold">₡{selectedHistoryPay.basePay.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Comisión Servicios (50%):</span>
                    <span className="text-white font-bold">₡{selectedHistoryPay.servicesAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Comisión Productos:</span>
                    <span className="text-white font-bold">₡{selectedHistoryPay.productsAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-teal-400 pt-2 border-t border-white/5">
                    <span>Total Pagado:</span>
                    <span>₡{selectedHistoryPay.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Services Completed list */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-[10px] uppercase tracking-widest flex items-center gap-1">
                    <Scissors className="w-3 h-3 text-teal-400" />
                    Servicios Realizados ({selectedHistoryPay.services?.length || 0})
                  </h4>
                  {(!selectedHistoryPay.services || selectedHistoryPay.services.length === 0) ? (
                    <p className="text-[9px] text-slate-500 italic bg-black/20 p-3 rounded-xl border border-white/5 text-center">No se incluyeron servicios en este pago.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto bg-black/20 p-2.5 rounded-xl border border-white/5">
                      {selectedHistoryPay.services.map((serv: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[9px] border-b border-white/5 pb-1.5 last:border-b-0 last:pb-0">
                          <div>
                            <span className="text-white font-bold block">{serv.name}</span>
                            <span className="text-slate-500 font-medium block">Cliente: {serv.client} | {serv.date}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block">₡{serv.price.toLocaleString()}</span>
                            <span className="text-emerald-400 font-bold block">Comisión: ₡{serv.commission.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Products Sold list */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-[10px] uppercase tracking-widest flex items-center gap-1">
                    <Package className="w-3 h-3 text-teal-400" />
                    Productos Vendidos ({selectedHistoryPay.products?.length || 0})
                  </h4>
                  {(!selectedHistoryPay.products || selectedHistoryPay.products.length === 0) ? (
                    <p className="text-[9px] text-slate-500 italic bg-black/20 p-3 rounded-xl border border-white/5 text-center">No se incluyeron ventas de productos en este pago.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto bg-black/20 p-2.5 rounded-xl border border-white/5">
                      {selectedHistoryPay.products.map((prod: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[9px] border-b border-white/5 pb-1.5 last:border-b-0 last:pb-0">
                          <div>
                            <span className="text-white font-bold block">{prod.name}</span>
                            <span className="text-slate-500 font-medium block">Cant: {prod.quantity} | {prod.date}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block">Venta: ₡{prod.total.toLocaleString()}</span>
                            <span className="text-emerald-400 font-bold block">Comisión: ₡{prod.commission.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
