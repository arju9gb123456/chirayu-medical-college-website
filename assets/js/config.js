/* =========================================================
   Site configuration (Supabase → Project Settings → API Keys)
   Only the PUBLISHABLE key goes here. It is safe in the browser:
   Row Level Security in supabase/schema.sql only lets admins
   change content or upload files.
   NEVER put the secret key (sb_secret_...) in this file.
   ========================================================= */
window.CMCH_CONFIG = {
  supabaseUrl: 'https://jrzginnflqedtwqpqkyr.supabase.co',
  supabaseAnonKey: 'sb_publishable_z4EXydv_9pQggvIi1Pfw5g_Ht-z3htN',
  storageBucket: 'site-media'
};
