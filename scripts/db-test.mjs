// Veritabanı testlerini çalıştırır: supabase/tests/*.test.sql
//
//   pnpm test:db                 -> bağlı (linked) Supabase projesinde
//   pnpm test:db -- --local      -> yerel Supabase'de (`supabase start` sonrası; CI böyle çalışır)
//   pnpm test:db -- --only=chains
//
// Her test tek bir DO bloğudur: sahte kullanıcılar oluşturur, kuralları doğrular ve sonunda
// `TEST_PASSED` hatasıyla KENDİNİ GERİ ALIR (veritabanında iz kalmaz). Bir doğrulama tutmazsa
// `FAIL: ...` hatası verir. Bu betik, hata mesajına bakarak geçti/kaldı kararını verir.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/tests";
const args = process.argv.slice(2);
const target = args.includes("--local") ? "--local" : "--linked";
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);

function query(options) {
  const result = spawnSync("pnpm", ["exec", "supabase", "db", "query", target, ...options], {
    encoding: "utf8",
  });
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".test.sql") && (!only || f.includes(only)))
  .sort();

if (files.length === 0) {
  console.error("Çalıştırılacak test bulunamadı.");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const out = query(["--file", join(dir, file)]);
  if (out.includes("TEST_PASSED")) {
    console.log(`ok    ${file}`);
    continue;
  }
  failed++;
  const reason = out.match(/FAIL:[^"\\]*/)?.[0] ?? out.match(/ERROR:[^"\\]*/)?.[0] ?? out.slice(0, 300);
  console.log(`FAIL  ${file}\n      ${reason.trim()}`);
}

// Testler kendilerini geri almalı: sahte kullanıcı kalmadıysa temiz.
const leftovers = query([
  "select count(*) as leftover from auth.users where email like '%@test.invalid'",
]);
const count = Number(leftovers.match(/"leftover":\s*"?(\d+)/)?.[1] ?? NaN);
if (count !== 0) {
  failed++;
  console.log(`FAIL  temizlik: ${Number.isNaN(count) ? "kontrol edilemedi" : `${count} sahte kullanıcı kaldı`}`);
}

console.log(failed === 0 ? `\n${files.length} test dosyası geçti.` : `\n${failed} sorun var.`);
process.exit(failed === 0 ? 0 : 1);
