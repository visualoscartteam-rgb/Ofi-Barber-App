import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== TESTING SALES JOIN QUERY ===");
  const { data: sales, error } = await supabase
    .from('sales')
    .select('*, products(name, commission)')
    .limit(5);

  if (error) {
    console.error("Query failed:", error);
  } else {
    console.log("Query succeeded! Found", sales.length, "sales:");
    console.log(JSON.stringify(sales, null, 2));
  }
}

main();
