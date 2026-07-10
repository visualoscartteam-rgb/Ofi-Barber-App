import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Trying to insert with custom sale_date...");
  const { data, error } = await supabase.from('sales').insert({
    quantity: 1,
    total_price: 150,
    sale_date: '2026-07-05'
  }).select();

  if (error) {
    console.error("Insert failed:", error);
  } else {
    console.log("Insert succeeded! Data returned:");
    console.log(data[0]);

    // Clean up
    await supabase.from('sales').delete().eq('id', data[0].id);
  }
}

main();
