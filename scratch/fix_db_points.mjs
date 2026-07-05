import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching appointments...");
  const { data: appointments, error: aErr } = await supabase.from('appointments').select('*');
  if (aErr) {
    console.error("Error fetching appointments:", aErr);
    return;
  }

  // Count completed appointments per client
  const completedCounts = {};
  appointments.forEach(a => {
    if (a.status === 'Finalizada' && a.client_id) {
      completedCounts[a.client_id] = (completedCounts[a.client_id] || 0) + 1;
    }
  });

  console.log("Fetching profiles...");
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) {
    console.error("Error fetching profiles:", pErr);
    return;
  }

  for (const p of profiles) {
    const expectedPoints = completedCounts[p.id] || 0;
    
    let expectedTier = 'Básico';
    if (expectedPoints >= 30) expectedTier = 'Diamante';
    else if (expectedPoints >= 20) expectedTier = 'Oro';
    else if (expectedPoints >= 10) expectedTier = 'Plata';
    else if (expectedPoints >= 5) expectedTier = 'Bronce';

    if (p.loyalty_points !== expectedPoints || p.loyalty_tier !== expectedTier) {
      console.log(`Updating ${p.full_name}:`);
      console.log(`  Current: Points = ${p.loyalty_points}, Tier = ${p.loyalty_tier}`);
      console.log(`  Expected: Points = ${expectedPoints}, Tier = ${expectedTier}`);
      
      const { error: uErr } = await supabase
        .from('profiles')
        .update({
          loyalty_points: expectedPoints,
          loyalty_tier: expectedTier
        })
        .eq('id', p.id);
        
      if (uErr) {
        console.error(`  Error updating profile for ${p.full_name}:`, uErr.message);
      } else {
        console.log(`  Successfully updated!`);
      }
    } else {
      console.log(`Profile ${p.full_name} is already correct (Points: ${p.loyalty_points}, Tier: ${p.loyalty_tier}).`);
    }
  }
}

main();
