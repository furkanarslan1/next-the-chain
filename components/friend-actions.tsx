"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  acceptFriendRequest,
  removeFriendship,
  type FriendResult,
} from "@/app/friends/actions";

type Props = {
  friendshipId: number;
  kind: "incoming" | "outgoing" | "friend";
};

export function FriendActions({ friendshipId, kind }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function run(action: () => Promise<FriendResult>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  function removeFriend() {
    if (!window.confirm("Arkadaşlıktan çıkarmak istediğine emin misin?")) return;
    run(() => removeFriendship(friendshipId));
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {kind === "incoming" && (
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => acceptFriendRequest(friendshipId))}
            >
              Kabul et
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => removeFriendship(friendshipId))}
            >
              Reddet
            </Button>
          </>
        )}
        {kind === "outgoing" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => removeFriendship(friendshipId))}
          >
            İptal et
          </Button>
        )}
        {kind === "friend" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={removeFriend}
          >
            Kaldır
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
