import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== TESTING APP_CONFIG UPSERT ===");
  const { data: configs } = await supabase.from('app_config').select('*').eq('key', 'barber_schedules');
  console.log("Current schedules config:", JSON.stringify(configs, null, 2));

  if (configs && configs.length > 0) {
    const originalValue = configs[0].value;
    console.log("Attempting to upsert back the same value to test permissions...");
    
    const { data, error } = await supabase
      .from('app_config')
      .upsert({ key: 'barber_schedules', value: originalValue })
      .select();

    if (error) {
      console.error("Upsert failed:", error);
    } else {
      console.log("Upsert succeeded!", data);
    }
  }
}

main();
