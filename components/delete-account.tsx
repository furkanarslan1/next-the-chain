"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/app/settings/actions";

export function DeleteAccount({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteAccount(value);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="font-medium">Hesabı sil</h2>
      {!open ? (
        <Button variant="ghost" className="text-red-400" onClick={() => setOpen(true)}>
          Hesabımı sil
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-red-500/40 p-4">
          <p className="text-sm text-muted-foreground">
            Hesabın, zincirlerin, arkadaşlıkların ve gruplarının hepsi kalıcı
            olarak silinir. Bu işlem geri alınamaz. Onaylamak için kullanıcı
            adını yaz: <b className="text-foreground">{username}</b>
          </p>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Kullanıcı adını yaz"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={pending || value.trim().toLowerCase() !== username}
              onClick={submit}
            >
              Kalıcı olarak sil
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
