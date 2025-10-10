import { NextResponse } from "next/server";

export async function GET() {
  const mask = (v?: string) => (v ? `${v.slice(0,3)}…${v.slice(-3)}` : null);
  const asBool = (v?: string) => Boolean(v);
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || null;

  return NextResponse.json({
    ok: true,
    env: {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
      CREEM_API_URL: process.env.CREEM_API_URL || null,
      CREEM_API_KEY_len: process.env.CREEM_API_KEY?.length || 0,
      CREEM_WEBHOOK_SECRET_len: process.env.CREEM_WEBHOOK_SECRET?.length || 0,
      CREEM_SUCCESS_URL: process.env.CREEM_SUCCESS_URL || null,
      SUPABASE: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
        anon_len: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        service_role_len: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      },
    },
    commit,
    timestamp: new Date().toISOString(),
  });
}
