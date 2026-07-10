import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== INSPECTING APPOINTMENTS SCHEMA ===");
  const { data, error } = await supabase.from('appointments').select('*').limit(1);
  if (error) {
    console.error("Query failed:", error);
  } else if (data && data.length > 0) {
    console.log("Columns in appointments table:", Object.keys(data[0]));
    console.log("Sample appointment:", data[0]);
  } else {
    console.log("No appointments found. Trying to insert an empty object to check constraints...");
    const { data: insData, error: insErr } = await supabase.from('appointments').insert({}).select();
    if (insErr) {
      console.log("Insert failed. Details:", insErr);
    } else {
      console.log("Insert succeeded. Columns:", Object.keys(insData[0]));
      await supabase.from('appointments').delete().eq('id', insData[0].id);
    }
  }
}

main();
