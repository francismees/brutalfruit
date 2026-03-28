const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function test() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
  const serviceRoleMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
  
  if (!urlMatch || !serviceRoleMatch || !keyMatch) {
    console.log("Missing env vars");
    return;
  }
  
  const supabaseUrl = urlMatch[1];
  const serviceKey = serviceRoleMatch[1];
  const anonKey = keyMatch[1];
  
  const admin = createClient(supabaseUrl, serviceKey);
  
  // 1. Get Infocus Studio photographer
  const { data: p } = await admin.from('photographers')
    .select('*')
    .ilike('display_name', '%Infocus%')
    .single();
    
  if (!p) {
    console.log("Photographer not found");
    return;
  }
  console.log("Found Photographer:", p.display_name, p.id);
  
  // 2. Get assignments
  const { data: assignments } = await admin.from('album_photographers')
    .select('album_id')
    .eq('photographer_id', p.id);
    
  if (!assignments || assignments.length === 0) {
    console.log("No assignments for photographer");
    return;
  }
  const albumId = assignments[0].album_id;
  console.log("Found assigned album:", albumId);
  
  // 3. Since we don't have the user's password to login, let's create a temporary photographer with known password to test.
  const tempUser = { email: 'test_photo@brutalfruit.local', password: 'password123', name: 'Test Photographer' };
  
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: tempUser.email,
    password: tempUser.password,
    email_confirm: true,
  });
  
  if (authErr && !authErr.message.includes("already exist")) {
    console.log("Error creating user", authErr);
    return;
  }
  
  let tempUserId;
  if (authData?.user) {
    tempUserId = authData.user.id;
    await admin.from('photographers').upsert({ id: tempUserId, display_name: tempUser.name });
    await admin.from('album_photographers').upsert({ album_id: albumId, photographer_id: tempUserId });
  } else {
    // try to fetch existing
    const { data: users } = await admin.auth.admin.listUsers();
    tempUserId = users.users.find(u => u.email === tempUser.email)?.id;
  }
  
  console.log("Test User ID:", tempUserId);
  
  // 4. Log in as Test Photographer
  const userClient = createClient(supabaseUrl, anonKey);
  const { data: sessionData, error: sessionErr } = await userClient.auth.signInWithPassword({
    email: tempUser.email,
    password: tempUser.password
  });
  
  if (sessionErr) {
    console.log("Error logging in:", sessionErr);
    return;
  }
  
  console.log("Logged in successfully. Token length:", sessionData.session.access_token.length);
  
  // 5. Try inserting an image mimicking the useUpload hook
  const storagePath = `${albumId}/TEST-${Date.now()}-imagetest.jpg`;
  
  const payload = {
    album_id: albumId,
    storage_path: storagePath,
    filename: "imagetest.jpg",
    file_size: 1024,
    uploaded_by: tempUserId
  };
  console.log("Attempting to insert image:", payload);
  
  const { error: dbError } = await userClient.from('images').insert(payload);
  
  if (dbError) {
    console.log("DATABASE ERROR ON INSERT:", dbError);
  } else {
    console.log("DATABASE INSERT SUCCESSFUL");
  }
  
  // 6. Try uploading to storage mimicking the useUpload hook
  const { error: uploadError } = await userClient.storage
    .from('event-photos')
    .upload(storagePath, Buffer.from('test data'), {
      cacheControl: '3600',
      upsert: false
    });
    
  if (uploadError) {
    console.log("STORAGE ERROR ON UPLOAD:", uploadError);
  } else {
    console.log("STORAGE UPLOAD SUCCESSFUL");
  }
}

test().catch(console.error);
