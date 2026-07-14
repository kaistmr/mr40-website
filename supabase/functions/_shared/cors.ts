// supabase/functions/_shared/cors.ts
const ALLOWED = [
  "https://kaistmr.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
