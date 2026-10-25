import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UsernameForm } from "@/components/username-form";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Kullanıcı adını seç
        </h1>
        <p className="text-sm text-muted-foreground">
          Arkadaşların seni bununla bulacak. Eşsiz olmalı.
        </p>
      </div>
      <Suspense>
        <OnboardingGate />
      </Suspense>
    </main>
  );
}

async function OnboardingGate() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();
  if (data?.username) redirect("/");

  return <UsernameForm />;
}
