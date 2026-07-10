import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase. Asegúrate de configurar el archivo .env');
}

const customSessionStorage = {
  getItem: (key: string): string | null => {
    return window.sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    window.sessionStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    window.sessionStorage.removeItem(key);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customSessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    ...({ broadcast: false } as any)
  }
});
