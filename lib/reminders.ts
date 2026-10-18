"use client";

import { useEffect } from "react";
import { readJSON, todayKey, writeJSON } from "./storage";
import { loadAlerts } from "./alerts";
import { buildJamatDay, loadPublished } from "./jamat";
import { fetchDay, loadSettings } from "./aladhan";
import { loadLocation } from "./location";
import { SALAH, fmt12, timeToDate, type SalahName } from "./prayer";

/**
 * Jamat reminders. Stored locally; fired with the Notifications API by a scheduler that
 * runs while the app (or installed PWA) is open. Server push can be added later without
 * changing this shape.
 */

export type Reminder = {
  masjidId: string;
  masjidName: string;
  prayers: SalahName[];
  jumuah: boolean;
  leadMin: 10 | 15 | 30;
  alertOnChange: boolean;
  createdAt: string;
};

const KEY = "ug.reminders";
const FIRED = "ug.reminders.fired";

export function loadReminders(): Reminder[] {
  return readJSON<Reminder[]>(KEY, []);
}
export function getReminder(masjidId: string): Reminder | null {
  return loadReminders().find((r) => r.masjidId === masjidId) || null;
}
export function saveReminder(r: Reminder) {
  const rest = loadReminders().filter((x) => x.masjidId !== r.masjidId);
  writeJSON(KEY, [...rest, r]);
}
export function removeReminder(masjidId: string) {
  writeJSON(KEY, loadReminders().filter((x) => x.masjidId !== masjidId));
}

export async function ensureNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  return Notification.requestPermission();
}

function notify(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
  } catch {
    /* some browsers only allow via service worker; silently skip */
  }
}

/** Checks every minute whether any Jamat is `leadMin` away and fires once per prayer per day. */
export function useReminderScheduler() {
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const reminders = loadReminders();
      const alerts = loadAlerts();
      const anyAzan = SALAH.some((p) => alerts[p].azan || alerts[p].before > 0);
      if (!reminders.length && !anyAzan) return;
      const loc = loadLocation();
      const settings = loadSettings();
      let timings;
      let tz: string | undefined;
      try {
        const d = await fetchDay(loc.lat, loc.lng, new Date(), settings);
        timings = d.timings;
        tz = d.tz;
      } catch {
        return;
      }
      if (cancelled) return;
      const now = Date.now();
      const fired = readJSON<Record<string, true>>(FIRED, {});
      const today = todayKey();
      for (const p of SALAH) {
        const a = alerts[p];
        const at = timeToDate(timings[p], new Date(), tz).getTime();
        if (a.azan) {
          const k = `${today}.azan.${p}`;
          if (!fired[k] && at - now <= 0 && now - at < 90000) {
            fired[k] = true;
            notify(`${p} · ${fmt12(timings[p])}`, `It is time for ${p} prayer in ${loc.city}.`, k);
          }
        }
        if (a.before > 0) {
          const lead = a.before * 60000;
          const k = `${today}.pre.${p}`;
          if (!fired[k] && at - now <= lead && at - now > lead - 90000) {
            fired[k] = true;
            notify(`${p} in ${a.before} min`, `${fmt12(timings[p])} in ${loc.city}.`, k);
          }
        }
      }
      for (const r of reminders) {
        const day = buildJamatDay(timings, loadPublished(r.masjidId), tz);
        for (const row of day.rows) {
          if (!r.prayers.includes(row.prayer)) continue;
          const at = timeToDate(row.jamat, new Date(), tz).getTime();
          const lead = r.leadMin * 60000;
          const k = `${today}.${r.masjidId}.${row.prayer}`;
          if (!fired[k] && at - now <= lead && at - now > lead - 90000) {
            fired[k] = true;
            notify(`${row.prayer} Jamat in ${r.leadMin} min`, `${fmt12(row.jamat)} at ${r.masjidName}`, k);
          }
        }
      }
      // Prune old keys
      for (const k of Object.keys(fired)) if (!k.startsWith(today)) delete fired[k];
      writeJSON(FIRED, fired);
    };
    void tick();
    const t = setInterval(tick, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);
}
