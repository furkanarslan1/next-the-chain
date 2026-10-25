import { Suspense } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { LoginError } from "@/components/login-error";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">The Chain</h1>
        <p className="text-sm text-muted-foreground">
          Zinciri kırma. Her gün bir halka ekle.
        </p>
      </div>
      <div className="space-y-4">
        <GoogleSignInButton />
        <Suspense>
          <LoginError />
        </Suspense>
      </div>
    </main>
  );
}
