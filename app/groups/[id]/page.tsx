import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BottomNav } from "@/components/bottom-nav";
import { GroupInvite } from "@/components/group-invite";
import { GroupManage } from "@/components/group-manage";
import { getFriends } from "@/lib/friends";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default function GroupPage(props: PageProps<"/groups/[id]">) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8 pb-28">
        <Link
          href="/groups"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Geri
        </Link>
        <Suspense fallback={<p className="text-muted-foreground">Yükleniyor…</p>}>
          <GroupContent params={props.params} />
        </Suspense>
      </main>
      <BottomNav active="groups" />
    </>
  );
}

const STATE_LABEL: Record<string, string> = {
  done: "Bugün tamam",
  pending: "Bugün bekliyor",
};

async function GroupContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { profile } = await requireProfile();
  const supabase = await createClient();

  const [standings, groups] = await Promise.all([
    supabase.rpc("group_standings", { p_group_id: id }),
    supabase.rpc("my_groups"),
  ]);
  const group = (groups.data ?? []).find((g) => g.group_id === id);
  if (standings.error || !group) notFound();

  const rows = standings.data ?? [];
  const pending = group.is_owner
    ? ((await supabase.rpc("group_pending_invites", { p_group_id: id })).data ?? [])
    : [];
  const taken = new Set([
    ...rows.map((r) => r.member_id),
    ...pending.map((p) => p.member_id),
  ]);
  const invitable = group.is_owner
    ? (await getFriends(profile.id)).filter((f) => !taken.has(f.id))
    : [];
  const active = rows.filter((r) => r.state !== "broken");
  const failed = rows.filter((r) => r.state === "broken");

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold" style={{ color: group.color }}>
          {group.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {group.member_count} üye · Her üyenin zinciri kendisine ait
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium">Sıralama</h2>
        <ol className="divide-y rounded-xl border">
          {active.map((row, i) => (
            <li
              key={row.member_id}
              className={`flex items-center gap-3 p-3 ${
                row.member_id === profile.id ? "bg-muted/60" : ""
              }`}
            >
              <span className="w-6 text-center text-sm tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  @{row.member_username}
                  {row.member_id === profile.id && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      sen
                    </span>
                  )}
                </p>
                <p
                  className={`text-xs ${
                    row.state === "done"
                      ? "text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {STATE_LABEL[row.state]}
                </p>
              </div>
              <span className="text-sm tabular-nums">
                {row.chain_length} halka
              </span>
            </li>
          ))}
        </ol>
      </section>

      {failed.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Başaramayanlar</h2>
          <ul className="divide-y rounded-xl border border-red-500/30">
            {failed.map((row) => (
              <li
                key={row.member_id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <span className="truncate font-medium">
                  @{row.member_username}
                  {row.member_id === profile.id && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      sen
                    </span>
                  )}
                </span>
                <span className="text-xs text-red-400">
                  Zinciri kırıldı · En uzun {row.best_chain_length}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Bekleyen davetler</h2>
          <ul className="divide-y rounded-xl border">
            {pending.map((invite) => (
              <li
                key={invite.member_id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <span className="truncate font-medium">
                  @{invite.member_username}
                </span>
                <span className="text-xs text-muted-foreground">
                  Yanıt bekliyor
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {group.is_owner && <GroupInvite groupId={id} friends={invitable} />}

      <GroupManage groupId={id} isOwner={group.is_owner} />
    </>
  );
}
