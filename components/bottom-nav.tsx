import Link from "next/link";
import { LuLink2, LuSettings, LuUserPlus, LuUsers } from "react-icons/lu";

const ITEMS = [
  { key: "home", href: "/", label: "Zincirler", Icon: LuLink2 },
  { key: "groups", href: "/groups", label: "Gruplar", Icon: LuUsers },
  { key: "friends", href: "/friends", label: "Arkadaşlar", Icon: LuUserPlus },
  { key: "settings", href: "/settings", label: "Ayarlar", Icon: LuSettings },
] as const;

export function BottomNav({ active }: { active: "home" | "groups" | "friends" | "settings" }) {
  return (
    <nav
      aria-label="Ana gezinme"
      data-tour="nav"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {ITEMS.map(({ key, href, label, Icon }) => (
          <li key={key} className="flex-1">
            <Link
              href={href}
              aria-current={active === key ? "page" : undefined}
              className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground outline-none aria-[current=page]:text-foreground focus-visible:bg-muted"
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
