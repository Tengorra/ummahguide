"use client";

import { useEffect, useState } from "react";
import { readJSON, removeKey, writeJSON } from "./storage";

/** The user's own masjids: one Home, one Work. Shown on the main screen with their next Jamat. */

export type Slot = "home" | "work";
export type MyMasjid = { id: string; name: string; lat: number; lng: number };

const key = (s: Slot) => `ug.my.${s}`;

export function getMyMasjid(s: Slot): MyMasjid | null {
  return readJSON<MyMasjid | null>(key(s), null);
}

export function setMyMasjid(s: Slot, m: MyMasjid | null) {
  if (m) writeJSON(key(s), m);
  else removeKey(key(s));
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ug:my"));
}

/** Which slot (if any) this masjid id occupies. */
export function slotOf(id: string): Slot | null {
  if (getMyMasjid("home")?.id === id) return "home";
  if (getMyMasjid("work")?.id === id) return "work";
  return null;
}

export function useMyMasjids() {
  const [home, setHome] = useState<MyMasjid | null>(null);
  const [work, setWork] = useState<MyMasjid | null>(null);
  useEffect(() => {
    const load = () => {
      setHome(getMyMasjid("home"));
      setWork(getMyMasjid("work"));
    };
    load();
    window.addEventListener("ug:my", load);
    return () => window.removeEventListener("ug:my", load);
  }, []);
  return {
    home,
    work,
    set: (s: Slot, m: MyMasjid) => {
      // A masjid can hold only one slot.
      const other: Slot = s === "home" ? "work" : "home";
      if (getMyMasjid(other)?.id === m.id) setMyMasjid(other, null);
      setMyMasjid(s, m);
    },
    clear: (s: Slot) => setMyMasjid(s, null),
  };
}
