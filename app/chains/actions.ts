"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { chainSchema } from "@/lib/validations/chain";

export type ChainFormState = { error?: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createChain(
  _prev: ChainFormState,
  formData: FormData,
): Promise<ChainFormState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const parsed = chainSchema.safeParse({
    title: formData.get("title"),
    kind: formData.get("kind"),
    color: formData.get("color"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("chains")
    .insert({ ...parsed.data, owner_id: user.id });
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
