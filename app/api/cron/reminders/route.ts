import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { copyFor, dailyCopy, riskCopy } from "@/lib/notification-copy";
import {
  loadSubscriptions,
  processInBatches,
  sendToDevices,
  type SendStats,
} from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

// 10 dakikada bir çağrılır (bkz. docs/NOTIFICATIONS.md). Üç iş yapar:
//  1) gelen kutusu: arkadaşlık/grup/lig olayları (hızlı olduğu için önce)
//  2) kırılma uyarısı: yerel 22:00, joker hakkı kalmamış zincirler
//  3) günlük hatırlatma: yerel saati hatırlatma saatine denk gelenler
// Her çalıştırma süre bütçesini aşmadan durur; işlenmeyenler bir sonraki çağrıda devam eder.
const FETCH_LIMIT = 500;
const OUTBOX_LIMIT = 100;
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
  const stats: SendStats = { sent: 0, gone: [] };
  const summary = { outbox: 0, risk: 0, reminders: 0, more: false };

  // 1) Gelen kutusu ----------------------------------------------------------
  const { data: claimed } = await admin.rpc("claim_notifications", {
    p_limit: OUTBOX_LIMIT,
  });
  if (claimed && claimed.length > 0) {
    const ids = [...new Set(claimed.map((n) => n.user_id))];
    const [subs, prefs] = await Promise.all([
      loadSubscriptions(admin, ids),
      admin.from("profiles").select("id, notify_social, notify_league").in("id", ids),
    ]);
    const prefById = new Map((prefs.data ?? []).map((p) => [p.id, p]));

    const processedIds = new Set<number>();
    summary.outbox = await processInBatches(
      claimed,
      deadline,
      async (n) => {
        processedIds.add(n.id);
        const pref = prefById.get(n.user_id);
        const social = n.kind !== "league_result";
        if (!pref || (social ? !pref.notify_social : !pref.notify_league)) return;
        const payload = copyFor(n.kind, (n.data ?? {}) as Record<string, unknown>);
        if (payload) await sendToDevices(subs.get(n.user_id) ?? [], payload, stats);
      },
    );

    // Süre dolduysa işlenmeyenleri bir sonraki çalıştırmaya bırak.
    const leftover = claimed.filter((n) => !processedIds.has(n.id)).map((n) => n.id);
    if (leftover.length > 0) {
      await admin.rpc("release_notifications", { p_ids: leftover });
      summary.more = true;
    }
  }

  // 2) Kırılma uyarısı -------------------------------------------------------
  if (Date.now() < deadline) {
    const { data: atRisk } = await admin.rpc("users_at_risk", { p_limit: FETCH_LIMIT });
    if (atRisk && atRisk.length > 0) {
      const subs = await loadSubscriptions(admin, atRisk.map((u) => u.user_id));
      summary.risk = await processInBatches(
        atRisk,
        deadline,
        async (u) => {
          await sendToDevices(
            subs.get(u.user_id) ?? [],
            riskCopy(u.at_risk_count, u.longest_streak),
            stats,
          );
        },
        async (batch) => {
          await markDays(admin, "last_risk_reminded_on", batch);
        },
      );
      if (summary.risk < atRisk.length || atRisk.length === FETCH_LIMIT) summary.more = true;
    }
  }

  // 3) Günlük hatırlatma ------------------------------------------------------
  if (Date.now() < deadline) {
    const { data: users } = await admin.rpc("users_to_remind", { p_limit: FETCH_LIMIT });
    if (users && users.length > 0) {
      const subs = await loadSubscriptions(admin, users.map((u) => u.user_id));
      summary.reminders = await processInBatches(
        users,
        deadline,
        async (u) => {
          await sendToDevices(
            subs.get(u.user_id) ?? [],
            dailyCopy(u.pending_count, u.longest_streak),
            stats,
          );
        },
        async (batch) => {
          await markDays(admin, "last_reminded_on", batch);
        },
      );
      if (summary.reminders < users.length || users.length === FETCH_LIMIT) summary.more = true;
    }
  } else {
    summary.more = true;
  }

  if (stats.gone.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", stats.gone);
  }

  return NextResponse.json({ ...summary, sent: stats.sent, removed: stats.gone.length });
}

// Aynı yerel güne sahip kullanıcıları tek sorguda "hatırlatıldı" olarak işaretler.
async function markDays(
  admin: ReturnType<typeof createAdminClient>,
  column: "last_reminded_on" | "last_risk_reminded_on",
  batch: { user_id: string; local_day: string }[],
) {
  const byDay = new Map<string, string[]>();
  for (const u of batch) {
    byDay.set(u.local_day, [...(byDay.get(u.local_day) ?? []), u.user_id]);
  }
  await Promise.all(
    [...byDay].map(([day, ids]) =>
      admin
        .from("profiles")
        .update(
          column === "last_reminded_on"
            ? { last_reminded_on: day }
            : { last_risk_reminded_on: day },
        )
        .in("id", ids),
    ),
  );
}
