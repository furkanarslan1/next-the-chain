"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createChain, type ChainFormState } from "@/app/chains/actions";
import { CHAIN_COLORS } from "@/lib/chains";

const initialState: ChainFormState = {};

const KINDS = [
  { value: "build", label: "Yapacağım", hint: "Her gün yaptığım bir şey" },
  { value: "quit", label: "Bırakacağım", hint: "Her gün uzak durduğum bir şey" },
] as const;

export function ChainForm() {
  const [state, action, pending] = useActionState(createChain, initialState);

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
          placeholder="Her gün kitap oku"
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

      {state.error && (
        <p role="alert" className="text-sm text-red-500">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pending}>
        Zinciri başlat
      </Button>
    </form>
  );
}
