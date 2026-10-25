"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Tur aşaması: 0 görülmedi, 1 genel tur bitti, 2 tamamlandı/atlandı. Sadece ilerler.
export async function advanceTour(stage: 1 | 2) {
  if (!(await getUser())) return;
  const supabase = await createClient();
  await supabase.rpc("set_tour_stage", { p_stage: stage });
  // Tarayıcı önbelleğindeki ana sayfa turu tekrar açmasın.
  revalidatePath("/");
}

// Ayarlar'dan "Turu tekrar göster".
export async function restartTour() {
  if (!(await getUser())) return;
  const supabase = await createClient();
  await supabase.rpc("reset_tour");
  revalidatePath("/");
}

// Uygulama ana ekrandan açıldığında bir kez çağrılır (yükleme ölçümü).
export async function markPwaInstalled() {
  if (!(await getUser())) return;
  const supabase = await createClient();
  await supabase.rpc("mark_pwa_installed");
}
