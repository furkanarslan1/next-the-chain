import { Suspense } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { GroupInviteActions } from "@/components/group-invite-actions";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default function GroupsPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-8 pb-28">
        <h1 className="text-xl font-semibold">Ortak zincirler</h1>
        <Suspense fallback={<p className="text-muted-foreground">Yükleniyor…</p>}>
          <GroupsContent />
        </Suspense>
      </main>
      <BottomNav active="groups" />
    </>
  );
}

async function GroupsContent() {
  await requireProfile();
  const supabase = await createClient();

  const [groups, invites] = await Promise.all([
    supabase.rpc("my_groups"),
    supabase.rpc("group_invites"),
  ]);

  return (
    <>
      {(invites.data ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Davetler</h2>
          <ul className="divide-y rounded-xl border">
            {(invites.data ?? []).map((invite) => (
              <li
                key={invite.group_id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p
                    className="truncate font-medium"
                    style={{ color: invite.color }}
                  >
                    {invite.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{invite.owner_username} davet etti · {invite.member_count} üye
                  </p>
                </div>
                <GroupInviteActions groupId={invite.group_id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-medium">Gruplarım</h2>
        {(groups.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Henüz ortak zincirin yok. Arkadaşlarınla aynı hedef için bir grup kur.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {(groups.data ?? []).map((group) => (
              <li key={group.group_id}>
                <Link
                  href={`/groups/${group.group_id}`}
                  className="flex items-center justify-between gap-3 p-3 outline-none focus-visible:bg-muted"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="truncate font-medium">{group.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {group.member_count} üye
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button
        size="lg"
        className="h-12 text-base"
        render={<Link href="/groups/new" />}
        nativeButton={false}
      >
        Yeni grup kur
      </Button>
    </>
  );
}
