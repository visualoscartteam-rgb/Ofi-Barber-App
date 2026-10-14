import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== PROFILES ===");
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) console.error("Error fetching profiles:", pErr);
  else {
    profiles.forEach(p => {
      console.log(`User: ${p.full_name} (${p.role}) - Points: ${p.loyalty_points} - Tier: ${p.loyalty_tier}`);
    });
  }

  console.log("\n=== APPOINTMENTS ===");
  const { data: appointments, error: aErr } = await supabase.from('appointments').select('*');
  if (aErr) console.error("Error fetching appointments:", aErr);
  else {
    appointments.forEach(a => {
      console.log(`Appt ID: ${a.id} - Client: ${a.client_name} - Date: ${a.date} - Time: ${a.time} - Status: ${a.status}`);
    });
  }
}

main();
