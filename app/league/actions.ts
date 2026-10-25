"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type LeagueResult = { ok: true } | { ok: false; error: string };

export async function setLeagueVisible(value: boolean): Promise<LeagueResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ league_visible: value })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Kaydedilemedi, tekrar dene." };
  revalidatePath("/league");
  return { ok: true };
}
