import { z } from "zod";
import { CHAIN_COLORS } from "@/lib/chains";

export const chainSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Zincire bir isim ver.")
    .max(60, "En fazla 60 karakter olabilir."),
  kind: z.enum(["build", "quit"]),
  color: z.enum(CHAIN_COLORS.map((c) => c.value) as [string, ...string[]]),
});

// Joker hakkı (haftada 0-2) ve haftalık hedef (haftada 1-6 gün). Veritabanı da aynı sınırları zorlar.
const jokers = z.coerce.number().int().min(0).max(2);

export const personalChainSchema = chainSchema
  .extend({
    frequency: z.enum(["daily", "weekly"]).default("daily"),
    goal: z.coerce.number().int().min(1).max(6).optional(),
    jokers: jokers.default(2),
  })
  .superRefine((value, ctx) => {
    if (value.frequency === "weekly" && value.kind === "quit") {
      ctx.addIssue({ code: "custom", path: ["frequency"], message: "Haftalık hedef sadece yapacağın zincirlerde olur." });
    }
    if (value.frequency === "weekly" && value.goal === undefined) {
      ctx.addIssue({ code: "custom", path: ["goal"], message: "Haftada kaç gün olacağını seç." });
    }
  });

export const groupChainSchema = chainSchema.extend({ jokers: jokers.default(2) });
