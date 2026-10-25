"use client";

import { useSearchParams } from "next/navigation";

export function LoginError() {
  const error = useSearchParams().get("error");
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-red-500">
      Giriş yapılamadı, lütfen tekrar dene.
    </p>
  );
}
