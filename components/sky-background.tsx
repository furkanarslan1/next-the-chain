// Tüm sayfaların arkasındaki gece gökyüzü (stiller app/globals.css içinde).
export function SkyBackground() {
  return (
    <div aria-hidden className="sky">
      <div className="sky-halo sky-halo-1" />
      <div className="sky-halo sky-halo-2" />
      <div className="sky-halo sky-halo-3" />
      <div className="sky-stars sky-stars-a" />
      <div className="sky-stars sky-stars-b" />
    </div>
  );
}
