import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';

async function main() {
  console.log("=== CLEANING GIANT PROFILE AVATARS ===");

  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, avatar_url');
  if (pErr) {
    console.error("Error fetching profiles:", pErr);
    return;
  }

  for (const p of profiles) {
    const len = p.avatar_url ? p.avatar_url.length : 0;
    if (len > 100 * 1024) { // larger than 100 KB
      console.log(`Cleaning avatar for user ${p.full_name} (Current size: ${(len/1024).toFixed(2)} KB)`);
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: DEFAULT_AVATAR })
        .eq('id', p.id);
      
      if (updErr) {
        console.error(`Error updating ${p.full_name}:`, updErr);
      } else {
        console.log(`Successfully reset avatar for ${p.full_name} to a lightweight default avatar!`);
      }
    }
  }
}

main();
