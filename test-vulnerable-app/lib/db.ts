const SUPABASE_URL = "https://abcdefghij.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.fake_anon_key_for_demo";

export async function getUsers() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      anon_key: SUPABASE_ANON_KEY,
    },
  });
  return res.json();
}

export async function createUser(data: { email: string; name: string }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return res.json();
}
