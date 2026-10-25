"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendFriendRequest } from "@/app/friends/actions";
import { createClient } from "@/lib/supabase/client";

type Result = {
  id: string;
  username: string | null;
  display_name: string | null;
  relation: string | null;
};

const RELATION_LABEL: Record<string, string> = {
  friends: "Arkadaşsınız",
  outgoing: "İstek gönderildi",
};

export function FriendSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await createClient().rpc("search_users", { p_query: q });
      if (!cancelled) setResults(data ?? []);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function add(id: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await sendFriendRequest(id);
      if (!result.ok) return setError(result.error);
      // Sonucu "gönderildi / arkadaşsınız" olarak güncelle.
      const q = query.trim().toLowerCase();
      const { data } = await createClient().rpc("search_users", { p_query: q });
      setResults(data ?? []);
    });
  }

  return (
    <div className="space-y-3">
      <label htmlFor="friend-search" className="text-sm font-medium">
        Kullanıcı adıyla ara
      </label>
      <input
        id="friend-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="kullanici_adi"
        className="h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {query.trim().length >= 2 && results !== null && (
        <ul className="divide-y rounded-xl border">
          {results.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">
              Bu adla başlayan kullanıcı bulunamadı.
            </li>
          )}
          {results.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">@{user.username}</p>
                {user.display_name && (
                  <p className="truncate text-xs text-muted-foreground">
                    {user.display_name}
                  </p>
                )}
              </div>
              {user.relation && RELATION_LABEL[user.relation] ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {RELATION_LABEL[user.relation]}
                </span>
              ) : (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => add(user.id)}
                >
                  {user.relation === "incoming" ? "Kabul et" : "Ekle"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
