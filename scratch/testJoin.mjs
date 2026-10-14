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

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function test() {
  // Test 1: simple select
  const { data: simple, error: e1 } = await supabase
    .from('appointments')
    .select('*')
    .limit(3);
  console.log('Simple query - rows:', simple?.length, '| error:', e1?.message || 'none');
  if (simple?.[0]) console.log('Sample row:', JSON.stringify(simple[0]));

  // Test 2: JOIN with fkey
  const { data: joined, error: e2 } = await supabase
    .from('appointments')
    .select('*, profiles!appointments_client_id_fkey(avatar_url)')
    .limit(3);
  console.log('JOIN query - rows:', joined?.length, '| error:', e2?.message || 'none');

  // Test 3: JOIN with inner (alternative)
  const { data: inner, error: e3 } = await supabase
    .from('appointments')
    .select('*, profiles(avatar_url)')
    .limit(3);
  console.log('Generic JOIN - rows:', inner?.length, '| error:', e3?.message || 'none');
}

test();
