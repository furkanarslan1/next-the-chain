"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { usernameSchema } from "@/lib/validations/username";

export type OnboardingState = { error?: string; value?: string };

export async function saveUsername(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const raw = String(formData.get("username") ?? "");
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, value: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.data })
    .eq("id", user.id);

  if (error) {
    // 23505: unique_violation
    return {
      error:
        error.code === "23505"
          ? "Bu kullanıcı adı alınmış, başka bir tane dene."
          : error.message.includes("username_blocked")
            ? "Bu kullanıcı adı kullanılamaz, başka bir tane dene."
            : "Kaydedilemedi, lütfen tekrar dene.",
      value: raw,
    };
  }

  redirect("/");
}
