"use client";

import { useState, useTransition } from "react";
import type { IconType } from "react-icons";
import {
  LuCheck,
  LuCircleCheck,
  LuEllipsis,
  LuFlag,
  LuTriangleAlert,
  LuUserX,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { reportUser } from "@/app/report/actions";

type Reason = "username" | "abuse" | "other";

const REASONS: { value: Reason; label: string; hint: string; Icon: IconType }[] = [
  {
    value: "username",
    label: "Uygunsuz kullanıcı adı",
    hint: "Küfür, taklit ya da rahatsız edici ad",
    Icon: LuUserX,
  },
  {
    value: "abuse",
    label: "Kötüye kullanım",
    hint: "Taciz, spam ya da hile",
    Icon: LuTriangleAlert,
  },
  {
    value: "other",
    label: "Diğer",
    hint: "Aşağıya kısaca anlat",
    Icon: LuEllipsis,
  },
];

const NOTE_MAX = 300;

export function ReportUser({ userId, username }: { userId: string; username: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("username");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function reset() {
    setReason("username");
    setNote("");
    setSent(false);
    setError(undefined);
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await reportUser({ userId, reason, note: note || undefined });
      if (result.ok) setSent(true);
      else setError(result.error);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        aria-label={`@${username} kullanıcısını bildir`}
        className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LuFlag className="size-4" aria-hidden />
      </DialogTrigger>

      <DialogContent className="gap-5 p-5">
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <LuCircleCheck className="size-8" aria-hidden />
            </span>
            <div className="space-y-1">
              <DialogTitle>Bildirimin alındı</DialogTitle>
              <DialogDescription>
                Teşekkürler. Bildirimini inceleyeceğiz, @{username} bildirdiğini
                görmeyecek.
              </DialogDescription>
            </div>
            <DialogClose
              render={<Button variant="outline" className="mt-2 w-full" />}
            >
              Kapat
            </DialogClose>
          </div>
        ) : (
          <>
            <DialogHeader className="flex-row items-center gap-3 pr-8">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                <LuFlag className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-0.5 text-left">
                <DialogTitle className="truncate">
                  @{username} kullanıcısını bildir
                </DialogTitle>
                <DialogDescription>
                  Kullanıcı bildirdiğini görmez.
                </DialogDescription>
              </div>
            </DialogHeader>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">
                Neden bildiriyorsun?
              </legend>
              {REASONS.map(({ value, label, hint, Icon }) => (
                <label
                  key={value}
                  className="group relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-foreground/70 has-[:checked]:bg-muted/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    className="peer sr-only"
                  />
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-has-[:checked]:bg-foreground group-has-[:checked]:text-background">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {hint}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="flex size-5 shrink-0 items-center justify-center rounded-full border text-transparent transition-colors group-has-[:checked]:border-foreground group-has-[:checked]:bg-foreground group-has-[:checked]:text-background"
                  >
                    <LuCheck className="size-3" />
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor="report-note" className="text-sm font-medium">
                Not{" "}
                <span className="font-normal text-muted-foreground">
                  (isteğe bağlı)
                </span>
              </label>
              <textarea
                id="report-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={NOTE_MAX}
                rows={3}
                placeholder="Ne oldu? Kısaca anlat."
                className="w-full resize-none rounded-xl border bg-background p-3 text-base outline-none transition-shadow placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p
                aria-hidden
                className="text-right text-xs tabular-nums text-muted-foreground"
              >
                {note.length}/{NOTE_MAX}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
              >
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <DialogClose
                render={<Button variant="outline" className="h-11" />}
              >
                Vazgeç
              </DialogClose>
              <Button
                type="button"
                className="h-11"
                disabled={pending}
                onClick={submit}
              >
                {pending ? "Gönderiliyor…" : "Bildir"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
