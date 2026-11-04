"use client";
import { useEffect, useState } from "react";
export type Providers = { google: boolean; apple: boolean };
let cached: Promise<Providers> | null = null;
/** Social sign-in providers that are actually configured (buttons for the others stay hidden). */
export function useProviders(): Providers | null {
  const [p, setP] = useState<Providers | null>(null);
  useEffect(() => {
    cached ??= fetch("/api/auth/providers").then((r) => r.json()).then((j) => j.data as Providers).catch(() => ({ google: false, apple: false }));
    cached.then(setP);
  }, []);
  return p;
}
