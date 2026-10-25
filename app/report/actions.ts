"use server";

import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ReportResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  userId: z.string().uuid(),
  reason: z.enum(["username", "abuse", "other"]),
  note: z.string().trim().max(300).optional(),
});

export async function reportUser(input: unknown): Promise<ReportResult> {
  if (!(await getUser())) return { ok: false, error: "Oturum süresi doldu." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz bildirim." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("report_user", {
    p_user_id: parsed.data.userId,
    p_reason: parsed.data.reason,
    p_note: parsed.data.note,
  });
  if (error) {
    return {
      ok: false,
      error: error.message.includes("rate_limited")
        ? "Bugün çok fazla bildirim gönderdin. Yarın tekrar dene."
        : "Bildirim gönderilemedi, tekrar dene.",
    };
  }
  return { ok: true };
}
