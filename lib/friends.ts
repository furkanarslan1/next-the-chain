import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Friend = { id: string; username: string | null };

type Person = { username: string | null } | null;

// PostgREST gömülü ilişkiyi tek nesne döndürür; tipler dizi de olabilir diyor.
function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

// Kabul edilmiş arkadaşlar.
export async function getFriends(myId: string): Promise<Friend[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("friendships")
    .select(
      `requester_id, addressee_id,
       requester:profiles!friendships_requester_id_fkey(username),
       addressee:profiles!friendships_addressee_id_fkey(username)`,
    )
    .eq("status", "accepted");

  return (data ?? []).map((f) => {
    const mine = f.requester_id === myId;
    const person = one(mine ? f.addressee : f.requester) as Person;
    return {
      id: mine ? f.addressee_id : f.requester_id,
      username: person?.username ?? null,
    };
  });
}
