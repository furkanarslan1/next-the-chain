"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { inviteToGroup } from "@/app/groups/actions";
import type { Friend } from "@/lib/friends";

export function GroupInvite({
  groupId,
  friends,
}: {
  groupId: string;
  friends: Friend[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  if (friends.length === 0) return null;

  function toggle(id: string) {
    setMessage(undefined);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function send() {
    startTransition(async () => {
      const result = await inviteToGroup(groupId, selected);
      if (!result.ok) return setMessage({ ok: false, text: result.error });
      setSelected([]);
      setMessage({
        ok: true,
        text: "Davet gönderildi. Kabul edince kendi zinciri açılır ve sıfırdan başlar.",
      });
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="font-medium">Arkadaş davet et</h2>
      <ul className="divide-y rounded-xl border">
        {friends.map((friend) => (
          <li key={friend.id}>
            <label className="flex cursor-pointer items-center gap-3 p-3 has-[:focus-visible]:bg-muted">
              <input
                type="checkbox"
                className="size-4"
                checked={selected.includes(friend.id)}
                onChange={() => toggle(friend.id)}
              />
              <span className="truncate">@{friend.username}</span>
            </label>
          </li>
        ))}
      </ul>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`text-sm ${message.ok ? "text-emerald-400" : "text-red-500"}`}
        >
          {message.text}
        </p>
      )}
      <Button disabled={pending || selected.length === 0} onClick={send}>
        Davet gönder
      </Button>
    </section>
  );
}
