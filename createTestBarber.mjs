import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function create() {
  const { data, error } = await supabase.auth.signUp({
    email: 'barbero@carlosbarbero.app',
    password: 'password123',
    options: {
      data: {
        full_name: 'Barbero Test',
        phone: '+50600000000',
        dob: '1990-01-01',
        role: 'barber'
      }
    }
  });
  
  if (error) {
    console.error("Error al crear barbero:", error.message);
  } else {
    console.log("¡Barbero creado con éxito! ID:", data.user.id);
  }
}

create();
