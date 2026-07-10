import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== INSPECTING SALES TABLE COLUMNS ===");
  // Since we cannot run raw sql unless we have an RPC, let's try a select * query on a non-existent ID
  // or a limit 0 query, and look at the keys of the returned format or inspect error or try selecting from pg catalog if allowed.
  // Actually, Supabase REST API allows selecting pg columns via rpc if a custom rpc is defined, 
  // but if not, we can just do a select('*').limit(1) and if there are rows we get the keys. If no rows, we can check a system query.
  // Let's first check if there are any rows in 'sales':
  const { data: sales, error: sErr } = await supabase.from('sales').select('*').limit(1);
  if (sErr) {
    console.error("Error reading sales:", sErr);
  } else {
    console.log("Sales data:", sales);
    if (sales && sales.length > 0) {
      console.log("Columns:", Object.keys(sales[0]));
    }
  }

  // Let's also see what columns are in products:
  const { data: products } = await supabase.from('products').select('*').limit(1);
  if (products && products.length > 0) {
    console.log("\nProducts columns:", Object.keys(products[0]));
  }
}

main();
