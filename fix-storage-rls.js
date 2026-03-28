const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function fixRls() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const serviceRoleMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
  
  if (!urlMatch || !serviceRoleMatch) return;
  const admin = createClient(urlMatch[1], serviceRoleMatch[1]);
  
  const sql = `
-- Allow photographers to update their own files (essential for TUS resumable uploads > 6MB)
DROP POLICY IF EXISTS "Users can update own event photos" ON storage.objects;
CREATE POLICY "Users can update own event photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-photos' AND auth.uid() = owner);
  `;
  
  /* we don't have rpc query mechanism out of box so I'll just append it to schema.sql */
}
fixRls();
