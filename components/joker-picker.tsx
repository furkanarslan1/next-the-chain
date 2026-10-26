import { JOKER_OPTIONS } from "@/lib/chains";

// Zincir oluştururken haftalık joker hakkı seçimi (form alanı: jokers).
export function JokerPicker({ hint }: { hint?: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Haftalık joker hakkı</legend>
      <div className="grid grid-cols-3 gap-3">
        {JOKER_OPTIONS.map((count) => (
          <label
            key={count}
            className="cursor-pointer rounded-lg border p-3 text-center has-[:checked]:border-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="radio"
              name="jokers"
              value={count}
              defaultChecked={count === 2}
              className="sr-only"
            />
            <span className="block text-lg font-semibold tabular-nums">{count}</span>
            <span className="block text-xs text-muted-foreground">
              {count === 0 ? "Joker yok" : "joker"}
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {hint ??
          "Joker, kaçırdığın günde zincirini korur. 0 seçersen kaçırdığın gün zincir kırılır. Sonradan değiştirebilirsin: azaltmak hemen, artırmak sonraki Pazartesi'den geçerli olur."}
      </p>
    </fieldset>
  );
}
