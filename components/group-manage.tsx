"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteGroup, leaveGroup } from "@/app/groups/actions";

export function GroupManage({
  groupId,
  isOwner,
}: {
  groupId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function run() {
    const message = isOwner
      ? "Grup silinecek. Üyelerin zincirleri normal zincir olarak kalır. Emin misin?"
      : "Gruptan ayrılacaksın. Zincirin normal bir zincir olarak kalır. Emin misin?";
    if (!window.confirm(message)) return;

    setError(undefined);
    startTransition(async () => {
      const result = await (isOwner ? deleteGroup : leaveGroup)(groupId);
      if (!result.ok) return setError(result.error);
      router.push("/groups");
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" disabled={pending} onClick={run}>
        {isOwner ? "Grubu sil" : "Gruptan ayrıl"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
