import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { NotificationSettings } from "@/components/notification-settings";
import { signOut } from "@/app/actions";
import { requireProfile } from "@/lib/auth";

export default function SettingsPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-8 pb-28">
        <h1 className="text-xl font-semibold">Ayarlar</h1>
        <Suspense fallback={<p className="text-muted-foreground">Yükleniyor…</p>}>
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
        enabled={profile.reminders_enabled}
        hour={profile.reminder_hour}
      />

      <form action={signOut}>
        <Button type="submit" variant="outline">
          Çıkış yap
        </Button>
      </form>
    </>
  );
}
