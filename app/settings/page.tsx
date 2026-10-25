import { Suspense } from "react";
import { ListSkeleton } from "@/components/skeletons";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DeleteAccount } from "@/components/delete-account";
import { NotificationSettings } from "@/components/notification-settings";
import { signOut } from "@/app/actions";
import { requireProfile } from "@/lib/auth";

export default function SettingsPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-8 pb-28">
        <h1 className="text-xl font-semibold">Ayarlar</h1>
        <Suspense fallback={<ListSkeleton />}>
          <SettingsContent />
        </Suspense>
      </main>
      <BottomNav active="settings" />
    </>
  );
}

async function SettingsContent() {
  const { profile } = await requireProfile();

  return (
    <>
      <section className="space-y-1">
        <p className="font-medium">@{profile.username}</p>
        <p className="text-sm text-muted-foreground">
          Saat dilimi: {profile.timezone}
        </p>
      </section>

      <NotificationSettings
        hour={profile.reminder_hour}
        prefs={{
          reminders_enabled: profile.reminders_enabled,
          risk_reminders_enabled: profile.risk_reminders_enabled,
          notify_social: profile.notify_social,
          notify_league: profile.notify_league,
        }}
      />

      <section className="space-y-3">
        <h2 className="font-medium">Zincirler</h2>
        <Link
          href="/archive"
          className="flex items-center justify-between rounded-xl border p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Arşivlenen zincirler
          <span aria-hidden className="text-muted-foreground">
            ›
          </span>
        </Link>
      </section>

      <form action={signOut}>
        <Button type="submit" variant="outline">
          Çıkış yap
        </Button>
      </form>

      <DeleteAccount username={profile.username ?? ""} />
    </>
  );
}
