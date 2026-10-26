import { describe, expect, it } from "vitest";
import { CHAIN_COLORS } from "@/lib/chains";
import { chainSchema, groupChainSchema, personalChainSchema } from "@/lib/validations/chain";
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

describe("joker ve haftalık hedef", () => {
  const base = { title: "Kitap oku", kind: "build", color: CHAIN_COLORS[0].value };

  it("varsayılan: günlük zincir, 2 joker", () => {
    const parsed = personalChainSchema.parse(base);
    expect(parsed.frequency).toBe("daily");
    expect(parsed.jokers).toBe(2);
  });

  it.each([0, 1, 2, "0", "1"])("joker %j kabul edilir", (jokers) => {
    expect(personalChainSchema.safeParse({ ...base, jokers }).success).toBe(true);
    expect(groupChainSchema.safeParse({ ...base, jokers }).success).toBe(true);
  });

  it.each([-1, 3, 1.5, "x"])("joker %j reddedilir", (jokers) => {
    expect(personalChainSchema.safeParse({ ...base, jokers }).success).toBe(false);
    expect(groupChainSchema.safeParse({ ...base, jokers }).success).toBe(false);
  });

  it("haftalık zincir hedef ister (1-6)", () => {
    expect(personalChainSchema.safeParse({ ...base, frequency: "weekly" }).success).toBe(false);
    expect(personalChainSchema.safeParse({ ...base, frequency: "weekly", goal: "3" }).success).toBe(true);
    expect(personalChainSchema.safeParse({ ...base, frequency: "weekly", goal: 0 }).success).toBe(false);
    expect(personalChainSchema.safeParse({ ...base, frequency: "weekly", goal: 7 }).success).toBe(false);
  });

  it("bırakma zinciri haftalık olamaz", () => {
    const result = personalChainSchema.safeParse({ ...base, kind: "quit", frequency: "weekly", goal: 3 });
    expect(result.success).toBe(false);
  });
});
