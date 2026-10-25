"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { respondGroupInvite } from "@/app/groups/actions";

export function GroupInviteActions({ groupId }: { groupId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function respond(accept: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await respondGroupInvite(groupId, accept);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => respond(true)}>
          Katıl
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => respond(false)}
        >
          Reddet
        </Button>
      </div>
      {error && (
        <p role="alert" className="max-w-48 text-right text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
