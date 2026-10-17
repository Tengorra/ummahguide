"use client";

import { useEffect } from "react";
import TabBar from "./TabBar";
import { useReminderScheduler } from "@/lib/reminders";

/** Client wrapper: service worker registration + Jamat reminder scheduler + tab bar. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  useReminderScheduler();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px]">
      {children}
      <TabBar />
    </div>
  );
}
