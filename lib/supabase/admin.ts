import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// RLS'i aşar; sadece sunucuda, kullanıcıdan bağımsız arka plan işlerinde kullan.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
