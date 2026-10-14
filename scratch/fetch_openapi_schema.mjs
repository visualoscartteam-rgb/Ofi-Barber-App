const supabaseUrl = 'https://qielchkzjawjnqqpvhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWxjaGt6amF3am5xcXB2aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTcsImV4cCI6MjA5NDU2NjM5N30.qHXByQf59LId-mNctplysOnFhK3BTfAAKXYE_8n3UQs';

async function main() {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseKey
    }
  });
  const schema = await res.json();
  console.log("=== SCHEMA DEFINITIONS ===");
  if (schema.definitions) {
    console.log("Available Tables:", Object.keys(schema.definitions));
    // Let's print details of 'sales' if it exists in case it is capitalized or named differently
    const matchedKey = Object.keys(schema.definitions).find(k => k.toLowerCase() === 'sales');
    if (matchedKey) {
      console.log(`\nMatched key: ${matchedKey}`);
      console.log("Properties:", Object.keys(schema.definitions[matchedKey].properties));
      console.log("Full properties details:");
      console.log(JSON.stringify(schema.definitions[matchedKey].properties, null, 2));
    }
  } else {
    console.log("No definitions found in response:", schema);
  }
}

main();
