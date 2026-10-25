"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markBadgesSeen() {
  if (!(await getUser())) return;
  const supabase = await createClient();
  await supabase.rpc("mark_badges_seen");
  // Önbellekteki ana sayfada "yeni rozet" penceresi tekrar açılmasın.
  revalidatePath("/");
}
