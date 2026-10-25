"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FriendResult = { ok: true } | { ok: false; error: string };

const SEND_ERRORS: Record<string, string> = {
  already_exists: "Bu kullanıcıyla zaten bir arkadaşlık isteği var.",
  too_many_requests: "Çok fazla bekleyen isteğin var. Birkaçını iptal et.",
  friend_limit: "Arkadaş limitine ulaştın.",
  user_not_found: "Kullanıcı bulunamadı.",
  self_request: "Kendine istek gönderemezsin.",
};

export async function sendFriendRequest(userId: string): Promise<FriendResult> {
  if (!(await getUser())) return { ok: false, error: "Oturum süresi doldu." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_friend_request", {
    p_addressee: userId,
  });
  if (error) {
    const key = Object.keys(SEND_ERRORS).find((k) => error.message.includes(k));
    return {
      ok: false,
      error: key ? SEND_ERRORS[key] : "İstek gönderilemedi, tekrar dene.",
    };
  }
  revalidatePath("/friends");
  return { ok: true };
}

export async function acceptFriendRequest(id: number): Promise<FriendResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", id);
  if (error) return { ok: false, error: "Kabul edilemedi, tekrar dene." };
  revalidatePath("/friends");
  return { ok: true };
}

// Reddetme, isteği iptal etme ve arkadaşlıktan çıkarma aynı işlemdir: satırı siler.
export async function removeFriendship(id: number): Promise<FriendResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) return { ok: false, error: "İşlem yapılamadı, tekrar dene." };
  revalidatePath("/friends");
  return { ok: true };
}

export async function setDiscoverable(value: boolean): Promise<FriendResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ discoverable: value })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Kaydedilemedi, tekrar dene." };
  revalidatePath("/friends");
  return { ok: true };
}
