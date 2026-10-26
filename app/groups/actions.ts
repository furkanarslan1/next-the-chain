"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { groupChainSchema } from "@/lib/validations/chain";

export type GroupFormState = { error?: string };
export type GroupResult = { ok: true } | { ok: false; error: string };

const ERRORS: Record<string, string> = {
  chain_limit:
    "Zincir limitin dolu. Birini sil ya da planını yükselt, sonra tekrar dene.",
  chain_total_limit: "Çok fazla zincir oluşturdun. Eski zincirlerini sil.",
  group_too_big: "Bir grupta en fazla 20 kişi olabilir.",
  group_limit: "En fazla 10 grup oluşturabilirsin.",
  not_friends: "Sadece arkadaşlarını davet edebilirsin.",
  owner_cannot_leave: "Grubun sahibi ayrılamaz. Grubu silebilirsin.",
  invite_not_found: "Bu davet artık geçerli değil.",
  group_not_found: "Grup bulunamadı.",
};

function messageFor(error: { message: string }) {
  const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
  return key ? ERRORS[key] : "İşlem yapılamadı, tekrar dene.";
}

const uuid = z.string().uuid();

export async function createGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  if (!(await getUser())) redirect("/login");

  const parsed = groupChainSchema.safeParse({
    title: formData.get("title"),
    kind: formData.get("kind"),
    color: formData.get("color"),
    jokers: formData.get("jokers") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const friendIds = z
    .array(uuid)
    .safeParse(formData.getAll("friends").map(String));
  if (!friendIds.success) return { error: "Geçersiz arkadaş seçimi." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_chain_group", {
    p_title: parsed.data.title,
    p_color: parsed.data.color,
    p_kind: parsed.data.kind,
    p_friend_ids: friendIds.data,
    p_weekly_jokers: parsed.data.jokers,
  });
  if (error) return { error: messageFor(error) };

  revalidatePath("/groups");
  revalidatePath("/");
  redirect(`/groups/${data}`);
}

export async function respondGroupInvite(
  groupId: string,
  accept: boolean,
): Promise<GroupResult> {
  if (!uuid.safeParse(groupId).success) return { ok: false, error: "Geçersiz grup." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_group_invite", {
    p_group_id: groupId,
    p_accept: accept,
  });
  if (error) return { ok: false, error: messageFor(error) };
  revalidatePath("/groups");
  revalidatePath("/");
  return { ok: true };
}

export async function inviteToGroup(
  groupId: string,
  friendIds: string[],
): Promise<GroupResult> {
  const ids = z.array(uuid).min(1).safeParse(friendIds);
  if (!uuid.safeParse(groupId).success || !ids.success) {
    return { ok: false, error: "Davet edilecek arkadaşını seç." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_to_group", {
    p_group_id: groupId,
    p_friend_ids: ids.data,
  });
  if (error) return { ok: false, error: messageFor(error) };
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export async function cancelGroupInvite(
  groupId: string,
  userId: string,
): Promise<GroupResult> {
  if (!uuid.safeParse(groupId).success || !uuid.safeParse(userId).success) {
    return { ok: false, error: "Geçersiz davet." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_group_invite", {
    p_group_id: groupId,
    p_user_id: userId,
  });
  if (error) return { ok: false, error: messageFor(error) };
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export async function leaveGroup(groupId: string): Promise<GroupResult> {
  if (!uuid.safeParse(groupId).success) return { ok: false, error: "Geçersiz grup." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_group", { p_group_id: groupId });
  if (error) return { ok: false, error: messageFor(error) };
  revalidatePath("/groups");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteGroup(groupId: string): Promise<GroupResult> {
  if (!uuid.safeParse(groupId).success) return { ok: false, error: "Geçersiz grup." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_group", { p_group_id: groupId });
  if (error) return { ok: false, error: messageFor(error) };
  revalidatePath("/groups");
  revalidatePath("/");
  return { ok: true };
}
