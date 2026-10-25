import { ImageResponse } from "next/og";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { BADGE_KEYS, badgeByKey } from "@/lib/badges";
import { todayIn, weekStartOf } from "@/lib/chains";
import { weekRangeLabel, weeklySummary } from "@/lib/profile-stats";
import { CARD_SIZE, badgeCard, chainCard, rankCard, weekCard } from "@/lib/share-cards";
import { createClient } from "@/lib/supabase/server";

// Giriş yapmış kullanıcının KENDİ zinciri/rozeti için paylaşım kartı (PNG) üretir.
// title/user parametreleri kartta görünecekleri belirler; varsayılan: ad evet, kullanıcı adı hayır.
const flag = z.enum(["0", "1"]);
const querySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chain"),
    id: z.string().uuid(),
    title: flag.default("1"),
    user: flag.default("0"),
  }),
  z.object({
    type: z.literal("badge"),
    key: z.enum(BADGE_KEYS as [string, ...string[]]),
    user: flag.default("0"),
  }),
  z.object({ type: z.literal("rank"), user: flag.default("0") }),
  z.object({ type: z.literal("week"), user: flag.default("0") }),
]);

const HEADERS = { "Cache-Control": "private, no-store" };

function status(code: number, error: string) {
  return Response.json({ error }, { status: code, headers: HEADERS });
}

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return status(400, "invalid_request");

  if (!(await getUser())) return status(401, "unauthorized");
  const supabase = await createClient();
  const options = { ...CARD_SIZE, headers: HEADERS };

  if (parsed.data.type === "chain") {
    const { data, error } = await supabase.rpc("share_chain_data", {
      p_chain_id: parsed.data.id,
    });
    if (error) {
      return error.message.includes("rate_limited")
        ? status(429, "rate_limited")
        : status(500, "failed");
    }
    const chain = data?.[0];
    if (!chain) return status(404, "not_found");

    return new ImageResponse(
      chainCard({
        color: chain.sh_color,
        length: chain.sh_length,
        best: chain.sh_best,
        total: chain.sh_total,
        kind: chain.sh_kind,
        title: parsed.data.title === "1" ? chain.sh_title : null,
        username: parsed.data.user === "1" ? chain.sh_username : null,
      }),
      options,
    );
  }

  // Rütbe ve haftalık özet kartları: sadece kendi profilin.
  if (parsed.data.type === "rank" || parsed.data.type === "week") {
    const { data: profile, error: profileError } = await supabase.rpc("share_profile_data");
    if (profileError) {
      return profileError.message.includes("rate_limited")
        ? status(429, "rate_limited")
        : status(500, "failed");
    }
    const me = profile?.[0];
    if (!me) return status(404, "not_found");
    const username = parsed.data.user === "1" ? me.sh_username : null;

    if (parsed.data.type === "rank") {
      return new ImageResponse(rankCard({ activeDays: me.sh_active_days, username }), options);
    }

    const { data: rows } = await supabase.rpc("my_heatmap", { p_days: 21 });
    const today = todayIn(me.sh_timezone);
    return new ImageResponse(
      weekCard({
        summary: weeklySummary(rows ?? [], today),
        range: weekRangeLabel(weekStartOf(today)),
        username,
      }),
      options,
    );
  }

  const badge = badgeByKey(parsed.data.key);
  if (!badge) return status(404, "not_found");
  const { data, error } = await supabase.rpc("share_badge_data", {
    p_badge: parsed.data.key,
  });
  if (error) {
    return error.message.includes("rate_limited")
      ? status(429, "rate_limited")
      : status(500, "failed");
  }
  const earned = data?.[0];
  if (!earned) return status(404, "not_found");

  return new ImageResponse(
    badgeCard({
      badge,
      earnedAt: earned.sh_earned_at,
      username: parsed.data.user === "1" ? earned.sh_username : null,
    }),
    options,
  );
}
