"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { sendPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SettingsResult = { ok: true } | { ok: false; error: string };

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().max(256), auth: z.string().max(256) }),
});

export async function savePushSubscription(
  raw: unknown,
): Promise<SettingsResult> {
  if (!(await getUser())) redirect("/login");
  const parsed = subscriptionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Geçersiz abonelik." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
  });
  if (error) return { ok: false, error: "Bildirimler açılamadı, tekrar dene." };
  return { ok: true };
}

export async function removePushSubscription(
  endpoint: string,
): Promise<SettingsResult> {
  if (!(await getUser())) redirect("/login");
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) return { ok: false, error: "Bildirimler kapatılamadı." };
  return { ok: true };
}

export async function updateReminder(
  enabled: boolean,
  hour: number,
): Promise<SettingsResult> {
  const user = await getUser();
  if (!user) redirect("/login");
  const parsed = z.number().int().min(0).max(23).safeParse(hour);
  if (!parsed.success) return { ok: false, error: "Geçersiz saat." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ reminders_enabled: enabled, reminder_hour: parsed.data })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Kaydedilemedi, tekrar dene." };
  revalidatePath("/settings");
  return { ok: true };
}

// Kendi cihazlarına deneme bildirimi gönderir.
export async function sendTestNotification(): Promise<SettingsResult> {
  if (!(await getUser())) redirect("/login");

  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");
  if (!subs || subs.length === 0) {
    return { ok: false, error: "Bu hesapta kayıtlı cihaz yok." };
  }

  let delivered = 0;
  for (const sub of subs) {
    const result = await sendPush(sub, {
      title: "The Chain",
      body: "Bildirimler çalışıyor. Bugünün halkasını eklemeyi unutma.",
      url: "/",
      tag: "test",
    });
    if (result === "ok") delivered++;
    if (result === "gone") {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
  }
  return delivered > 0
    ? { ok: true }
    : { ok: false, error: "Bildirim gönderilemedi. Aboneliği kapatıp tekrar aç." };
}

// Hesabı ve tüm verilerini kalıcı siler (zincirler, arkadaşlıklar, gruplar, abonelikler).
// Kullanıcı adını yazarak onaylanır.
export async function deleteAccount(confirmation: string): Promise<SettingsResult> {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();
  if (!profile?.username || confirmation.trim().toLowerCase() !== profile.username) {
    return { ok: false, error: "Kullanıcı adını doğru yazmalısın." };
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: "Hesap silinemedi, tekrar dene." };

  await supabase.auth.signOut();
  redirect("/login");
}
