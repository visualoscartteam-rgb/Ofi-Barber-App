import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: barbers, error } = await supabase
    .from('profiles')
    .select('*')
    .or('role.eq.barber,role.eq.barbero,role.eq.admin');
  
  if (error) {
    console.error("Query failed with error:", error.message);
  } else {
    console.log("Query succeeded! Found", barbers?.length, "barbers:");
    barbers.forEach(b => {
      console.log(`- ${b.full_name} (${b.role})`);
    });
  }
}

test();
