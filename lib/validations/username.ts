import { z } from "zod";

const RESERVED = ["admin", "support", "chain", "thechain", "root", "api"];

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_]{3,20}$/,
    "3-20 karakter; sadece küçük harf, rakam ve alt çizgi kullanabilirsin.",
  )
  .refine((value) => !RESERVED.includes(value), "Bu kullanıcı adı alınamaz.");
