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

// Giriş yapmış ve kullanıcı adı seçmiş kullanıcıyı döndürür; değilse yönlendirir.
export async function requireProfile() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, timezone, total_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.username) redirect("/onboarding");
  return { user, profile };
}
