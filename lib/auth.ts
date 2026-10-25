import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Oturumu Supabase Auth sunucusuna sorarak doğrular (cookie'ye güvenmez).
export async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

// Giriş yapmış ve kullanıcı adı seçmiş kullanıcının profilini döndürür; değilse yönlendirir.
// Sayfa okumaları için JWT'yi yerelde doğrulayan getClaims kullanılır (ağ turu yok);
// veri yazan işlemler yine getUser ile doğrulanır.
export async function requireProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, timezone, total_completed, plan, discoverable, reminders_enabled, reminder_hour",
    )
    .eq("id", userId)
    .single();

  if (!profile?.username) redirect("/onboarding");
  return { profile };
}
