// Haleleri kullanıcının zincir renklerine boyar. Sayfa kapanınca varsayılan renkler geri gelir.
const HEX = /^#[0-9a-fA-F]{6}$/;

export function SkyTint({ colors }: { colors: string[] }) {
  const valid = [...new Set(colors.filter((c) => HEX.test(c)))];
  if (valid.length === 0) return null;

  const pick = (i: number) => valid[i % valid.length];
  return (
    <style>{`:root{--halo-1:${pick(0)};--halo-2:${pick(1)};--halo-3:${pick(2)}}`}</style>
  );
}
