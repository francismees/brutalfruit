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

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  console.log("Testing auth...");
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error || users.length === 0) return console.log("No users", error);
  const user = users[0];
  
  console.log("Testing albums...");
  const { data: albums } = await supabase.from('albums').select('id').limit(1);
  if (!albums || albums.length === 0) return console.log("No albums");
  const albumId = albums[0].id;
  
  console.log("Testing storage upload...");
  const fileContent = Buffer.from('Testing 123');
  const path = `${albumId}/test-${Date.now()}.txt`;
  
  const { error: uploadError } = await supabase.storage.from('event-photos').upload(path, fileContent);
  if (uploadError) console.error("Upload error:", uploadError);
  else console.log("Upload SUCCESS");

  console.log("Testing image table insert...");
  const { error: dbError } = await supabase.from('images').insert({
    album_id: albumId,
    storage_path: path,
    filename: "test.txt",
    file_size: 11,
    width: null,
    height: null,
    uploaded_by: user.id
  });
  if (dbError) console.error("Database insert error:", dbError);
  else console.log("Database insert SUCCESS");
}

testUpload();
