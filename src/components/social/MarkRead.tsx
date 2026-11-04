"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
export function MarkRead() {
  const router = useRouter();
  return <button className="text-sm font-bold text-walkie-blue" onClick={async () => { await api("/api/notifications/read", { body: {} }); router.refresh(); }}>Mark all read</button>;
}
