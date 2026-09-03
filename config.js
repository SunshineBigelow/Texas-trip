/* ============================================================
   Supabase connection settings
   ------------------------------------------------------------
   Fill in the two values below from your Supabase dashboard:
     Project Settings → API
       • Project URL   → supabaseUrl
       • anon / public → supabaseAnonKey

   Use the key labelled "anon" / "public". It is DESIGNED to be
   visible in the browser and is safe to commit here — access is
   controlled by the row-level security policies in
   supabase/schema.sql, not by hiding this key.

   NEVER put the "service_role" key in this file. That one
   bypasses all security policies and must stay on a server.
   ============================================================ */

window.TRIP_CONFIG = {
  supabaseUrl:     'https://bmyjbioioqsrsuqabehj.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJteWpiaW9pb3FzcnN1cWFiZWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NjE1NDEsImV4cCI6MjEwNDAzNzU0MX0.84CzE2HeFTTouyLmOfcyosTR2PS6dlLQy4SkbN7U-RI',

  // Storage bucket created by supabase/schema.sql — leave as-is
  // unless you named it something else.
  photoBucket: 'trip-photos'
};
