import "server-only";
import { sendPush, type PushPayload } from "@/lib/push";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;
export type SubRow = { user_id: string; endpoint: string; p256dh: string; auth: string };

export async function loadSubscriptions(admin: Admin, userIds: string[]) {
  const byUser = new Map<string, SubRow[]>();
  if (userIds.length === 0) return byUser;

  const { data } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  for (const sub of data ?? []) {
    byUser.set(sub.user_id, [...(byUser.get(sub.user_id) ?? []), sub]);
  }
  return byUser;
}

export type SendStats = { sent: number; gone: string[] };

// Bir kullanıcının tüm cihazlarına gönderir.
export async function sendToDevices(
  subs: SubRow[],
  payload: PushPayload,
  stats: SendStats,
) {
  for (const sub of subs) {
    const result = await sendPush(sub, payload);
    if (result === "ok") stats.sent++;
    if (result === "gone") stats.gone.push(sub.endpoint);
  }
}

// Öğeleri paralel gruplar halinde işler; süre bütçesi dolunca durur.
// Her grup bitince afterBatch çağrılır (işaretleme için). İşlenen sayıyı döndürür.
export async function processInBatches<T>(
  items: T[],
  deadline: number,
  handle: (item: T) => Promise<void>,
  afterBatch?: (batch: T[]) => Promise<void>,
  batchSize = 25,
) {
  let processed = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    if (Date.now() > deadline) break;
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(handle));
    if (afterBatch) await afterBatch(batch);
    processed += batch.length;
  }
  return processed;
}
