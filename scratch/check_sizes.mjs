import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== APP_CONFIG SIZE ===");
  const { data: configs } = await supabase.from('app_config').select('*');
  if (configs) {
    configs.forEach(c => {
      const valStr = JSON.stringify(c.value);
      console.log(`Config Key: ${c.key} - Value size in chars: ${valStr.length} (${(valStr.length / 1024).toFixed(2)} KB)`);
    });
  }

  console.log("\n=== PROFILES SIZE ===");
  const { data: profiles } = await supabase.from('profiles').select('*');
  if (profiles) {
    profiles.forEach(p => {
      const avatarLen = p.avatar_url ? p.avatar_url.length : 0;
      const prefLen = p.preferences ? p.preferences.length : 0;
      console.log(`User: ${p.full_name} - Avatar URL size: ${(avatarLen / 1024).toFixed(2)} KB, Preferences size: ${(prefLen / 1024).toFixed(2)} KB`);
    });
  }

  console.log("\n=== PROMOTIONS SIZE ===");
  const { data: promotions } = await supabase.from('promotions').select('*');
  if (promotions) {
    promotions.forEach(p => {
      const imgLen = p.image ? p.image.length : 0;
      console.log(`Promotion: ${p.name} - Image URL size: ${(imgLen / 1024).toFixed(2)} KB`);
    });
  }

  console.log("\n=== PRODUCTS SIZE ===");
  const { data: products } = await supabase.from('products').select('*');
  if (products) {
    products.forEach(p => {
      const imgLen = p.image ? p.image.length : 0;
      console.log(`Product: ${p.name} - Image URL size: ${(imgLen / 1024).toFixed(2)} KB`);
    });
  }
}

main();
