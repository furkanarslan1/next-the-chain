"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  saveUsername,
  type OnboardingState,
} from "@/app/onboarding/actions";

const initialState: OnboardingState = {};

export function UsernameForm() {
  const [state, action, pending] = useActionState(saveUsername, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">
          Kullanıcı adı
        </label>
        <input
          id="username"
          name="username"
          defaultValue={state.value}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {state.error && (
          <p role="alert" className="text-sm text-red-500">
            {state.error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        Devam et
      </Button>
    </form>
  );
}
