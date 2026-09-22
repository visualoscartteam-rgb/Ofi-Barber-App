import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function create() {
  const { data, error } = await supabase.auth.signUp({
    email: 'cliente50688887777@carlosbarbero.app',
    password: 'password123',
    options: {
      data: {
        full_name: 'Cliente Prueba',
        phone: '+50688887777',
        dob: '1995-05-17'
      }
    }
  });
  
  if (error) {
    console.error("Error al crear:", error.message);
  } else {
    console.log("¡Usuario creado con éxito! ID:", data.user.id);
  }
}

create();
