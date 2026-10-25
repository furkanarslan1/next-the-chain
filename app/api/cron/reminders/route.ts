import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

// Birkaç dakikada bir çağrılır (bkz. docs/NOTIFICATIONS.md). Yerel saati hatırlatma
// saatine denk gelen ve bugünkü halkasını eklememiş kullanıcılara bildirim gönderir.
// İşi küçük parçalara böler: her çalıştırma süre bütçesi dolunca durur, işlenmeyen
// kullanıcılar bir sonraki çağrıda (aynı saat içinde) devam eder.
const BATCH_SIZE = 25;
const FETCH_LIMIT = 500;
const TIME_BUDGET_MS = 7_000; // Vercel Hobby'de fonksiyon süresi 10 sn.

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const deadline = Date.now() + TIME_BUDGET_MS;
  const admin = createAdminClient();

  const { data: users, error } = await admin.rpc("users_to_remind", {
    p_limit: FETCH_LIMIT,
  });
  if (error) {
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }
  if (!users || users.length === 0) {
    return NextResponse.json({ users: 0, processed: 0, sent: 0, removed: 0 });
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in(
      "user_id",
      users.map((u) => u.user_id),
    );

  const byUser = new Map<string, NonNullable<typeof subs>>();
  for (const sub of subs ?? []) {
    byUser.set(sub.user_id, [...(byUser.get(sub.user_id) ?? []), sub]);
  }

  let processed = 0;
  let sent = 0;
  const gone: string[] = [];

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    if (Date.now() > deadline) break;
    const batch = users.slice(i, i + BATCH_SIZE);

    // Gruptaki kullanıcılara paralel gönder.
    await Promise.all(
      batch.map(async (user) => {
        const title =
          user.pending_count > 1
            ? `${user.pending_count} zincirin bugün bekliyor`
            : "Zincirin bugün bekliyor";
        const body =
          user.longest_streak > 0
            ? `${user.longest_streak} halkalık zincirin seni bekliyor. Kırılmasın!`
            : "Bugünün halkasını eklemeyi unutma.";

        for (const sub of byUser.get(user.user_id) ?? []) {
          const result = await sendPush(sub, { title, body, url: "/", tag: "reminder" });
          if (result === "ok") sent++;
          if (result === "gone") gone.push(sub.endpoint);
        }
      }),
    );

    // Hatırlatıldı olarak işaretle (aynı yerel güne sahip olanlar tek sorguda).
    const byDay = new Map<string, string[]>();
    for (const user of batch) {
      byDay.set(user.local_day, [...(byDay.get(user.local_day) ?? []), user.user_id]);
    }
    await Promise.all(
      [...byDay].map(([day, ids]) =>
        admin.from("profiles").update({ last_reminded_on: day }).in("id", ids),
      ),
    );
    processed += batch.length;
  }

  if (gone.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", gone);
  }

  return NextResponse.json({
    users: users.length,
    processed,
    sent,
    removed: gone.length,
    // true ise kalanlar bir sonraki çağrıda işlenir.
    more: processed < users.length || users.length === FETCH_LIMIT,
  });
}
