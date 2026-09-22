import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar as CalendarIcon, CalendarOff, Scissors, CheckCircle, Clock, Info, User, ChevronRight, Grid, Home, ShoppingBag, Award, Tag, X, Gift, AlertTriangle, Edit2, Camera, Save, Cake, Star, LogOut, Lock } from 'lucide-react';
import { supabase } from './lib/supabase';

// Helper: converts a Date to YYYY-MM-DD using LOCAL date (avoids UTC timezone shift)
const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Helper to resize and compress images using HTML5 Canvas
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250; // client avatar only needs to be small
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
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};


const DEFAULT_BARBERS = [
  { id: 1, name: 'Carlos Barbero', role: 'Master Barber', image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=300&q=80' }
];

const SERVICES = [
  { id: 1, name: 'Corte Clásico', price: '₡ 6,000', duration: '30 min' },
  { id: 2, name: 'Corte + Barba', price: '₡ 9,000', duration: '45 min' },
  { id: 3, name: 'Fade / Degradado', price: '₡ 7,000', duration: '40 min' },
  { id: 4, name: 'Perfilado de Barba', price: '₡ 4,000', duration: '20 min' }
];

const TIMES = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
];

const CAROUSEL_IMAGES = [
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1521484346853-3cbaf92100cb?auto=format&fit=crop&w=1200&q=80'
];

const PRODUCTS = [
  { id: 1, name: 'Cera Moldeadora Matte', price: '₡ 8,500', image: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=500&q=80', description: 'Cera de fijación fuerte y acabado mate natural. Ideal para peinados con textura y volumen sin dejar residuos.' },
  { id: 2, name: 'Aceite Premium Barba', price: '₡ 12,000', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=500&q=80', description: 'Fórmula enriquecida que hidrata la piel profunda y suaviza el vello facial. Aroma masculino a madera y cítricos.' },
  { id: 3, name: 'Tónico Capilar', price: '₡ 10,500', image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=500&q=80', description: 'Refresca el cuero cabelludo, previene la caspa y estimula el crecimiento saludable del cabello.' },
  { id: 4, name: 'Kit de Cuidado', price: '₡ 22,000', image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=500&q=80', description: 'El combo perfecto para el hombre moderno. Incluye cepillo, aceite y jabón especial para barba.' },
];

const PROMOS = [
  {
    id: 1,
    name: 'Combo Padre e Hijo',
    regularPrice: '₡ 12,000',
    promoPrice: '₡ 9,500',
    image: 'https://images.unsplash.com/photo-1593702288056-b485ff7137f6?auto=format&fit=crop&w=800&q=80',
    description: 'Disfruta de un momento especial. Corte clásico para papá y para el más pequeño de la casa. El mejor estilo para los dos.',
    expires: 'Válido de Lunes a Miércoles hasta el 30 de Junio'
  },
  {
    id: 2,
    name: 'Corte + Barba Premium',
    regularPrice: '₡ 9,000',
    promoPrice: '₡ 7,500',
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    description: 'Servicio completo para los que buscan la perfección. Incluye lavado, corte con asesoría, perfilado de barba con toalla caliente.',
    expires: 'Válido hasta el 15 de Julio'
  }
];

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

// Helper to resolve service name duration in minutes
const getServiceDurationMinutes = (serviceName: string, servicesList: any[]): number => {
  const s = servicesList.find((srv: any) => srv.name.toLowerCase() === serviceName.toLowerCase());
  if (s && s.duration) {
    const minVal = parseInt(s.duration.replace('min', '').trim(), 10);
    if (!isNaN(minVal)) return minVal;
  }
  return 45; // fallback default
};

export default function Dashboard({ onLogout, onReady }: { onLogout?: () => void; onReady?: () => void }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [step, setStep] = useState(0); // 0 is default dashboard
  const [booking, setBooking] = useState<any>({ barber: null, date: null, time: null, service: null });
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [barbersList, setBarbersList] = useState<any[]>(DEFAULT_BARBERS);
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=200&h=200&auto=format&fit=crop');
  const [carteleraImages, setCarteleraImages] = useState<string[]>(CAROUSEL_IMAGES);
  const [promosList, setPromosList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>(SERVICES);
  
  // Combine servicesList and active promotions
  const combinedServices = [
    ...servicesList,
    ...(promosList || []).map(p => ({
      id: `promo-${p.id}`,
      name: `${p.name} (Promo)`,
      price: p.promoPrice || p.promo_price || '',
      duration: '45 min',
      image: p.image || null,
      isPromo: true
    }))
  ];
  
  const DEFAULT_LOYALTY_REWARDS = {
    Básico:   { reward1: 'Premio Inicial (1 pt)', reward5: 'Premio Medio (5 pt)', reward10: 'Ascenso a Bronce' },
    Bronce:   { reward5: 'Descuento 10%', reward10: 'Corte gratis' },
    Plata:    { reward5: 'Descuento 15%', reward10: 'Corte + Barba gratis' },
    Oro:      { reward5: 'Descuento 20%', reward10: 'Servicio premium gratis' },
    Diamante: { reward5: 'Descuento 25%', reward10: 'Kit completo gratis' },
  };
  const [loyaltyRewards, setLoyaltyRewards] = useState<any>(DEFAULT_LOYALTY_REWARDS);
  const [barberLunchHours, setBarberLunchHours] = useState<Record<string, { start: string, end: string }>>({
    '1': { start: '12:00', end: '13:00' },
    '2': { start: '13:00', end: '14:00' }
  });
  const [lunchExceptions, setLunchExceptions] = useState<Record<string, Record<string, { start: string, end: string }>>>({});

  const [barberSchedules, setBarberSchedules] = useState<any>({});
  const [permisosList, setPermisosList] = useState<any[]>([]);
  const [blockedHours, setBlockedHours] = useState<any>({});
  const [globalAppointmentsList, setGlobalAppointmentsList] = useState<any[]>([]);

  // Fetch real profile data and all collections from Supabase
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);

        // Fire ALL independent queries in parallel
        const [
          { data: profile },
          { data: barbers },
          { data: appConfigs },
          { data: promos },
          { data: services },
          { data: products },
          { data: appts },        // Only this client's appointments — not everyone's
          { data: exceptions },
          { data: permisos },
          { data: blocks },
        ] = await Promise.all([
          // Only fetch needed columns for the client profile
          supabase.from('profiles').select('full_name, phone, preferences, avatar_url, birthday, loyalty_points, loyalty_tier').eq('id', user.id).maybeSingle(),
          supabase.from('profiles').select('id, full_name, role, avatar_url').or('role.eq.barber,role.eq.barbero,role.eq.admin'),
          supabase.from('app_config').select('key, value').in('key', [
            'app_logo', 'carousel_images', 'barber_schedules', 'barber_lunch_hours', 'loyalty_rewards'
          ]),
          supabase.from('promotions').select('*').eq('active', true),
          supabase.from('services').select('*').order('name', { ascending: true }),
          supabase.from('products').select('*').order('name', { ascending: true }),
          // Filter by client_id — avoids fetching the entire appointments table
          supabase.from('appointments').select('id, barber_id, barber_name, client_name, client_id, service_name, time, date, status').eq('client_id', user.id).order('created_at', { ascending: false }),
          supabase.from('lunch_exceptions').select('barber_id, date, start_time, end_time, is_off'),
          supabase.from('permisos').select('id, barber_id, barber_name, start_date, end_date, reason, status'),
          supabase.from('blocked_hours').select('barber_id, date, time'),
        ]);

        // Process user profile
        if (profile) {
          let daysToBday = 0;
          if (profile.birthday) {
            const today = new Date();
            const bday = new Date(profile.birthday);
            bday.setFullYear(today.getFullYear());
            if (bday < today) {
              bday.setFullYear(today.getFullYear() + 1);
            }
            const diffTime = Math.abs(bday.getTime() - today.getTime());
            daysToBday = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }

          setProfileData({
            name: profile.full_name,
            phone: profile.phone,
            preferences: profile.preferences || '',
            daysToBirthday: daysToBday,
            image: profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            birthdayExpiration: '23 de Mayo'
          });

          setLoyalty({
            points: profile.loyalty_points || 0,
            tier: profile.loyalty_tier || 'Básico'
          });
        }

        // Process barbers list
        if (barbers && barbers.length > 0) {
          setBarbersList(barbers.map(b => ({
            id: b.id,
            name: b.full_name,
            role: b.role === 'admin' ? 'Barbero Administrador' : 'Barbero',
            image: b.avatar_url || 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=300&q=80'
          })));
        }

        // Process all app_config keys from the single batched query
        const configMap: Record<string, any> = {};
        (appConfigs || []).forEach((c: any) => { configMap[c.key] = c.value; });
        if (configMap['app_logo']?.url) setLogoUrl(configMap['app_logo'].url);
        if (Array.isArray(configMap['carousel_images']?.images)) setCarteleraImages(configMap['carousel_images'].images);
        if (configMap['barber_schedules']) setBarberSchedules(configMap['barber_schedules']);
        if (configMap['barber_lunch_hours']) setBarberLunchHours(configMap['barber_lunch_hours']);
        if (configMap['loyalty_rewards']) setLoyaltyRewards(configMap['loyalty_rewards']);

        // Process promotions
        if (promos) setPromosList(promos);

        // Process services
        if (services && services.length > 0) setServicesList(services);

        // Process products
        if (products && products.length > 0) setProductsList(products);

        // Process appointments (already filtered to this client's only)
        if (appts) {
          setGlobalAppointmentsList((appts as any[]).map(a => ({
            id: a.id,
            barberId: String(a.barber_id || '1'),
            barberName: a.barber_name || 'Barbero',
            client: a.client_name || 'Cliente',
            clientId: a.client_id,
            service: a.service_name || 'Servicio',
            time: a.time || '',
            date: a.date || '',
            status: a.status?.startsWith('Finalizada') ? 'Finalizada' : (a.status || 'Pendiente'),
            rawStatus: a.status || 'Pendiente',
            discount: (() => {
              const match = String(a.status).match(/Loyalty\s+(\d+)%/i);
              return match ? parseInt(match[1], 10) : 0;
            })()
          })));
        }

        // Process lunch exceptions
        if (exceptions) {
          const grouped: any = {};
          exceptions.forEach(e => {
            if (!grouped[e.barber_id]) grouped[e.barber_id] = {};
            grouped[e.barber_id][e.date] = { start: e.start_time, end: e.end_time, isOff: e.is_off };
          });
          setLunchExceptions(grouped);
        }

        // Process permisos
        if (permisos) {
          setPermisosList(permisos.map(p => ({
            id: p.id,
            barberId: p.barber_id,
            barberName: p.barber_name,
            startDate: p.start_date,
            endDate: p.end_date,
            reason: p.reason,
            status: p.status
          })));
        }

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
          setBlockedHours(grouped);
        }
      }
      onReady?.();
    };
    
    loadData();

    // Subscribe to Realtime — only this client's appointments
    let currentUserId: string | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      currentUserId = user?.id || null;
    });

    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        async () => {
          if (!currentUserId) return;
          const { data: appts } = await supabase
            .from('appointments')
            .select('id, barber_id, barber_name, client_name, client_id, service_name, time, date, status')
            .eq('client_id', currentUserId)
            .order('created_at', { ascending: false });
          if (appts) {
            setGlobalAppointmentsList((appts as any[]).map(a => ({
              id: a.id,
              barberId: String(a.barber_id || '1'),
              barberName: a.barber_name || 'Barbero',
              client: a.client_name || 'Cliente',
              clientId: a.client_id,
              service: a.service_name || 'Servicio',
              time: a.time || '',
              date: a.date || '',
              status: a.status?.startsWith('Finalizada') ? 'Finalizada' : (a.status || 'Pendiente'),
              rawStatus: a.status || 'Pendiente',
              discount: (() => {
                const match = String(a.status).match(/Loyalty\s+(\d+)%/i);
                return match ? parseInt(match[1], 10) : 0;
              })()
            })));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Profile State
  const [profileData, setProfileData] = useState({
    name: 'Cliente',
    phone: '',
    image: '',
    preferences: '',
    daysToBirthday: 0,
    birthdayExpiration: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showBirthdayCoupon, setShowBirthdayCoupon] = useState(false);
  const [editForm, setEditForm] = useState({ phone: '', image: '' });
  const [prefText, setPrefText] = useState('');

  // Sync prefText and editForm when database profileData is loaded
  useEffect(() => {
    setPrefText(profileData.preferences || '');
    setEditForm({ phone: profileData.phone || '', image: profileData.image || '' });
  }, [profileData.preferences, profileData.phone, profileData.image]);

  // User ID from Supabase
  const [userId, setUserId] = useState<string | null>(null);

  // Loyalty State
  const [loyalty, setLoyalty] = useState({
    points: 7, // mock progress
    tier: 'Bronce' // 'Básico', 'Bronce', 'Plata', 'Oro', 'Diamante'
  });
  const [showRules, setShowRules] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const [activeApptTab, setActiveApptTab] = useState<'upcoming' | 'completed'>('upcoming');

  // Timeline Drag Scroll State
  const timelineRef = React.useRef<HTMLDivElement>(null);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [timelineStartX, setTimelineStartX] = useState(0);
  const [timelineScrollLeft, setTimelineScrollLeft] = useState(0);

  // Auto-scroll timeline to current active range
  useEffect(() => {
    if (activeNav === 'loyalty' && timelineRef.current) {
      const tierOrder: Record<string, number> = { 'Básico': 0, 'Bronce': 1, 'Plata': 2, 'Oro': 3, 'Diamante': 4 };
      const currentTierIndex = tierOrder[loyalty.tier] || 0;
      const targetIndex = currentTierIndex === 0 ? 1 : currentTierIndex;
      
      const isMobile = window.innerWidth < 640;
      const itemWidth = isMobile ? 120 : 140;
      const gap = 48; // gap-12 is 48px
      const scrollOffset = (targetIndex - 1) * (itemWidth + gap);
      
      setTimeout(() => {
        if (timelineRef.current) {
          timelineRef.current.scrollTo({
            left: scrollOffset,
            behavior: 'smooth'
          });
        }
      }, 150);
    }
  }, [activeNav, loyalty.tier]);

  // Shop & Promo State
  const [productsList, setProductsList] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedPromo, setSelectedPromo] = useState<any>(null);

  const [expandedApptId, setExpandedApptId] = useState<string | number | null>(null);
  const [cancelingApptId, setCancelingApptId] = useState<string | number | null>(null);

  // Derive client's personal appointments from globalAppointmentsList
  const appointments = globalAppointmentsList
    .filter(a => a.clientId === userId)
    .map(a => {
      const barberObj = barbersList.find(b => String(b.id) === String(a.barberId)) 
        || { id: a.barberId, name: a.barberName || 'Barbero', role: 'Barbero', image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=300&q=80' };
      const serviceObj = combinedServices.find(s => s.name === a.service) || { name: a.service, price: '₡ 6,000', duration: '30 min' };
      
      return {
        id: a.id,
        barber: barberObj,
        date: new Date(a.date + 'T12:00:00'),
        time: a.time,
        service: serviceObj,
        status: a.status === 'Pendiente' ? 'Confirmada' : a.status === 'Finalizada' ? 'Finalizada' : 'Cancelada',
        discount: a.discount || 0,
        rawStatus: a.rawStatus || 'Pendiente'
      };
    });

  const upcomingAppointments = appointments.filter(appt => appt.status === 'Confirmada');
  const completedAppointments = appointments.filter(appt => appt.status === 'Finalizada');

  // Helpers
  const getTierDetails = (tier: string) => {
    switch (tier) {
      case 'Bronce': return { color: 'text-[#CD7F32]', bg: 'bg-[#CD7F32]/20', border: 'border-[#CD7F32]/40', next: 'Plata' };
      case 'Plata': return { color: 'text-slate-300', bg: 'bg-slate-300/20', border: 'border-slate-300/40', next: 'Oro' };
      case 'Oro': return { color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/40', next: 'Diamante' };
      case 'Diamante': return { color: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-400/30', next: 'Diamante (Máximo)' };
      default: return { color: 'text-white', bg: 'bg-white/10', border: 'border-white/20', next: 'Bronce' };
    }
  };
  const tierDetails = getTierDetails(loyalty.tier);

  // Week generation
  const today = new Date();
  const weekDays = Array.from({length: 7}).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + i);
    return d;
  });

  // Month generation
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay(); // 0=Sun
  const monthDays = Array.from({length: daysInMonth}).map((_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
    return d;
  });
  const monthName = today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (carteleraImages.length === 0) return;
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % carteleraImages.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [carteleraImages]);

  // Fetch real profile data from Supabase
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          // Calculate days to birthday
          let daysToBday = 0;
          if (profile.birthday) {
            const today = new Date();
            const bday = new Date(profile.birthday);
            bday.setFullYear(today.getFullYear());
            if (bday < today) {
              bday.setFullYear(today.getFullYear() + 1);
            }
            const diffTime = Math.abs(bday.getTime() - today.getTime());
            daysToBday = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }

          setProfileData(prev => ({
            ...prev,
            name: profile.full_name,
            phone: profile.phone.replace('+506', ''),
            preferences: profile.preferences || '',
            daysToBirthday: daysToBday,
            image: profile.avatar_url || prev.image
          }));

          setLoyalty({
            points: profile.loyalty_points || 0,
            tier: profile.loyalty_tier || 'Básico'
          });
        }
      }
    };
    loadProfile();
  }, []);

  const handleNext = (key: string, value: any) => {
    setBooking((prev: any) => ({ ...prev, [key]: value }));
    setStep((prevStep: number) => {
      if (prevStep === 1 && booking.service) {
        return 3; // Skip step 2 (service selection)
      }
      return prevStep + 1;
    });
  };

  const handleServiceSelectNext = (service: any) => {
    setBooking((prev: any) => ({ ...prev, service }));
    setStep(3);
  };

  const handleTimeSelectSave = async (time: string) => {
    const newBooking = { ...booking, time };
    setBooking(newBooking);
    setStep(4);
    
    if (newBooking.barber && newBooking.date && newBooking.service && userId) {
      const newGlobalAppt = {
        client_id: userId,
        client_name: profileData.name || 'Cliente',
        barber_id: newBooking.barber.id,
        barber_name: newBooking.barber.name,
        service_name: newBooking.service.name,
        time: time,
        date: toLocalDateStr(newBooking.date),
        status: 'Pendiente'
      };
      
      const { data, error } = await supabase
        .from('appointments')
        .insert(newGlobalAppt)
        .select()
        .single();
        
      if (error) {
        alert("Error al agendar cita: " + error.message);
      } else if (data) {
        // Immediately add appointment to local state so it shows instantly
        const newApptEntry = {
          id: data.id,
          barberId: String(newBooking.barber.id),
          barberName: newBooking.barber.name,
          client: profileData.name || 'Cliente',
          clientId: userId,
          service: newBooking.service.name,
          time: time,
          date: toLocalDateStr(newBooking.date),
          status: 'Pendiente'
        };
        setGlobalAppointmentsList((prev: any[]) => [newApptEntry, ...prev]);
      }
    }
  };

  const handleCancelAppt = async (appt: any) => {
      const timeParts = appt.time.match(/(\d+):(\d+) (AM|PM)/);
      let hours = parseInt(timeParts[1]);
      const mins = parseInt(timeParts[2]);
      const ampm = timeParts[3];
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      const aptDateTime = new Date(appt.date);
      aptDateTime.setHours(hours, mins, 0, 0);
      
      const now = new Date();
      const diffMs = aptDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const { error: apptError } = await supabase
        .from('appointments')
        .update({ status: 'Cancelada' })
        .eq('id', appt.id);
        
      if (!apptError && userId) {
        if (diffHours >= 0 && diffHours < 1) {
          const finalPoints = Math.max(0, loyalty.points - 3);
          alert("Has cancelado la cita. Como fue con menos de 1 hora de anticipación, se te han restado 3 puntos por penalización.");
          
          let newTier = 'Básico';
          if (finalPoints >= 40) newTier = 'Diamante';
          else if (finalPoints >= 30) newTier = 'Oro';
          else if (finalPoints >= 20) newTier = 'Plata';
          else if (finalPoints >= 10) newTier = 'Bronce';
          
          await supabase
            .from('profiles')
            .update({ loyalty_points: finalPoints, loyalty_tier: newTier })
            .eq('id', userId);
            
          setLoyalty({ points: finalPoints, tier: newTier });
        } else {
          alert("Cita cancelada con éxito.");
        }

        // Clean up lunch exception if no remaining conflicts on this date for this barber
        const barberId = String(appt.barberId);
        const dateKey = String(appt.date);
        
        const { data: remainingAppts } = await supabase
          .from('appointments')
          .select('id')
          .eq('barber_id', barberId)
          .eq('date', dateKey)
          .eq('status', 'Pendiente');
          
        if (!remainingAppts || remainingAppts.length === 0) {
          await supabase
            .from('lunch_exceptions')
            .delete()
            .eq('barber_id', barberId)
            .eq('date', dateKey);
            
          const { data: exceptions } = await supabase
            .from('lunch_exceptions')
            .select('*');
          if (exceptions) {
            const grouped: any = {};
            exceptions.forEach(e => {
              if (!grouped[e.barber_id]) grouped[e.barber_id] = {};
              grouped[e.barber_id][e.date] = { start: e.start_time, end: e.end_time, isOff: e.is_off };
            });
            setLunchExceptions(grouped);
          }
        }
      }

      setExpandedApptId(null);
      setCancelingApptId(null);
  };

  const resetBooking = () => {
    setBooking({ barber: null, date: null, time: null, service: null });
    setStep(0);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white pb-10 font-sans selection:bg-teal-500/30 overflow-x-hidden">
      {/* Dynamic Immersive Background Spheres */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none flex items-center justify-center z-0">
        <div className="absolute w-[800px] h-[800px] animate-[spin_25s_linear_infinite]">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-teal-500/20 rounded-full blur-[120px]" />
        </div>
        <div className="absolute w-[1000px] h-[1000px] animate-[spin_35s_linear_infinite_reverse]">
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px]" />
        </div>
        <div className="absolute w-[600px] h-[600px] animate-[spin_40s_ease-in-out_infinite_alternate]">
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-teal-300/10 rounded-full blur-[100px]" />
        </div>
      </div>

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header / Topbar */}
        <div className="flex items-center justify-between p-5 pt-8 animate-in fade-in slide-in-from-left-4 duration-500">
          {/* Left: App Logo & Greeting */}
          <div className="flex items-center gap-3">
            {/* App Logo (Square) */}
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-lg flex-shrink-0 group">
              <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Hola, {profileData.name.split(' ')[0]}!</h1>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest font-bold">{loyalty.points} {loyalty.points === 1 ? 'Punto' : 'Puntos'}</p>
            </div>
          </div>

          {/* Right: User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex-shrink-0">
              <img src={profileData.image} alt={profileData.name} className="w-full h-full object-cover" />
            </div>
            {onLogout && (
              <button 
                onClick={onLogout}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors group flex-shrink-0"
              >
                <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Bar (Glassmorphism Pill) */}
        <div className="px-4 mb-6 animate-in zoom-in-95 duration-500 delay-100">
          <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 flex justify-between items-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: 'url("/background.jpg")' }} />
            
            {[
              { id: 'home', icon: Home, label: 'Inicio' },
              { id: 'shop', icon: ShoppingBag, label: 'Shop' },
              { id: 'loyalty', icon: Award, label: 'Loyalty' },
              { id: 'promos', icon: Tag, label: 'Promos' },
              { id: 'profile', icon: User, label: 'Perfil' }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    if (item.id === 'home') setStep(0); // Reset booking flow if returning home
                  }}
                  className={`relative z-10 p-3 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-white/10 shadow-[inset_0_2px_10px_rgba(53,236,222,0.1)] border border-teal-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-teal-400 drop-shadow-[0_0_10px_rgba(53,236,222,0.5)]' : 'text-slate-500'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Content area */}
        <div className="flex-1 px-4">
          
          {/* ========================================================= */}
          {/* ======================= HOME / AGENDAR ================== */}
          {/* ========================================================= */}
          {activeNav === 'home' && (
            <>
              {step === 0 && (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                  {/* Carousel */}
                  <div className="relative w-full h-52 rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-8">
                    {carteleraImages.map((img, idx) => (
                      <img 
                        key={idx}
                        src={img}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${currentImage === idx ? 'opacity-100' : 'opacity-0'}`}
                        alt="Barbershop"
                      />
                    ))}

                    {/* Dots */}
                    <div className="absolute bottom-4 right-4 flex gap-1.5">
                      {carteleraImages.map((_, idx) => (
                        <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${currentImage === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`} />
                      ))}
                    </div>
                  </div>

                  {/* Action Button - Premium Glassmorphism Pill */}
                  <button 
                    onClick={() => {
                      setBooking({ barber: null, date: null, time: null, service: null });
                      setStep(1);
                    }}
                    className="w-full bg-white/5 backdrop-blur-xl border border-white/10 border-t-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-white hover:bg-white/10 rounded-full py-4 text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98] mb-10"
                  >
                    <CalendarIcon className="w-5 h-5" />
                    AGENDAR NUEVA CITA
                  </button>

                  {/* Appointments Tab Selector */}
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-6">
                      <button
                        onClick={() => { setActiveApptTab('upcoming'); setExpandedApptId(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition-all duration-300 ${
                          activeApptTab === 'upcoming'
                            ? 'bg-white/10 text-white shadow-lg border border-white/5'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        PRÓXIMAS CITAS
                      </button>
                      <button
                        onClick={() => { setActiveApptTab('completed'); setExpandedApptId(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition-all duration-300 ${
                          activeApptTab === 'completed'
                            ? 'bg-white/10 text-white shadow-lg border border-white/5'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Scissors className="w-4 h-4" />
                        CORTES REALIZADOS
                      </button>
                    </div>

                    <div className="space-y-3">
                      {activeApptTab === 'upcoming' ? (
                        upcomingAppointments.length === 0 ? (
                          <p className="text-xs text-slate-500 italic text-center py-6 bg-white/[0.02] rounded-3xl border border-white/5">No tienes citas programadas.</p>
                        ) : (
                          upcomingAppointments.map(appt => {
                            const isExpanded = expandedApptId === appt.id;
                            const isCanceling = cancelingApptId === appt.id;
                            
                            return (
                              <div key={appt.id} className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-lg transition-all duration-300">
                                {/* Appt Header (Clickable) */}
                                <button 
                                  onClick={() => {
                                    if (isExpanded) {
                                      setExpandedApptId(null);
                                      setCancelingApptId(null);
                                    } else {
                                      setExpandedApptId(appt.id);
                                      setCancelingApptId(null);
                                    }
                                  }}
                                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shadow-md">
                                      <img src={appt.barber.image} className="w-full h-full object-cover" alt="B" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm font-bold text-white">{appt.barber.name}</p>
                                      <p className="text-xs text-slate-400 font-medium mt-0.5 capitalize">
                                        {appt.date?.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} • {appt.time}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-1">
                                    <span className="bg-white/10 text-white text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-widest border border-white/10 backdrop-blur-md">
                                      {appt.status}
                                    </span>
                                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                  </div>
                                </button>

                                {/* Expanded Details Section */}
                                {isExpanded && (
                                  <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="pt-4 border-t border-white/5 space-y-3">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">Servicio</span>
                                        <span className="text-white font-bold">{appt.service?.name}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">Duración estimada</span>
                                        <span className="text-white font-medium">{appt.service?.duration}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs pb-3 border-b border-white/5">
                                        <span className="text-slate-400">Total a pagar</span>
                                        <span className="text-white font-black">{appt.service?.price}</span>
                                      </div>

                                      {(!isCanceling && appt.status !== 'Cancelada') ? (
                                        <button 
                                          onClick={() => setCancelingApptId(appt.id)}
                                          className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl py-3 text-xs font-bold transition-all duration-300"
                                        >
                                          Cancelar Cita
                                        </button>
                                      ) : (isCanceling) ? (
                                        <div className="mt-4 animate-in fade-in zoom-in-95 duration-300">
                                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-3 text-left mb-3 items-start backdrop-blur-sm">
                                            <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-amber-200/90 leading-relaxed font-medium">
                                              Si deseas cancelar, hazlo al menos con <span className="text-amber-400 font-bold">1 hora de anticipación</span>; de lo contrario podrías perder tus puntos.
                                            </p>
                                          </div>
                                          <div className="flex gap-2">
                                            <button 
                                              onClick={() => setCancelingApptId(null)}
                                              className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl py-3 text-xs font-bold transition-all border border-white/10"
                                            >
                                              Volver
                                            </button>
                                            <button 
                                              onClick={() => handleCancelAppt(appt)}
                                              className="flex-1 bg-red-500 text-white rounded-xl py-3 text-xs font-bold transition-all hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                            >
                                              Sí, Cancelar
                                            </button>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )
                      ) : (
                        completedAppointments.length === 0 ? (
                          <p className="text-xs text-slate-500 italic text-center py-6 bg-white/[0.02] rounded-3xl border border-white/5">No tienes cortes realizados aún.</p>
                        ) : (
                          completedAppointments.map(appt => {
                            const isExpanded = expandedApptId === appt.id;
                            
                            return (
                              <div key={appt.id} className="bg-white/[0.01] backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-lg transition-all duration-300">
                                {/* Appt Header (Clickable) */}
                                <button 
                                  onClick={() => {
                                    if (isExpanded) {
                                      setExpandedApptId(null);
                                    } else {
                                      setExpandedApptId(appt.id);
                                    }
                                  }}
                                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shadow-sm opacity-80">
                                      <img src={appt.barber.image} className="w-full h-full object-cover" alt="B" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm font-bold text-white/90">{appt.barber.name}</p>
                                      <p className="text-xs text-slate-500 font-medium mt-0.5 capitalize">
                                        {appt.date?.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} • {appt.time}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-1">
                                    <span className="bg-teal-500/10 text-teal-400 text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-widest border border-teal-500/20 backdrop-blur-md">
                                      Realizado
                                    </span>
                                    <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                  </div>
                                </button>

                                {/* Expanded Details Section */}
                                {isExpanded && (
                                  <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="pt-4 border-t border-white/5 space-y-3">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Servicio</span>
                                        <span className="text-white/80 font-bold">{appt.service?.name}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Duración</span>
                                        <span className="text-white/70 font-medium">{appt.service?.duration}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Pagado</span>
                                        <span className="text-teal-400 font-black">
                                          {appt.discount > 0 ? (
                                            <span className="flex items-center gap-1.5 justify-end">
                                              <span className="line-through text-slate-500 text-[10px]">{appt.service?.price}</span>
                                              <span>₡ {Math.round(parseInt(String(appt.service?.price).replace(/[^\d]/g, ''), 10) * (1 - appt.discount / 100)).toLocaleString()}</span>
                                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                {appt.discount === 100 ? 'GRATIS' : `${appt.discount}% DTO`}
                                              </span>
                                            </span>
                                          ) : (
                                            appt.service?.price
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step > 0 && (
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
                  {/* Header Card (Back button) */}
                  <div className="h-6 flex items-center mb-6">
                    {step > 1 && step < 4 && (
                      <button 
                        onClick={() => {
                          setStep(prev => {
                            if (prev === 3 && booking.service?.isPromo) {
                              return 1;
                            }
                            return prev - 1;
                          });
                        }} 
                        className="absolute top-5 left-5 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold z-20 hover:-translate-x-1 duration-300"
                      >
                        <ChevronLeft className="w-4 h-4" /> Atrás
                      </button>
                    )}
                    {step === 1 && (
                      <button onClick={() => setStep(0)} className="absolute top-5 left-5 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold z-20 hover:-translate-x-1 duration-300">
                        <ChevronLeft className="w-4 h-4" /> Cancelar
                      </button>
                    )}
                    
                    {/* Step Indicators */}
                    {step < 4 && (
                       <div className="absolute top-7 right-6 flex gap-1 z-20">
                         {[1,2,3].map(s => (
                           <div key={s} className={`h-1 rounded-full transition-all duration-300 ${step === s ? 'w-4 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : step > s ? 'w-1.5 bg-white/50' : 'w-1.5 bg-white/10'}`} />
                         ))}
                       </div>
                    )}
                  </div>

                  <div className="min-h-[300px]">
                    {/* STEP 1: Barber */}
                    {step === 1 && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-bold text-white mb-6">Selecciona un Barbero</h2>
                        <div className="grid gap-4">
                          {barbersList.map((barber) => (
                            <button 
                              key={barber.id}
                              onClick={() => handleNext('barber', barber)}
                              className="bg-black/40 border border-white/10 hover:border-teal-500/50 rounded-2xl p-4 flex items-center gap-4 transition-all hover:bg-white/5 active:scale-[0.98] group relative overflow-hidden"
                            >
                              <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10 group-hover:border-white transition-colors flex-shrink-0">
                                <img src={barber.image} className="w-full h-full object-cover" alt={barber.name} />
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-bold text-white group-hover:translate-x-1 transition-transform">{barber.name}</p>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{barber.role}</p>
                              </div>
                              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* STEP 2: Service */}
                    {step === 2 && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="mb-6">
                          <h3 className="font-bold text-white text-lg">¿Qué servicio deseas?</h3>
                          <p className="text-slate-400 text-xs font-medium mt-1">Con {booking.barber?.name}</p>
                        </div>
                        <div className="space-y-3">
                          {combinedServices.map(service => (
                            <button 
                              key={service.id}
                              onClick={() => handleServiceSelectNext(service)}
                              className="w-full bg-black/40 border border-white/5 hover:border-white/30 rounded-2xl p-4 flex items-center justify-between transition-all duration-300 group active:scale-95 hover:bg-white/5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-transparent group-hover:border-white/20 transition-colors overflow-hidden">
                                  {service.image ? (
                                    <img src={service.image} className="w-full h-full object-cover" alt={service.name} />
                                  ) : (
                                    <Scissors className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-bold text-white tracking-wide">{service.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1 uppercase tracking-wider"><Clock className="w-3 h-3" /> {service.duration}</p>
                                </div>
                              </div>
                              <span className="text-white font-black text-sm">{service.price}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* STEP 3: Date & Time */}
                    {step === 3 && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-end mb-6">
                          <div>
                            <h3 className="font-bold text-white text-lg">Fecha y Hora</h3>
                            <p className="text-slate-400 text-xs font-medium mt-1">Con {booking.barber?.name} • {booking.service?.name}</p>
                          </div>
                          <button 
                            onClick={() => setCalendarView(prev => prev === 'week' ? 'month' : 'week')}
                            className="text-xs font-bold uppercase tracking-wider text-slate-300 border border-white/10 bg-black/40 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-white/10 transition-colors"
                          >
                            {calendarView === 'week' ? 'Ver Mes' : 'Ver Semana'} <Grid className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Week View */}
                        {calendarView === 'week' && (
                          <div className="grid grid-cols-7 gap-1.5 mb-6">
                            {weekDays.map((d, i) => {
                              const isSelected = booking.date?.toDateString() === d.toDateString();
                              return (
                                  <button 
                                    key={i}
                                    onClick={() => setBooking((prev: any) => ({ ...prev, date: d }))}
                                    className={`relative overflow-hidden flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-300 border ${isSelected ? 'bg-black/60 border-white/10' : 'bg-black/40 border-white/5 text-slate-400 hover:bg-white/10'}`}
                                  >
                                    {isSelected && (
                                      <>
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-teal-500/30 to-transparent opacity-80" />
                                        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-teal-500 shadow-[0_0_15px_rgba(53, 236, 222,0.8)]" />
                                      </>
                                    )}
                                    <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 relative z-10 ${isSelected ? 'text-teal-200' : ''}`}>{d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.','')}</span>
                                    <span className={`text-lg font-black relative z-10 ${isSelected ? 'text-white' : 'text-slate-200'}`}>{d.getDate()}</span>
                                  </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Month View */}
                        {calendarView === 'month' && (
                          <div className="mb-6">
                            <p className="text-xs font-bold text-white capitalize mb-3">{monthName}</p>
                            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                              {['D','L','M','X','J','V','S'].map(d => (
                                <span key={d} className="text-[10px] font-bold text-slate-500">{d}</span>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {/* Offset blank cells so day 1 falls on correct weekday */}
                              {Array.from({length: firstDayOfMonth}).map((_, i) => (
                                <div key={`blank-${i}`} />
                              ))}
                              {monthDays.map((d, i) => {
                                const isSelected = booking.date?.toDateString() === d.toDateString();
                                const isPast = d < new Date(new Date().setHours(0,0,0,0));
                                return (
                                  <button 
                                    key={i}
                                    disabled={isPast}
                                    onClick={() => setBooking((prev: any) => ({ ...prev, date: d }))}
                                    className={`aspect-square relative flex items-center justify-center rounded-lg text-xs transition-all overflow-hidden ${isSelected ? 'bg-black/60 border border-white/10' : isPast ? 'text-slate-600 cursor-not-allowed opacity-50' : 'text-slate-300 hover:bg-white/10 border border-white/5 bg-black/40'}`}
                                  >
                                    {isSelected && (
                                      <>
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-teal-500/30 to-transparent opacity-80" />
                                        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-teal-500 shadow-[0_0_15px_rgba(53, 236, 222,0.8)]" />
                                      </>
                                    )}
                                    <span className={`relative z-10 ${isSelected ? 'text-white font-bold' : ''}`}>{d.getDate()}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {booking.date && (
                          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <p className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-widest">Horarios Disponibles</p>
                            {(() => {
                              const barberId = booking.barber ? String(booking.barber.id) : '1';
                              const dateKey = booking.date ? toLocalDateStr(booking.date) : '';
                              
                              // A. Almuerzo
                              const exceptions = lunchExceptions[barberId] || {};
                              const lunch = exceptions[dateKey] || barberLunchHours[barberId] || { start: '12:00', end: '13:00' };
                              const lunchStartMins = parse24TimeToMinutes(lunch.start);
                              const lunchEndMins = parse24TimeToMinutes(lunch.end);

                              // B. Jornada Base (weekly schedules)
                              const dayOfWeek = booking.date.getDay();
                              const barberSchedule = barberSchedules[barberId]?.[dayOfWeek] || { isOff: false, start: '09:00', end: '18:00' };

                              // C. Días libres aprobados (permisos)
                              const hasApprovedPermiso = permisosList.some((p: any) => 
                                p.barberId === barberId &&
                                p.status === 'Aprobado' &&
                                dateKey >= p.startDate &&
                                dateKey <= p.endDate
                              );

                              // D. Horas Bloqueadas manualmente
                              const dayBlocks = blockedHours[barberId]?.[dateKey] || [];

                              // E. Citas ocupadas
                              const globalAppts = globalAppointmentsList;

                              // F. Verificación del pasado (para hoy)
                              const now = new Date();
                              const todayStr = toLocalDateStr(now);
                              const currentMins = now.getHours() * 60 + now.getMinutes();

                              // Validar si el barbero está libre hoy
                              const isOffToday = barberSchedule.isOff || hasApprovedPermiso;

                              if (isOffToday) {
                                return (
                                  <div className="py-8 px-4 border border-dashed border-white/10 rounded-[2rem] text-center bg-white/[0.01]">
                                    <CalendarOff className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400 font-bold">El barbero no trabaja este día o tiene el día libre.</p>
                                  </div>
                                );
                              }

                              return (
                                <div className="grid grid-cols-3 gap-2">
                                  {TIMES.map(t => {
                                    const slotMins = parseTimeToMinutes(t);
                                    const slotDuration = booking.service 
                                      ? getServiceDurationMinutes(booking.service.name, combinedServices) 
                                      : 30;
                                    const slotEndMins = slotMins + slotDuration;

                                    const isLunchOverlap = slotMins < lunchEndMins && slotEndMins > lunchStartMins;
                                    const isPast = (dateKey === todayStr) && (slotMins < currentMins);
                                    
                                    const isBusy = globalAppts.some((a: any) => {
                                      if (a.barberId !== barberId || a.date !== dateKey || a.status !== 'Pendiente') return false;
                                      const apptMins = parseTimeToMinutes(a.time);
                                      const apptDuration = getServiceDurationMinutes(a.service, combinedServices);
                                      const apptEndMins = apptMins + apptDuration;
                                      return slotMins < apptEndMins && slotEndMins > apptMins;
                                    });

                                    const isBlocked = dayBlocks.some((bh: string) => {
                                      const blockStart = parse24TimeToMinutes(bh);
                                      const blockEnd = blockStart + 30; // Bloqueo individual dura 30 minutos
                                      return slotMins < blockEnd && slotEndMins > blockStart;
                                    });
                                    const isOutsideHours = slotMins < parse24TimeToMinutes(barberSchedule.start) || slotEndMins > parse24TimeToMinutes(barberSchedule.end);

                                    if (isPast) {
                                      return (
                                        <button 
                                          key={t}
                                          disabled
                                          className="py-2.5 rounded-xl border border-white/5 bg-white/[0.01] text-slate-600/40 text-xs font-semibold cursor-not-allowed line-through flex flex-col items-center justify-center animate-fade-in"
                                        >
                                          <span>{t}</span>
                                          <span className="text-[7px] text-slate-500/50 font-bold uppercase tracking-wider">Pasado</span>
                                        </button>
                                      );
                                    }

                                    if (isOutsideHours) {
                                      return (
                                        <button 
                                          key={t}
                                          disabled
                                          className="py-2.5 rounded-xl border border-white/5 bg-white/[0.01] text-slate-600/40 text-xs font-semibold cursor-not-allowed flex flex-col items-center justify-center animate-fade-in"
                                        >
                                          <span>{t}</span>
                                          <span className="text-[7px] text-slate-500/50 font-bold uppercase tracking-wider">Cerrado</span>
                                        </button>
                                      );
                                    }

                                    if (isLunchOverlap) {
                                      return (
                                        <button 
                                          key={t}
                                          disabled
                                          className="py-2.5 rounded-xl border border-orange-500/10 bg-orange-950/10 text-orange-400/40 text-xs font-semibold cursor-not-allowed line-through flex flex-col items-center justify-center animate-fade-in"
                                        >
                                          <span>{t}</span>
                                          <span className="text-[7px] text-orange-400/40 uppercase font-bold tracking-wider">Almuerzo</span>
                                        </button>
                                      );
                                    }

                                    if (isBusy) {
                                      return (
                                        <button 
                                          key={t}
                                          disabled
                                          className="py-2.5 rounded-xl border border-red-500/10 bg-red-950/10 text-red-400/40 text-xs font-semibold cursor-not-allowed line-through flex flex-col items-center justify-center animate-fade-in"
                                        >
                                          <span>{t}</span>
                                          <span className="text-[7px] text-red-400/40 uppercase font-bold tracking-wider">Ocupado</span>
                                        </button>
                                      );
                                    }

                                    if (isBlocked) {
                                      return (
                                        <button 
                                          key={t}
                                          disabled
                                          className="py-2.5 rounded-xl border border-yellow-500/10 bg-yellow-950/10 text-yellow-400/40 text-xs font-semibold cursor-not-allowed line-through flex flex-col items-center justify-center animate-fade-in"
                                        >
                                          <span>{t}</span>
                                          <span className="text-[7px] text-yellow-400/40 uppercase font-bold tracking-wider">Bloqueado</span>
                                        </button>
                                      );
                                    }

                                    return (
                                      <button 
                                        key={t}
                                        onClick={() => handleTimeSelectSave(t)}
                                        className="py-2.5 rounded-xl border border-white/5 bg-black/40 hover:bg-white/10 hover:border-white/30 hover:text-white text-xs font-semibold transition-all text-slate-300 active:scale-95 flex items-center justify-center"
                                      >
                                        {t}
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* STEP 4: Confirmation */}
                    {step === 4 && (
                      <div className="animate-in fade-in zoom-in-95 duration-500 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                          <CheckCircle className="w-8 h-8 text-black" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-6 tracking-tight">¡Cita Confirmada!</h3>
                        
                        <div className="bg-black/40 rounded-3xl p-5 border border-white/5 text-left space-y-4 mb-6 shadow-inner">
                          <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Barbero</span>
                            <span className="text-white text-sm font-bold flex items-center gap-2">
                              <img src={booking.barber?.image} className="w-5 h-5 rounded-full object-cover" alt="B" />
                              {booking.barber?.name}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Fecha</span>
                            <span className="text-white text-xs font-bold capitalize">{booking.date?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                          </div>
                          <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Hora</span>
                            <span className="text-black text-xs font-black bg-white px-2 py-1 rounded-md">{booking.time}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Servicio</span>
                            <span className="text-white text-sm font-bold">{booking.service?.name}</span>
                          </div>
                        </div>

                        <div className="bg-neutral-900 border border-white/10 rounded-xl p-3 flex gap-3 text-left mb-6 items-start">
                          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                            Si deseas cancelar, hazlo al menos con <span className="text-white font-bold">1 hora de anticipación</span>; de lo contrario podrías perder tus puntos.
                          </p>
                        </div>

                        <button 
                          onClick={resetBooking}
                          className="w-full bg-white/5 backdrop-blur-xl border border-white/10 border-t-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-white hover:bg-white/10 rounded-full py-4 text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]"
                        >
                          Volver al Inicio
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* ======================= SHOP (MARKETPLACE) ================ */}
          {/* ========================================================= */}
          {activeNav === 'shop' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-10">
              <div className="flex items-center gap-2 mb-6 px-2">
                <ShoppingBag className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white tracking-tight">Marketplace</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {productsList.length === 0 ? (
                  <div className="col-span-2 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-[2rem] p-8 text-center">
                    <ShoppingBag className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-40" />
                    <p className="text-xs text-slate-400 italic">No hay productos en el catálogo actualmente.</p>
                  </div>
                ) : (
                  productsList.map(product => (
                    <button 
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-[2rem] overflow-hidden flex flex-col group active:scale-95 transition-all duration-300 shadow-lg hover:border-white/30"
                    >
                      <div className="w-full aspect-square overflow-hidden bg-black/40">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      </div>
                      <div className="p-4 text-left w-full">
                        <h3 className="text-xs font-bold text-white leading-tight mb-1 line-clamp-2">{product.name}</h3>
                        <p className="text-xs font-black text-slate-300">
                          {typeof product.price === 'number' ? `₡ ${product.price.toLocaleString()}` : product.price}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ======================= LOYALTY CARD ====================== */}
          {/* ========================================================= */}
          {activeNav === 'loyalty' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-10">
              <div className="flex items-center gap-2 mb-6 px-2">
                <Award className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white tracking-tight">Loyalty Card</h2>
              </div>
              
              <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden mb-6">
                
                {/* Progreso de Rangos */}
                <div className="mb-8 animate-in fade-in duration-500">
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 text-left">Progreso de Rangos</h4>
                  <div 
                    ref={timelineRef}
                    onMouseDown={(e) => {
                      if (!timelineRef.current) return;
                      setIsDraggingTimeline(true);
                      setTimelineStartX(e.pageX - timelineRef.current.offsetLeft);
                      setTimelineScrollLeft(timelineRef.current.scrollLeft);
                    }}
                    onMouseLeave={() => setIsDraggingTimeline(false)}
                    onMouseUp={() => setIsDraggingTimeline(false)}
                    onMouseMove={(e) => {
                      if (!isDraggingTimeline || !timelineRef.current) return;
                      e.preventDefault();
                      const x = e.pageX - timelineRef.current.offsetLeft;
                      const walk = (x - timelineStartX) * 1.5;
                      timelineRef.current.scrollLeft = timelineScrollLeft - walk;
                    }}
                    className="flex gap-12 overflow-x-auto overflow-y-hidden py-8 no-scrollbar mx-[-24px] px-6 justify-start cursor-grab active:cursor-grabbing select-none snap-x snap-mandatory"
                  >
                    {/* Left Spacer to allow first item to snap to center */}
                    <div className="w-[calc(50%-60px)] sm:w-[calc(50%-70px)] flex-shrink-0" />

                    {[
                      { name: 'Bronce', image: '/RANGOS/RANGO BRONCE.png', index: 1, scaleClass: 'scale-[2.2] group-hover:scale-[2.35]' },
                      { name: 'Plata', image: '/RANGOS/RANGO PLATA.png', index: 2, scaleClass: 'scale-[2.2] group-hover:scale-[2.35]' },
                      { name: 'Oro', image: '/RANGOS/RANGO ORO.png', index: 3, scaleClass: 'scale-[2.2] group-hover:scale-[2.35]' },
                      { name: 'Diamante', image: '/RANGOS/RANGO DIAMANTE.png', index: 4, scaleClass: 'scale-[1.85] group-hover:scale-[2.0]' }
                    ].map((rng) => {
                      const tierOrder: Record<string, number> = { 'Básico': 0, 'Bronce': 1, 'Plata': 2, 'Oro': 3, 'Diamante': 4 };
                      const currentTierIndex = tierOrder[loyalty.tier] || 0;
                      const isActive = currentTierIndex >= rng.index;
                      
                      return (
                        <div 
                          key={rng.name} 
                          className="flex flex-col items-center group transition-all duration-300 flex-shrink-0 snap-center"
                        >
                          <div 
                            className={`w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] flex items-center justify-center relative transition-all duration-500 ${
                              isActive 
                                ? 'scale-100 opacity-100' 
                                : 'opacity-25 grayscale'
                            }`}
                          >
                            <img 
                              src={rng.image} 
                              alt={rng.name} 
                              className={`w-full h-full object-contain transition-transform duration-500 ${rng.scaleClass}`} 
                              draggable="false"
                            />
                            {!isActive && (
                              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm border border-white/10 w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-in fade-in zoom-in duration-300">
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <span 
                            className={`text-[9px] font-black tracking-widest uppercase mt-3 transition-colors duration-300 ${
                              isActive ? 'text-teal-400' : 'text-slate-500'
                            }`}
                          >
                            {rng.name}
                          </span>
                        </div>
                      );
                    })}

                    {/* Right Spacer to allow last item to snap to center */}
                    <div className="w-[calc(50%-60px)] sm:w-[calc(50%-70px)] flex-shrink-0" />
                  </div>
                </div>

                {/* Rango Actual */}
                <div className="text-center mb-8 pt-5 border-t border-white/5">
                  <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Rango Actual</h3>
                  <div className={`inline-block px-5 py-1.5 rounded-full border ${tierDetails.border} ${tierDetails.bg} ${tierDetails.color} font-black text-lg tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.05)]`}>
                    {loyalty.tier === 'Básico' ? 'Inicial (Básico)' : loyalty.tier}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 font-medium">Acumula 10 puntos para ascender a <span className="text-white font-bold">{tierDetails.next}</span></p>
                </div>

                {/* The 10 Points Grid */}
                {(() => {
                  const getTierStartPoints = (tier: string) => {
                    switch (tier) {
                      case 'Bronce': return 10;
                      case 'Plata': return 20;
                      case 'Oro': return 30;
                      case 'Diamante': return 40;
                      default: return 0;
                    }
                  };
                  const tierStart = getTierStartPoints(loyalty.tier);
                  const progressPoints = Math.max(0, loyalty.points - tierStart);

                  return (
                    <div className="grid grid-rows-2 gap-3 max-w-[280px] mx-auto">
                      {/* Top Row (1-5) */}
                      <div className="grid grid-cols-5 gap-3">
                         {[1,2,3,4,5].map(pt => {
                           const isFilled = progressPoints >= pt;
                           const isGift = pt === 5 || (loyalty.tier === 'Básico' && pt === 1);
                           return (
                             <div key={pt} className={`aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isFilled ? tierDetails.border + ' ' + tierDetails.bg : 'border-white/10 bg-black/40'}`}>
                               {isGift ? <Gift className={`w-4 h-4 ${isFilled ? tierDetails.color : 'text-slate-600'}`} /> : 
                                (isFilled ? <CheckCircle className={`w-4 h-4 ${tierDetails.color}`} /> : <span className="text-xs text-slate-600 font-black">{pt}</span>)}
                             </div>
                           )
                         })}
                      </div>
                      {/* Bottom Row (6-10) */}
                      <div className="grid grid-cols-5 gap-3">
                         {[6,7,8,9,10].map(pt => {
                           const isFilled = progressPoints >= pt;
                           const isGift = pt === 10;
                           return (
                             <div key={pt} className={`aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isFilled ? tierDetails.border + ' ' + tierDetails.bg : 'border-white/10 bg-black/40'}`}>
                               {isGift ? <Award className={`w-4 h-4 ${isFilled ? tierDetails.color : 'text-slate-600'}`} /> : 
                                (isFilled ? <CheckCircle className={`w-4 h-4 ${tierDetails.color}`} /> : <span className="text-xs text-slate-600 font-black">{pt}</span>)}
                             </div>
                           )
                         })}
                      </div>
                    </div>
                  );
                })()}

                {/* Active Rewards for current tier */}
                {(() => {
                  // Helper to normalize typed reward objects
                  const normReward = (r: any): { type: 'percent'|'gift', value: string, label: string } => {
                    if (!r) return { type: 'percent', value: '', label: '' };
                    if (typeof r === 'object' && r.type) {
                      const val = String(r.value || '');
                      return { type: r.type, value: val, label: r.type === 'percent' ? (val === '100' ? '¡GRATIS!' : `${val}% de descuento`) : val };
                    }
                    if (typeof r === 'string') {
                      const m = r.match(/(\d+)\s*%/);
                      return m ? { type: 'percent', value: m[1], label: m[1] === '100' ? '¡GRATIS!' : `${m[1]}% de descuento` } : { type: 'gift', value: r, label: r };
                    }
                    return { type: 'percent', value: '', label: '' };
                  };

                  const getTierStartPoints = (t: string) => {
                    switch(t) { case 'Bronce': return 10; case 'Plata': return 20; case 'Oro': return 30; case 'Diamante': return 40; default: return 0; }
                  };
                  const tierStart = getTierStartPoints(loyalty.tier);
                  const progressPoints = Math.max(0, loyalty.points - tierStart);
                  const tierRew = loyaltyRewards[loyalty.tier] || {};

                  // Determine pending milestones earned but (potentially) not yet applied
                  // A milestone is "earned" when progressPoints >= that milestone number
                  const pendingMilestones: { label: string; reward: ReturnType<typeof normReward> }[] = [];
                  if (loyalty.tier === 'Básico' && progressPoints >= 1) {
                    const r = normReward(loyaltyRewards['Básico']?.reward1);
                    if (r.value) pendingMilestones.push({ label: 'Premio Inicial (1 pt)', reward: r });
                  }
                  if (progressPoints >= 5) {
                    const r = normReward(tierRew.reward5);
                    if (r.value) pendingMilestones.push({ label: 'Premio Medio (5 pt)', reward: r });
                  }
                  if (progressPoints >= 10) {
                    const r = normReward(tierRew.reward10);
                    if (r.value) pendingMilestones.push({ label: 'Premio Mayor (10 pt)', reward: r });
                  }

                  const r1 = normReward(loyaltyRewards['Básico']?.reward1);
                  const r5 = normReward(tierRew.reward5);
                  const r10 = normReward(tierRew.reward10);

                  return (
                    <>
                      {/* Pending reward redemption card */}
                      {pendingMilestones.length > 0 && (
                        <div className="mt-6 animate-in fade-in zoom-in-95 duration-500">
                          {pendingMilestones.map((pm, i) => (
                            <div key={i} className={`mb-3 rounded-2xl p-4 border shadow-lg ${
                              pm.reward.type === 'gift'
                                ? 'bg-gradient-to-br from-teal-900/60 to-teal-700/20 border-teal-400/40 shadow-[0_0_25px_rgba(20,184,166,0.15)]'
                                : 'bg-gradient-to-br from-orange-900/50 to-orange-700/20 border-orange-400/40 shadow-[0_0_25px_rgba(251,146,60,0.15)]'
                            }`}>
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                                  pm.reward.type === 'gift' ? 'bg-teal-500/20' : 'bg-orange-500/20'
                                }`}>
                                  {pm.reward.type === 'gift' ? '🎁' : '🎉'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[9px] font-black uppercase tracking-widest ${
                                    pm.reward.type === 'gift' ? 'text-teal-400' : 'text-orange-400'
                                  }`}>¡Premio Ganado — Listo para Canjear!</p>
                                  <p className="text-white font-black text-base mt-0.5 leading-tight">{pm.reward.type === 'gift' ? pm.reward.label : pm.reward.label}</p>
                                  <p className="text-[10px] text-slate-300 mt-1 leading-snug">
                                    {pm.reward.type === 'gift'
                                      ? `Muéstrale esta pantalla al barbero para reclamar tu regalo: ${pm.reward.value}`
                                      : `Aplica en tu próxima cita. Muéstrale esta pantalla al barbero.`
                                    }
                                  </p>
                                  <div className={`mt-2 inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full ${
                                    pm.reward.type === 'gift' ? 'bg-teal-400/20 text-teal-300 border border-teal-400/30' : 'bg-orange-400/20 text-orange-300 border border-orange-400/30'
                                  }`}>
                                    🏅 {pm.label}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reward list for current tier */}
                      <div className="mt-8 pt-5 border-t border-white/5 space-y-3 text-left">
                        <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                          Premios de {loyalty.tier === 'Básico' ? 'Nivel Inicial' : `Rango ${loyalty.tier}`}
                        </h4>

                        {loyalty.tier === 'Básico' && (
                          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3 animate-in fade-in duration-300">
                            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-xs flex-shrink-0">1 pt</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white">Premio Inicial</p>
                              <p className="text-[11px] text-slate-400 truncate">{r1.type === 'gift' ? `🎁 ${r1.value || 'Premio de bienvenida'}` : r1.label || 'Premio de bienvenida'}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-xs flex-shrink-0">5 pt</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white">Premio Medio</p>
                            <p className="text-[11px] text-slate-400 truncate">{r5.type === 'gift' ? `🎁 ${r5.value || 'Descuento especial'}` : r5.label || 'Descuento especial'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                          <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-xs flex-shrink-0">10 pt</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white">Premio Mayor</p>
                            <p className="text-[11px] text-slate-400 truncate">{r10.type === 'gift' ? `🎁 ${r10.value || 'Servicio gratis'}` : r10.label || 'Servicio gratis'}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <button 
                onClick={() => setShowRules(true)}
                className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-full py-4 text-xs font-bold text-white shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                Ver Reglamentos de Lealtad
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* ======================= PROMOS ============================ */}
          {/* ========================================================= */}
          {activeNav === 'promos' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-10">
              <div className="flex items-center gap-2 mb-6 px-2">
                <Tag className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white tracking-tight">Promociones</h2>
              </div>
              
              <div className="space-y-4">
                {promosList.length === 0 ? (
                  <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-[2rem] p-8 text-center">
                    <Tag className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-40" />
                    <p className="text-xs text-slate-400 italic">No hay promociones activas en este momento.</p>
                  </div>
                ) : (
                  promosList.map(promo => (
                    <button 
                      key={promo.id}
                      onClick={() => setSelectedPromo(promo)}
                      className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-[2rem] overflow-hidden flex flex-col group active:scale-95 transition-all duration-300 shadow-lg hover:border-white/30 text-left"
                    >
                      <div className="w-full h-32 overflow-hidden bg-black/40 relative">
                        <img src={promo.image} alt={promo.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute top-3 right-3 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-lg">Oferta</div>
                      </div>
                      <div className="p-5">
                        <h3 className="text-sm font-bold text-white mb-2">{promo.name}</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-black text-white">{promo.promoPrice}</span>
                          <span className="text-xs text-slate-500 font-bold line-through">{promo.regularPrice}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ======================= PROFILE =========================== */}
          {/* ========================================================= */}
          {activeNav === 'profile' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-10">
              
              {/* Header Profile Info */}
              <div className="relative rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] mb-6 overflow-hidden border border-[#2a2a2c]/50">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/background.jpg")' }} />
                <div className="absolute inset-0 bg-[#1a1a1c]/70 backdrop-blur-2xl" />
                
                <div className="relative z-10 p-6 flex flex-col items-center">
                  <button 
                    onClick={() => { setEditForm({phone: profileData.phone, image: profileData.image}); setIsEditingProfile(true); }}
                    className="absolute top-5 right-5 text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>

                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-[0_0_15px_rgba(20,184,166,0.2)] mb-4 bg-black/20 backdrop-blur-md">
                    <img src={profileData.image} className="w-full h-full object-cover" alt="Profile" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-md">{profileData.name}</h2>
                  <p className="text-sm text-slate-300 font-medium mt-1 drop-shadow-sm">+506 {profileData.phone}</p>
                </div>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="relative overflow-hidden rounded-[2rem] border border-[#2a2a2c]/50 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                  <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/background.jpg")' }} />
                  <div className="absolute inset-0 bg-[#1a1a1c]/80 backdrop-blur-xl" />
                  <div className="relative z-10 p-5 flex flex-col items-center justify-center text-center">
                    {(() => {
                      const tierImages: Record<string, string> = {
                        'Bronce': '/RANGOS/RANGO BRONCE.png',
                        'Plata': '/RANGOS/RANGO PLATA.png',
                        'Oro': '/RANGOS/RANGO ORO.png',
                        'Diamante': '/RANGOS/RANGO DIAMANTE.png'
                      };
                      const hasRange = loyalty.tier !== 'Básico' && tierImages[loyalty.tier];
                      return hasRange ? (
                        <div className="w-20 h-20 flex items-center justify-center relative overflow-hidden rounded-full mb-2 bg-black/10">
                          <img 
                            src={tierImages[loyalty.tier]} 
                            className={`w-full h-full object-contain ${loyalty.tier === 'Diamante' ? 'scale-[1.5]' : 'scale-[1.8]'}`} 
                            alt={loyalty.tier} 
                          />
                        </div>
                      ) : (
                        <Award className="w-10 h-10 text-slate-500 mb-2.5" />
                      );
                    })()}
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 drop-shadow-sm">Tu Rango</p>
                    <p className="text-sm font-black text-white drop-shadow-md">
                      {loyalty.tier === 'Básico' ? 'Sin Rango' : loyalty.tier}
                    </p>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-[2rem] border border-[#2a2a2c]/50 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                  <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/background.jpg")' }} />
                  <div className="absolute inset-0 bg-[#1a1a1c]/80 backdrop-blur-xl" />
                  <div className="relative z-10 p-5 flex flex-col items-center justify-center text-center">
                    {barbersList[0] ? (
                      <div className="w-20 h-20 rounded-full overflow-hidden border border-white/10 mb-2 bg-black/20">
                        <img 
                          src={barbersList[0].image} 
                          className="w-full h-full object-cover" 
                          alt={barbersList[0].name} 
                        />
                      </div>
                    ) : (
                      <Star className="w-10 h-10 text-yellow-400 mb-2.5" />
                    )}
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 drop-shadow-sm">Barbero Fav.</p>
                    <p className="text-sm font-black text-white drop-shadow-md">{barbersList[0]?.name || 'No hay favoritos'}</p>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="relative overflow-hidden rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-[#2a2a2c]/50 mb-6">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/background.jpg")' }} />
                <div className="absolute inset-0 bg-[#1a1a1c]/70 backdrop-blur-2xl" />
                <div className="relative z-10 p-6">
                  <h3 className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-4 flex items-center gap-2 drop-shadow-sm">
                    <Scissors className="w-4 h-4 text-teal-400" /> Mis Indicaciones de Corte
                  </h3>
                  <textarea 
                    value={prefText}
                    onChange={(e) => setPrefText(e.target.value)}
                    placeholder="Ej: Dejar volumen arriba, fade bajito..."
                    className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-3 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:bg-black/60 min-h-[100px] resize-none mb-4 transition-colors backdrop-blur-sm"
                  />
                  <button 
                    onClick={async () => {
                      setProfileData(prev => ({...prev, preferences: prefText}));
                      if (userId) {
                         await supabase.from('profiles').update({ preferences: prefText }).eq('id', userId);
                         alert("Indicaciones guardadas permanentemente.");
                      }
                    }}
                    className="w-full bg-white/5 backdrop-blur-md border border-teal-500/50 hover:bg-teal-500/10 rounded-2xl py-4 text-sm font-medium text-teal-400 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Save className="w-4 h-4" /> Guardar Indicaciones
                  </button>
                </div>
              </div>

              {/* Birthday Section */}
              <div className="relative overflow-hidden rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-teal-500/30 text-center p-6">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/background.jpg")' }} />
                <div className="absolute inset-0 bg-[#1a1a1c]/80 backdrop-blur-2xl" />
                {/* Decorative background glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/20 blur-2xl rounded-full pointer-events-none"></div>

                <div className="relative z-10">
                  <Cake className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                  
                  {profileData.daysToBirthday === 0 ? (
                    <div>
                      <h3 className="text-lg font-black text-white mb-1 drop-shadow-md">¡Feliz Cumpleaños!</h3>
                      <p className="text-[11px] text-slate-300 mb-4 font-medium drop-shadow-sm">¡Tienes un regalo especial esperando por ti!</p>
                      <button 
                        onClick={() => setShowBirthdayCoupon(true)}
                        className="bg-teal-500 hover:bg-teal-600 text-[#09090b] rounded-full py-3 px-6 text-xs font-bold transition-all shadow-[0_0_20px_rgba(53,236,222,0.4)] active:scale-95"
                      >
                        Abrir mi Regalo 🎁
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] text-teal-400 font-bold uppercase tracking-widest mb-1 drop-shadow-sm">Próximo Cumpleaños</p>
                      <h3 className="text-3xl font-black text-white drop-shadow-md">{profileData.daysToBirthday}</h3>
                      <p className="text-xs text-slate-400 mt-1 drop-shadow-sm">Días restantes</p>
                    </div>
                  )}
                </div>
              </div>



            </div>
          )}

        </div>
      </div>

      {/* ========================================================= */}
      {/* ======================= EDIT PROFILE MODAL ================= */}
      {/* ========================================================= */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-[#1a1a1c]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            <button 
              onClick={() => setIsEditingProfile(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full z-20"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 tracking-tight text-center">Editar Perfil</h3>
            
            <div className="flex flex-col items-center mb-6">
               <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-[0_0_15px_rgba(20,184,166,0.2)] mb-3 group">
                 <img src={editForm.image} className="w-full h-full object-cover" alt="Edit" />
                 <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      if(e.target.files && e.target.files[0]) {
                        try {
                          const resized = await resizeImage(e.target.files[0]);
                          setEditForm(prev => ({...prev, image: resized}));
                        } catch (err) {
                          console.error("Error resizing image:", err);
                        }
                      }
                    }} />
                 </label>
               </div>
               <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Tocar para cambiar foto</p>
            </div>

            <div className="space-y-4 mb-8">
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Número de Teléfono</label>
                 <div className="flex relative items-center bg-black/40 border border-white/[0.05] rounded-2xl focus-within:border-teal-500/50 focus-within:bg-black/60 transition-colors backdrop-blur-sm">
                    <span className="absolute left-4 text-slate-400 font-bold">+506</span>
                    <input 
                      type="tel" 
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({...prev, phone: e.target.value}))}
                      className="w-full bg-transparent py-4 pl-14 pr-4 text-white focus:outline-none text-sm font-bold tracking-wider"
                    />
                 </div>
               </div>
            </div>

            <button 
              onClick={async () => {
                setProfileData(prev => ({...prev, phone: editForm.phone, image: editForm.image}));
                if (userId) {
                   await supabase.from('profiles').update({ 
                     phone: '+506' + editForm.phone.replace('+506', '').replace(/\s/g, ''), 
                     avatar_url: editForm.image 
                   }).eq('id', userId);
                }
                setIsEditingProfile(false);
              }}
              className="w-full bg-transparent border border-teal-500/50 text-teal-400 hover:bg-teal-500/10 rounded-2xl py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ======================= BIRTHDAY MODAL ==================== */}
      {/* ========================================================= */}
      {showBirthdayCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-[#1a1a1c]/90 backdrop-blur-xl border border-teal-500/30 rounded-3xl p-8 text-center animate-in zoom-in-95 duration-500 overflow-hidden shadow-[0_0_80px_rgba(53,236,222,0.2)]">
            {/* Confetti/Glow backgounds */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-teal-500/20 blur-3xl rounded-full pointer-events-none"></div>
            
            <button 
              onClick={() => setShowBirthdayCoupon(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full z-20"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10">
              <Gift className="w-16 h-16 text-teal-400 mx-auto mb-4 animate-bounce" />
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">¡Felicidades<br/>{profileData.name.split(' ')[0]}! 🥳</h2>
              
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 mb-6 mt-6">
                <p className="text-sm text-slate-300 font-medium italic leading-relaxed">
                  "Gracias por tu lealtad y confianza. Queremos celebrar contigo y premiarte en tu día especial."
                </p>
              </div>

              <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 mb-6 text-left flex gap-3 items-start">
                 <Info className="w-5 h-5 text-teal-400 flex-shrink-0" />
                 <div>
                   <p className="text-xs text-white font-bold mb-1">¿Cómo canjearlo?</p>
                   <p className="text-[10px] text-slate-300">Agenda tu cita y muestra esta pantalla a tu barbero al momento de pagar para aplicar tu regalo sorpresa.</p>
                 </div>
              </div>

              <div className="border-t border-white/10 pt-4 mt-2 mb-6">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Válido hasta</p>
                 <p className="text-teal-400 font-black">{profileData.birthdayExpiration}</p>
              </div>

              <button 
                onClick={() => {
                   setShowBirthdayCoupon(false);
                   setActiveNav('home');
                   setStep(1); // Manda a agendar
                }}
                className="w-full bg-teal-500 hover:bg-teal-600 text-[#09090b] rounded-2xl py-4 text-sm font-bold transition-all duration-300 active:scale-[0.98]"
              >
                Agendar Mi Cita Ahora
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ======================= PRODUCT MODAL ===================== */}
      {/* ========================================================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-[#09090b] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-full aspect-square bg-neutral-900">
              <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-6">
              <h3 className="text-2xl font-bold text-white mb-2 leading-tight tracking-tight">{selectedProduct.name}</h3>
              <p className="text-xl font-black text-white mb-4 bg-white/10 inline-block px-3 py-1 rounded-lg border border-white/10">
                {typeof selectedProduct.price === 'number' ? `₡ ${selectedProduct.price.toLocaleString()}` : selectedProduct.price}
              </p>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                {selectedProduct.description || 'Sin descripción disponible.'}
              </p>
              
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-4 flex gap-3 text-left mb-4 items-start backdrop-blur-sm shadow-[inset_0_0_20px_rgba(53, 236, 222,0.05)]">
                <Info className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-teal-100/90 leading-relaxed font-medium">
                  Este artículo está disponible para compra presencial. <span className="text-white font-bold">Puedes adquirirlo directamente en el local con nuestro personal.</span>
                </p>
              </div>

              <button 
                onClick={() => setSelectedProduct(null)}
                className="w-full bg-white text-black rounded-xl py-4 text-sm font-bold transition-all duration-300 active:scale-[0.98]"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ======================= PROMO MODAL ======================= */}
      {/* ========================================================= */}
      {selectedPromo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-[#09090b] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedPromo(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-full h-64 bg-neutral-900 relative">
               <img src={selectedPromo.image} alt={selectedPromo.name} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/50 to-transparent"></div>
            </div>
            <div className="p-6 relative -mt-20">
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-md mb-3 inline-block shadow-[0_0_15px_rgba(239,68,68,0.2)]">Promoción Especial</span>
              <h3 className="text-2xl font-bold text-white mb-4 leading-tight tracking-tight">{selectedPromo.name}</h3>
              
              <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/10 mb-5 flex justify-between items-center shadow-inner">
                 <div>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Precio Promo</p>
                   <p className="text-2xl font-black text-white">{selectedPromo.promoPrice}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Precio Normal</p>
                   <p className="text-lg font-bold text-slate-500 line-through">{selectedPromo.regularPrice}</p>
                 </div>
              </div>

              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                {selectedPromo.description}
              </p>
              
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3 text-left mb-6 items-center">
                <Clock className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <p className="text-[11px] text-slate-300 font-medium">
                  {selectedPromo.expires}
                </p>
              </div>

              <button 
                onClick={() => {
                   const promoService = {
                     id: `promo-${selectedPromo.id}`,
                     name: `${selectedPromo.name} (Promo)`,
                     price: selectedPromo.promoPrice || selectedPromo.promo_price || '',
                     duration: '45 min',
                     image: selectedPromo.image || null,
                     isPromo: true
                   };
                   setBooking({ barber: null, date: null, time: null, service: promoService });
                   setSelectedPromo(null);
                   setActiveNav('home');
                   setStep(1); // Manda a agendar
                }}
                className="w-full bg-white text-black rounded-xl py-4 text-sm font-bold transition-all duration-300 active:scale-[0.98]"
              >
                Agendar con esta Promo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ======================= RULES MODAL ======================= */}
      {/* ========================================================= */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-[#1a1a1c]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowRules(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full z-20"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 text-center">Reglamento de Lealtad</h3>
            
            <div className="space-y-5 text-xs text-slate-300 leading-relaxed mb-8">
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">1</span>
                <p>En el nivel Inicial (Básico), recibes premios en el 1er punto, 5to punto y 10mo punto (donde asciendes a Bronce). Para los rangos Bronce, Plata, Oro y Diamante, recibes tu premio medio a los 5 puntos y el premio mayor/ascenso al llegar a 10 puntos.</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">2</span>
                <p>Los premios mejoran significativamente conforme avanzas de rango.</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center font-bold text-cyan-400 flex-shrink-0">3</span>
                <p>El rango máximo es <span className="text-cyan-400 font-bold">Diamante</span>. Al llenar la tarjeta completa en este nivel, iniciarás una nueva pero <span className="text-white font-bold">te mantendrás siempre en rango Diamante</span> disfrutando de los mejores premios, siempre que cumplas con los requisitos de actividad.</p>
              </div>
              <div className="flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p><span className="text-white font-bold">Inactividad:</span> Si pasas <span className="text-red-400 font-bold">2 meses continuos</span> sin adquirir un servicio, perderás tu tarjeta y el rango actual, reiniciando desde cero.</p>
              </div>
              <div className="flex gap-3 items-start">
                <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p><span className="text-white font-bold">Cancelaciones tardías:</span> Si cancelas una cita con menos de <span className="text-amber-400 font-bold">1 hora de anticipación</span>, se te restarán <span className="text-red-400 font-bold">3 puntos</span> de tu tarjeta activa.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowRules(false)}
              className="w-full bg-transparent border border-teal-500/50 text-teal-400 hover:bg-teal-500/10 rounded-2xl py-4 text-sm font-bold transition-all active:scale-[0.98]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
