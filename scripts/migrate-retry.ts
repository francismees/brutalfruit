import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.migration');
dotenv.config({ path: envPath });

const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL || '';
const OLD_SUPABASE_SERVICE_ROLE_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || '';
const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL || '';
const NEW_SUPABASE_SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseOld = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const supabaseNew = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'event-photos';
const failedFilesPath = path.resolve(process.cwd(), 'failed_files.txt');

async function runRetry() {
  if (!fs.existsSync(failedFilesPath)) {
    console.error('failed_files.txt not found.');
    process.exit(1);
  }

  const filePaths = fs.readFileSync(failedFilesPath, 'utf-8')
    .split('\n')
    .map(f => f.trim())
    .filter(f => f.length > 0);

  console.log(`Retrying manual migration for ${filePaths.length} files...`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    console.log(`[${i+1}/${filePaths.length}] Retrying: ${filePath}`);

    try {
      const { data, error: downloadErr } = await supabaseOld.storage.from(BUCKET).download(filePath);
      if (downloadErr) throw downloadErr;

      const buffer = await data.arrayBuffer();

      const { error: uploadErr } = await supabaseNew.storage.from(BUCKET).upload(filePath, buffer, {
        upsert: true
      });
      if (uploadErr) throw uploadErr;

      successCount++;
    } catch (err: any) {
      console.error(`Failed retry for ${filePath}: ${err.message}`);
      failureCount++;
    }
  }

  console.log('\n============================================');
  console.log('Retry Complete');
  console.log(`Success: ${successCount}`);
  console.log(`Failures: ${failureCount}`);
  console.log('============================================');
}

runRetry().catch(console.error);
