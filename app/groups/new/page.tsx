import { Suspense } from "react";
import Link from "next/link";
import { GroupForm } from "@/components/group-form";
import { requireProfile } from "@/lib/auth";
import { getFriends } from "@/lib/friends";

export default function NewGroupPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <div className="space-y-1">
        <Link
          href="/groups"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Geri
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Yeni ortak zincir</h1>
      </div>
      <Suspense>
        <Form />
      </Suspense>
    </main>
  );
}

async function Form() {
  const { profile } = await requireProfile();
  return <GroupForm friends={await getFriends(profile.id)} />;
}
