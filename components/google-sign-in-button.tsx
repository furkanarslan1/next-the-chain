"use client";

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setPending(false);
  }

  return (
    <Button
      size="lg"
      variant="outline"
      className="w-full gap-3"
      onClick={signIn}
      disabled={pending}
    >
      <FcGoogle className="size-5" />
      Google ile devam et
    </Button>
  );
}
