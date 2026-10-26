"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { personalChainSchema } from "@/lib/validations/chain";

export type ChainFormState = { error?: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createChain(
  _prev: ChainFormState,
  formData: FormData,
): Promise<ChainFormState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const parsed = personalChainSchema.safeParse({
    title: formData.get("title"),
    kind: formData.get("kind"),
    color: formData.get("color"),
    frequency: formData.get("frequency") ?? undefined,
    goal: formData.get("goal") ?? undefined,
    jokers: formData.get("jokers") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { title, kind, color, frequency, goal, jokers } = parsed.data;
  const weekly = frequency === "weekly";

  const supabase = await createClient();
  const { error } = await supabase.from("chains").insert({
    title,
    kind,
    color,
    owner_id: user.id,
    // Haftalık hedefli zincirde joker yoktur (veritabanı da 0'a sabitler).
    weekly_jokers: weekly ? 0 : jokers,
    goal_per_week: weekly ? goal : null,
  });
  if (error) {
    const message = error.message;
    return {
      error: message.includes("chain_total_limit")
        ? "Çok fazla zincir oluşturdun. Eski zincirlerini sil."
        : message.includes("chain_limit")
          ? "Zincir limitine ulaştın. Birini arşivle ya da planını yükselt."
          : "Zincir oluşturulamadı, lütfen tekrar dene.",
    };
  }

  revalidatePath("/");
  redirect("/");
}

export async function checkIn(chainId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in", { p_chain_id: chainId });
  if (error) return { ok: false, error: "Tamamlanamadı, tekrar dene." };
  revalidatePath("/");
  return { ok: true };
}

const JOKER_ERRORS: Record<string, string> = {
  group_jokers_fixed: "Ortak zincirin joker hakkı grup kurulurken belirlenir.",
  weekly_goal_no_jokers: "Haftalık hedefli zincirlerde joker yoktur.",
};

export async function setChainJokers(
  chainId: string,
  value: number,
): Promise<ActionResult> {
  if (!Number.isInteger(value) || value < 0 || value > 2) {
    return { ok: false, error: "Geçersiz joker sayısı." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_chain_jokers", {
    p_chain_id: chainId,
    p_value: value,
  });
  if (error) {
    const key = Object.keys(JOKER_ERRORS).find((k) => error.message.includes(k));
    return { ok: false, error: key ? JOKER_ERRORS[key] : "Kaydedilemedi, tekrar dene." };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function reportRelapse(chainId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_relapse", {
    p_chain_id: chainId,
  });
  if (error) return { ok: false, error: "Kaydedilemedi, tekrar dene." };
  revalidatePath("/");
  return { ok: true };
}

export async function archiveChain(chainId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chains")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", chainId);
  if (error) return { ok: false, error: "Arşivlenemedi, tekrar dene." };
  revalidatePath("/");
  revalidatePath("/archive");
  return { ok: true };
}

export async function deleteChain(chainId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("chains").delete().eq("id", chainId);
  if (error) return { ok: false, error: "Silinemedi, tekrar dene." };
  revalidatePath("/");
  revalidatePath("/archive");
  return { ok: true };
}

export async function updateTimezone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
  } catch {
    return;
  }
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ timezone: timeZone }).eq("id", user.id);
  revalidatePath("/");
}

export async function restoreChain(chainId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chains")
    .update({ archived_at: null })
    .eq("id", chainId);
  if (error) {
    return {
      ok: false,
      error: error.message.includes("chain_limit")
        ? "Zincir limitin dolu. Birini arşivle ya da planını yükselt."
        : "Geri alınamadı, tekrar dene.",
    };
  }
  revalidatePath("/");
  revalidatePath("/archive");
  return { ok: true };
}
