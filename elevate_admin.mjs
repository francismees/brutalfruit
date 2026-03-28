import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing keys");
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
    console.log("No users found. Go to localhost:3000/login, sign up/login, then run this again if needed.");
    return;
  }

  for (const u of users) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(u.id, {
      user_metadata: { ...u.user_metadata, role: "admin" }
    });
    if (updateError) {
      console.error(`Failed to promote ${u.email}:`, updateError);
    } else {
      console.log(`Promoted to admin: ${u.email}`);
    }
  }
}

elevate();
