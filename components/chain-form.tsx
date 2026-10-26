"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { createChain, type ChainFormState } from "@/app/chains/actions";
import { JokerPicker } from "@/components/joker-picker";
import { CHAIN_COLORS, WEEKLY_GOALS } from "@/lib/chains";

const initialState: ChainFormState = {};

const KINDS = [
  { value: "build", label: "Yapacağım", hint: "Her gün yaptığım bir şey" },
  { value: "quit", label: "Bırakacağım", hint: "Her gün uzak durduğum bir şey" },
] as const;

const FREQUENCIES = [
  { value: "daily", label: "Her gün", hint: "Günlük zincir, joker hakkıyla" },
  { value: "weekly", label: "Haftalık hedef", hint: "Haftada belirli sayıda gün" },
] as const;

export function ChainForm() {
  const [state, action, pending] = useActionState(createChain, initialState);
  const [kind, setKind] = useState<"build" | "quit">("build");
  const [chosen, setChosen] = useState<"daily" | "weekly">("daily");
  // Bırakma zinciri her gün "temiz kaldım" demektir; haftalık hedef sadece yapma zincirinde olur.
  const frequency = kind === "quit" ? "daily" : chosen;

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
          {KINDS.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-lg border p-3 has-[:checked]:border-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="kind"
                value={option.value}
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
                className="sr-only"
              />
              <span className="block font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">
                {option.hint}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Sıklığı</legend>
        <div className="grid grid-cols-2 gap-3">
          {FREQUENCIES.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-lg border p-3 has-[:checked]:border-foreground has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="frequency"
                value={option.value}
                checked={frequency === option.value}
                disabled={kind === "quit" && option.value === "weekly"}
                onChange={() => setChosen(option.value)}
                className="sr-only"
              />
              <span className="block font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.hint}</span>
            </label>
          ))}
        </div>
        {frequency === "weekly" && (
          <div className="space-y-2 pt-1">
            <p className="text-sm font-medium">Haftada kaç gün?</p>
            <div className="grid grid-cols-6 gap-2">
              {WEEKLY_GOALS.map((goal) => (
                <label
                  key={goal}
                  className="cursor-pointer rounded-lg border py-2 text-center has-[:checked]:border-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                >
                  <input
                    type="radio"
                    name="goal"
                    value={goal}
                    defaultChecked={goal === 3}
                    className="sr-only"
                  />
                  <span className="text-base font-semibold tabular-nums">{goal}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Hafta (Pazartesi-Pazar) bittiğinde bu kadar halka eklemediysen zincir kırılır.
              Hangi günler olacağı sana kalmış. Bu zincirde joker yoktur.
            </p>
          </div>
        )}
      </fieldset>

      {frequency === "daily" && <JokerPicker />}

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
