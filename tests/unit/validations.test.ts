import { describe, expect, it } from "vitest";
import { CHAIN_COLORS } from "@/lib/chains";
import { chainSchema } from "@/lib/validations/chain";
import { usernameSchema } from "@/lib/validations/username";

describe("kullanıcı adı", () => {
  it("geçerli adları küçük harfe çevirir ve kırpar", () => {
    expect(usernameSchema.parse("  Furkan_K  ")).toBe("furkan_k");
  });

  it.each(["ab", "a".repeat(21), "çalışkan", "boşluk var", "tire-yok", ""])(
    "geçersiz ad reddedilir: %j",
    (name) => {
      expect(usernameSchema.safeParse(name).success).toBe(false);
    },
  );

  it.each(["admin", "support", "thechain"])("ayrılmış ad reddedilir: %s", (name) => {
    expect(usernameSchema.safeParse(name).success).toBe(false);
  });
});

describe("zincir formu", () => {
  const base = { title: "Kitap oku", kind: "build", color: CHAIN_COLORS[0].value };

  it("geçerli girdiyi kabul eder ve başlığı kırpar", () => {
    expect(chainSchema.parse({ ...base, title: "  Kitap  " }).title).toBe("Kitap");
  });

  it("boş ve çok uzun başlığı reddeder", () => {
    expect(chainSchema.safeParse({ ...base, title: "   " }).success).toBe(false);
    expect(chainSchema.safeParse({ ...base, title: "x".repeat(61) }).success).toBe(false);
  });

  it("bilinmeyen tür ve renk reddedilir", () => {
    expect(chainSchema.safeParse({ ...base, kind: "baska" }).success).toBe(false);
    expect(chainSchema.safeParse({ ...base, color: "#000000" }).success).toBe(false);
  });
});
