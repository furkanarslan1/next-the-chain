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
