"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createGroup, type GroupFormState } from "@/app/groups/actions";
import { CHAIN_COLORS } from "@/lib/chains";

const initialState: GroupFormState = {};

const KINDS = [
  { value: "build", label: "Yapacağız", hint: "Her gün yapılan bir şey" },
  { value: "quit", label: "Bırakacağız", hint: "Her gün uzak durulan bir şey" },
] as const;

type Friend = { id: string; username: string | null };

export function GroupForm({ friends }: { friends: Friend[] }) {
  const [state, action, pending] = useActionState(createGroup, initialState);

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Zincirin adı
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={60}
          placeholder="Her gün 20 sayfa kitap"
          className="h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Türü</legend>
        <div className="grid grid-cols-2 gap-3">
          {KINDS.map((kind, i) => (
            <label
              key={kind.value}
              className="cursor-pointer rounded-lg border p-3 has-[:checked]:border-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="kind"
                value={kind.value}
                defaultChecked={i === 0}
                className="sr-only"
              />
              <span className="block font-medium">{kind.label}</span>
              <span className="block text-xs text-muted-foreground">
                {kind.hint}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Rengi</legend>
        <div className="flex flex-wrap gap-3">
          {CHAIN_COLORS.map((color, i) => (
            <label key={color.value} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={color.value}
                defaultChecked={i === 0}
                aria-label={color.name}
                className="peer sr-only"
              />
              <span
                className="block size-10 rounded-full ring-offset-2 ring-offset-background peer-checked:ring-2 peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                style={{
                  backgroundColor: color.value,
                  ["--tw-ring-color" as string]: color.value,
                }}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Arkadaşlarını davet et</legend>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Henüz arkadaşın yok. Grubu şimdi kurup arkadaş ekledikten sonra
            yeni bir grup açabilirsin.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {friends.map((friend) => (
              <li key={friend.id}>
                <label className="flex cursor-pointer items-center gap-3 p-3 has-[:focus-visible]:bg-muted">
                  <input
                    type="checkbox"
                    name="friends"
                    value={friend.id}
                    className="size-4"
                  />
                  <span className="truncate">@{friend.username}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Davet edilenler kabul edince kendi zincirleri otomatik açılır.
          Herkesin zinciri kendisine aittir; biri kırarsa sadece onunki sıfırlanır.
        </p>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-red-500">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full text-base"
        disabled={pending}
      >
        Grubu kur
      </Button>
    </form>
  );
}
