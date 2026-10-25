"use client";

import { useState, useTransition } from "react";
import { cancelGroupInvite } from "@/app/groups/actions";

export function CancelInviteButton({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function cancel() {
    setError(undefined);
    startTransition(async () => {
      const result = await cancelGroupInvite(groupId, userId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={cancel}
        disabled={pending}
        className="underline underline-offset-4 hover:text-foreground"
      >
        İptal et
      </button>
      {error && (
        <span role="alert" className="text-red-500">
          {error}
        </span>
      )}
    </>
  );
}
