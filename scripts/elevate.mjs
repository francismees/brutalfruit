import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const parts = line.split('=');
      const key = parts[0]?.trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      return [key, value];
    })
);

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function elevate() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  
  if (users.length === 0) {
    console.log("No users found. Go to localhost:3000/login, sign up/login, then run this script again.");
    return;
  }

  for (const u of users) {
    if (u.app_metadata?.role === 'admin') continue;
    
    // Elevate role to admin
    const { error: updateError } = await supabase.auth.admin.updateUserById(u.id, {
      app_metadata: { ...u.app_metadata, role: "admin" }
    });
    
    if (updateError) {
      console.error(`Failed to promote ${u.email}:`, updateError);
    } else {
      console.log(`✅ Promoted to ADMIN: ${u.email}`);
    }
  }
  console.log("Done.");
}

elevate();
