import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const envPath = path.resolve(process.cwd(), '.env.migration');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('.env.migration not found, falling back to process.env');
}

const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL || '';
const OLD_SUPABASE_SERVICE_ROLE_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || '';
const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL || '';
const NEW_SUPABASE_SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY || '';

if (!OLD_SUPABASE_URL || !OLD_SUPABASE_SERVICE_ROLE_KEY || !NEW_SUPABASE_URL || !NEW_SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables in .env.migration');
  process.exit(1);
}

const supabaseOld = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const supabaseNew = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const isDryRun = process.argv.includes('--dry-run');

const logFile = path.resolve(process.cwd(), 'migration-log.txt');
function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

async function promptContinue(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${message} Continue to next step? (y/n) `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function fetchAllRows(client: any, table: string) {
  let allData: any[] = [];
  let start = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await client.from(table).select('*').range(start, start + size - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < size) break;
    start += size;
  }
  return allData;
}

async function batchedInsert(client: any, table: string, data: any[], batchSize: number) {
  if (data.length === 0) return 0;
  if (isDryRun) return data.length;
  
  let inserted = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await client.from(table).insert(batch);
    if (error) {
      log(`Error inserting batch into ${table}: ${error.message}`);
      throw error;
    }
    inserted += batch.length;
  }
  return inserted;
}

async function countRows(client: any, table: string) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    log(`Error counting ${table}: ${error.message}`);
    return 0;
  }
  return count || 0;
}

const stats = {
  albums: 0,
  users: 0,
  photographers: 0,
  albumPhotographers: 0,
  imagesDb: 0,
  storageTotal: 0,
  storageSuccess: 0,
  storageFailures: 0,
  pageViews: 0,
  imageEvents: 0
};

const BUCKET = 'event-photos';
const userIdMap: Record<string, string> = {}; // maps old id -> new id

async function listAllStorageFiles(client: any, bucket: string, currentPath: string = ''): Promise<string[]> {
  const allFiles: string[] = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const { data, error } = await client.storage.from(bucket).list(currentPath, {
      limit,
      offset,
      search: ''
    });
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    for (const item of data) {
      if (item.name === '.emptyFolderPlaceholder') continue;
      
      const fullPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      
      if (!item.id && !item.metadata) {
        // It's a folder
        const subFiles = await listAllStorageFiles(client, bucket, fullPath);
        allFiles.push(...subFiles);
      } else {
        allFiles.push(fullPath);
      }
    }
    
    if (data.length < limit) break;
    offset += limit;
  }
  return allFiles;
}

async function run() {
  log(`Starting Supabase Migration... (Dry run: ${isDryRun})`);
  
  try {
    log('--- Step 1: Migrate albums ---');
    const albums = await fetchAllRows(supabaseOld, 'albums');
    stats.albums = albums.length;
    await batchedInsert(supabaseNew, 'albums', albums, 100);
    log(`Migrated ${stats.albums} albums`);
  } catch (err: any) {
    log(`Step 1 failed: ${err.message}`);
    if (!(await promptContinue(''))) process.exit(1);
  }

  try {
    log('--- Step 2: Migrate auth users (photographers) ---');
    let hasMoreUsers = true;
    let page = 1;
    const oldUsers = [];
    while (hasMoreUsers) {
      const { data: { users }, error } = await supabaseOld.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      oldUsers.push(...users);
      if (users.length < 1000) hasMoreUsers = false;
      page++;
    }

    const { data: { users: newUsers }, error: newUsersErr } = await supabaseNew.auth.admin.listUsers();
    if (newUsersErr) throw newUsersErr;
    const newAdmin = newUsers.find((u: any) => u.email === 'francis@str8upvibes.com');

    let migrated = 0;
    
    for (const user of oldUsers) {
      // Map existing admin user
      if (user.email === 'francis@str8upvibes.com') {
        if (newAdmin) {
          userIdMap[user.id] = newAdmin.id;
          migrated++;
        } else {
          log('Warning: Admin user not found on new project!');
        }
        continue;
      }

      if (!isDryRun) {
        // Create other users on new project
        const { data: newUserObj, error } = await supabaseNew.auth.admin.createUser({
          email: user.email,
          password: 'TemporaryPassword123!',
          email_confirm: true,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
        });
        if (error) {
          log(`User creation error for ${user.email}: ${error.message}`);
          continue; 
        }
        if (newUserObj.user) {
          userIdMap[user.id] = newUserObj.user.id;
          migrated++;
        }
      } else {
        userIdMap[user.id] = `dry-run-mapped-id-${user.id}`;
        migrated++;
      }
    }
    stats.users = migrated;
    log(`Migrated ${stats.users} users. ID mapping created.`);
  } catch (err: any) {
    log(`Step 2 failed: ${err.message}`);
    if (!(await promptContinue(''))) process.exit(1);
  }

  try {
    log('--- Step 3: Migrate photographers ---');
    const photographers = await fetchAllRows(supabaseOld, 'photographers');
    const mappedPhotographers = photographers.map(p => ({
      ...p,
      id: userIdMap[p.id] || p.id
    }));
    stats.photographers = mappedPhotographers.length;
    await batchedInsert(supabaseNew, 'photographers', mappedPhotographers, 50);
    log(`Migrated ${stats.photographers} photographer records`);
  } catch (err: any) {
    log(`Step 3 failed: ${err.message}`);
    if (!(await promptContinue(''))) process.exit(1);
  }

  try {
    log('--- Step 4: Migrate album_photographers ---');
    const albumPhotographers = await fetchAllRows(supabaseOld, 'album_photographers');
    const mappedAP = albumPhotographers.map(ap => ({
      ...ap,
      photographer_id: userIdMap[ap.photographer_id] || ap.photographer_id
    }));
    stats.albumPhotographers = mappedAP.length;
    await batchedInsert(supabaseNew, 'album_photographers', mappedAP, 50);
    log(`Migrated ${stats.albumPhotographers} album assignments`);
  } catch (err: any) {
    log(`Step 4 failed: ${err.message}`);
    if (!(await promptContinue(''))) process.exit(1);
  }

  try {
    log('--- Step 5: Migrate images (database records) ---');
    const images = await fetchAllRows(supabaseOld, 'images');
    const mappedImages = images.map(img => ({
      ...img,
      uploaded_by: img.uploaded_by ? (userIdMap[img.uploaded_by] || img.uploaded_by) : null
    }));
    stats.imagesDb = mappedImages.length;
    await batchedInsert(supabaseNew, 'images', mappedImages, 50);
    log(`Migrated ${stats.imagesDb} image records`);
  } catch (err: any) {
    log(`Step 5 failed: ${err.message}`);
    if (!(await promptContinue(''))) process.exit(1);
  }

  try {
    log('--- Step 6: Migrate storage files ---');
    log('Fetching file list...');
    const filePaths = await listAllStorageFiles(supabaseOld, BUCKET);
    stats.storageTotal = filePaths.length;
    
    if (isDryRun) {
      stats.storageSuccess = stats.storageTotal;
      log(`Would transfer ${stats.storageTotal} files`);
    } else {
      let currentIndex = 0;
      const worker = async () => {
        while (currentIndex < filePaths.length) {
          const idx = currentIndex++;
          const filePath = filePaths[idx];
          try {
            log(`Uploading file ${idx + 1}/${filePaths.length}: ${filePath}`);
            
            const { data: fileData, error: downloadErr } = await supabaseOld.storage.from(BUCKET).download(filePath);
            if (downloadErr) throw downloadErr;
            
            const buffer = await fileData.arrayBuffer();
            
            const { error: uploadErr } = await supabaseNew.storage.from(BUCKET).upload(filePath, buffer, {
              upsert: true
            });
            if (uploadErr) throw uploadErr;
            stats.storageSuccess++;
          } catch (err: any) {
            log(`Failed to migrate file ${filePath}: ${err.message}`);
            stats.storageFailures++;
          }
        }
      };

      const CONCURRENCY = 5;
      const workers = Array(CONCURRENCY).fill(null).map(() => worker());
      await Promise.all(workers);
    }
    
    log(`Migrated ${stats.storageSuccess}/${stats.storageTotal} storage files. ${stats.storageFailures} failures.`);
  } catch (err: any) {
    log(`Step 6 failed: ${err.message}`);
    if (!(await promptContinue(''))) process.exit(1);
  }

  try {
    log('--- Step 7: Migrate analytics data ---');
    const pageViews = await fetchAllRows(supabaseOld, 'analytics_page_views');
    stats.pageViews = pageViews.length;
    await batchedInsert(supabaseNew, 'analytics_page_views', pageViews, 100);

    const imageEvents = await fetchAllRows(supabaseOld, 'analytics_image_events');
    stats.imageEvents = imageEvents.length;
    await batchedInsert(supabaseNew, 'analytics_image_events', imageEvents, 100);
    log(`Migrated ${stats.pageViews} page views and ${stats.imageEvents} image events`);
  } catch (err: any) {
    log(`Step 7 failed: ${err.message}`);
    if (!(await promptContinue(''))) process.exit(1);
  }

  log('\n============================================');
  log('Migration Complete');
  log('============================================');
  log(`Albums:              ${stats.albums} migrated`);
  log(`Users:               ${stats.users} migrated`);
  log(`Photographers:       ${stats.photographers} migrated`);
  log(`Album Assignments:   ${stats.albumPhotographers} migrated`);
  log(`Images (DB):         ${stats.imagesDb} migrated`);
  log(`Storage Files:       ${stats.storageSuccess}/${stats.storageTotal} transferred (${stats.storageFailures} failures)`);
  log(`Page Views:          ${stats.pageViews} migrated`);
  log(`Image Events:        ${stats.imageEvents} migrated`);
  log('============================================\n');

  if (!isDryRun) {
    log('============================================');
    log('Post-Migration Verification');
    log('============================================');
    log(`Old Albums: ${stats.albums} | New Albums: ${await countRows(supabaseNew, 'albums')}`);
    log(`Old Photographers: ${stats.photographers} | New Photographers: ${await countRows(supabaseNew, 'photographers')}`);
    log(`Old Images: ${stats.imagesDb} | New Images: ${await countRows(supabaseNew, 'images')}`);
    log(`Old Page Views: ${stats.pageViews} | New Page Views: ${await countRows(supabaseNew, 'analytics_page_views')}`);
    log(`Old Image Events: ${stats.imageEvents} | New Image Events: ${await countRows(supabaseNew, 'analytics_image_events')}`);
    log('============================================');
  }
}

run().catch(console.error);
