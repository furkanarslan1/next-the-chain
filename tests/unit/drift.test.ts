import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BADGE_KEYS, BADGES } from "@/lib/badges";
import { PLAN_LIMITS } from "@/lib/chains";
import { chainSteps, introSteps } from "@/components/tour/steps";

// Kod ile SQL arasında sabitlerin birbirinden sapmasını yakalar.
const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function migration(partOfName: string) {
  const file = readdirSync(join(root, "supabase/migrations")).find((f) => f.includes(partOfName));
  if (!file) throw new Error(`migration bulunamadı: ${partOfName}`);
  return read(`supabase/migrations/${file}`);
}

function walk(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel];
  });
}

describe("rozetler: kod ve SQL aynı listeyi kullanır", () => {
  const sql = migration("badges_and_sharing");

  it("user_badges kısıtındaki liste kataloğla aynı", () => {
    const block = sql.match(/check \(badge in \(([\s\S]*?)\)\)/)?.[1] ?? "";
    const inSql = [...block.matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]).sort();
    expect(inSql).toEqual([...BADGE_KEYS].sort());
  });

  it("sync_badges her rozeti kontrol eder", () => {
    const fn = sql.slice(sql.indexOf("create function public.sync_badges"), sql.indexOf("create function public.my_badges"));
    for (const key of BADGE_KEYS) expect(fn, key).toContain(`'${key}'`);
  });

  it("katalogda tekrar eden anahtar yok", () => {
    expect(new Set(BADGE_KEYS).size).toBe(BADGES.length);
  });
});

describe("planlar: kod ve SQL aynı limitleri kullanır", () => {
  it("plan_chain_limit() PLAN_LIMITS ile aynı", () => {
    const sql = migration("plans_limits_and_storage");
    const body = sql.match(/create function public\.plan_chain_limit[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(body).toMatch(new RegExp(`when 'max' then ${PLAN_LIMITS.max}`));
    expect(body).toMatch(new RegExp(`when 'pro' then ${PLAN_LIMITS.pro}`));
    expect(body).toMatch(new RegExp(`else ${PLAN_LIMITS.free}`));
  });
});

describe("tanıtım turu: her hedef sayfada işaretli", () => {
  const sources = walk("components")
    .concat(walk("app"))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => read(f))
    .join("\n");

  it("turdaki her data-tour hedefi bir bileşende tanımlı", () => {
    const targets = [...introSteps(true), ...introSteps(false), ...chainSteps()]
      .flatMap((s) => s.targets ?? [])
      .map((sel) => sel.match(/data-tour="([^"]+)"/)?.[1])
      .filter((x): x is string => Boolean(x));
    expect(targets.length).toBeGreaterThan(5);
    for (const name of new Set(targets)) {
      expect(sources, `data-tour="${name}" bulunamadı`).toMatch(
        new RegExp(`data-tour=(?:"${name}"|\\{[^}]*"${name}"[^}]*\\})`),
      );
    }
  });
});
