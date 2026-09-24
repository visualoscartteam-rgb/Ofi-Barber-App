import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

const accounts = [
  {
    email: 'cliente@carlosbarbero.app',
    phone: '+50611111111',
    fullName: 'Cliente de Prueba',
    role: 'client'
  },
  {
    email: 'barbero@carlosbarbero.app',
    phone: '+50600000000',
    fullName: 'David Torres',
    role: 'barber'
  },
  {
    email: 'admin2@carlosbarbero.app',
    phone: '+50699998888',
    fullName: 'Carlos Millán',
    role: 'admin'
  }
];

async function run() {
  for (const acc of accounts) {
    console.log(`\nProcesando cuenta: ${acc.email}`);
    // 1. Try login with 123456
    const { data: log1, error: err1 } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: '123456'
    });

    if (!err1) {
      console.log(`  -> ¡Inicio de sesión con 123456 exitoso! La cuenta ya está configurada.`);
      // Sign out to clean up session for next check
      await supabase.auth.signOut();
      continue;
    }

    // 2. Try login with password123
    const { data: log2, error: err2 } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: 'password123'
    });

    if (!err2) {
      console.log(`  -> Inicio de sesión con password123 exitoso. Cambiando la clave a 123456...`);
      // Update password
      // Since log2 signed in, the client is authenticated
      const { error: updErr } = await supabase.auth.updateUser({
        password: '123456'
      });
      if (updErr) {
        console.error(`  -> Error al cambiar la clave:`, updErr.message);
      } else {
        console.log(`  -> ¡Clave cambiada a 123456 con éxito!`);
      }
      // Sign out to clean up session for next check
      await supabase.auth.signOut();
      continue;
    }

    // 3. If both failed, create the user
    console.log(`  -> La cuenta no existe o no tiene la clave correcta. Creándola...`);
    const { data: reg, error: regErr } = await supabase.auth.signUp({
      email: acc.email,
      password: '123456',
      options: {
        data: {
          full_name: acc.fullName,
          phone: acc.phone,
          dob: '1995-01-01',
          role: acc.role
        }
      }
    });

    if (regErr) {
      console.error(`  -> Error al registrar cuenta:`, regErr.message);
    } else {
      console.log(`  -> ¡Cuenta registrada con éxito! ID:`, reg.user?.id);
    }
  }
}

run();
