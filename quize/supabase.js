const SUPABASE_URL = "https://tvehmaaosdptlvgrbwpm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kd-G1PnEB0vDog11oKPN0g_MLCXJOqr";

const isConfigured =
  !SUPABASE_URL.includes("YOUR-PROJECT") &&
  !SUPABASE_ANON_KEY.includes("YOUR_");

if (!window.supabase) {
  console.error("Supabase CDN failed to load. Check the internet connection and CDN script tag.");
} else if (!isConfigured) {
  console.error("Set the real SUPABASE_URL and SUPABASE_ANON_KEY in supabase.js.");
}

const supabaseClient = window.supabase && isConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit"
      }
    })
  : null;

window.supabaseClient = supabaseClient;
