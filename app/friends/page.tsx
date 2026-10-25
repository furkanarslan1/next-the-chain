import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { FriendActions } from "@/components/friend-actions";
import { FriendSearch } from "@/components/friend-search";
import { Leaderboard } from "@/components/leaderboard";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { requireProfile } from "@/lib/auth";
import { todayIn, weekStartOf } from "@/lib/chains";
import { createClient } from "@/lib/supabase/server";

export default function FriendsPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-8 pb-28">
        <h1 className="text-xl font-semibold">Arkadaşlar</h1>
        <Suspense fallback={<p className="text-muted-foreground">Yükleniyor…</p>}>
          <FriendsContent />
        </Suspense>
      </main>
      <BottomNav active="friends" />
    </>
  );
}

type Person = { username: string | null; display_name: string | null } | null;

// PostgREST gömülü ilişkiyi tek nesne döndürür; tipler dizi de olabilir diyor.
function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function FriendsContent() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const today = todayIn(profile.timezone);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [friendships, week, month] = await Promise.all([
    supabase
      .from("friendships")
      .select(
        `id, status, requester_id,
         requester:profiles!friendships_requester_id_fkey(username, display_name),
         addressee:profiles!friendships_addressee_id_fkey(username, display_name)`,
      )
      .order("created_at", { ascending: false }),
    supabase.rpc("friends_leaderboard", { p_from: weekStartOf(today) }),
    supabase.rpc("friends_leaderboard", { p_from: monthStart }),
  ]);

  const incoming: { id: number; person: Person }[] = [];
  const outgoing: { id: number; person: Person }[] = [];
  const friends: { id: number; person: Person }[] = [];

  for (const f of friendships.data ?? []) {
    const mine = f.requester_id === profile.id;
    const person = one(mine ? f.addressee : f.requester);
    const entry = { id: f.id, person };
    if (f.status === "accepted") friends.push(entry);
    else if (mine) outgoing.push(entry);
    else incoming.push(entry);
  }

  return (
    <>
      <FriendSearch />

      {incoming.length > 0 && (
        <PeopleSection title="Gelen istekler" kind="incoming" items={incoming} />
      )}

      <Leaderboard
        week={week.data ?? []}
        month={month.data ?? []}
        meId={profile.id}
      />

      <PeopleSection
        title={`Arkadaşlar (${friends.length})`}
        kind="friend"
        items={friends}
        empty="Henüz arkadaşın yok. Yukarıdan kullanıcı adıyla arayıp ekle."
      />

      {outgoing.length > 0 && (
        <PeopleSection title="Gönderilen istekler" kind="outgoing" items={outgoing} />
      )}

      <PrivacyToggle discoverable={profile.discoverable} />
    </>
  );
}

function PeopleSection({
  title,
  kind,
  items,
  empty,
}: {
  title: string;
  kind: "incoming" | "outgoing" | "friend";
  items: { id: number; person: Person }[];
  empty?: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-medium">{title}</h2>
      {items.length === 0 ? (
        empty && <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map(({ id, person }) => (
            <li key={id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">@{person?.username}</p>
                {person?.display_name && (
                  <p className="truncate text-xs text-muted-foreground">
                    {person.display_name}
                  </p>
                )}
              </div>
              <FriendActions friendshipId={id} kind={kind} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
