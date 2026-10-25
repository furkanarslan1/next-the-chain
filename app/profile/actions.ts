"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Kutlamayı görülen en yüksek rütbe olarak kaydeder (sadece ilerler).
export async function markRankSeen(rank: number) {
  const parsed = z.number().int().min(0).max(50).safeParse(rank);
  if (!parsed.success || !(await getUser())) return;

  const supabase = await createClient();
  await supabase.rpc("set_rank_seen", { p_rank: parsed.data });
  // Tarayıcı önbelleğindeki sayfada kutlama tekrar açılmasın.
  revalidatePath("/");
  revalidatePath("/profile");
}
