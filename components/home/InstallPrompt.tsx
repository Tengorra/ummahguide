"use client";

import { useEffect, useState } from "react";
import { IconClose, IconShare } from "@/components/Icons";
import { readJSON, writeJSON } from "@/lib/storage";

const KEY = "ug.install.dismissed";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** "Install" banner: native prompt where the browser offers one (Android/Chrome), Share → Add to Home Screen hint on iOS Safari. */
export default function InstallPrompt() {
  const [bip, setBip] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const dismissedAt = readJSON<number>(KEY, 0);
    if (standalone || Date.now() - dismissedAt < 14 * 86400000) return;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (isIOS) {
      setIos(true);
      setShow(true);
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BIP);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!show) return null;

  function dismiss() {
    writeJSON(KEY, Date.now());
    setShow(false);
  }

  async function install() {
    if (!bip) return;
    await bip.prompt();
    const { outcome } = await bip.userChoice;
    if (outcome === "accepted") setShow(false);
    else dismiss();
  }

  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-em-900 text-ivory">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20h16" />
          <path d="M6 20v-7M18 20v-7" />
          <path d="M6 13c0-4 6-6 6-6s6 2 6 6" />
          <path d="M12 4v3" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[14px] font-bold">Add UmmahGuide to your home screen</p>
        <p className="m-0 text-[12px] text-muted">
          {ios ? (
            <>
              Tap <IconShare size={13} className="inline -mt-0.5" /> Share, then <b>Add to Home Screen</b>
            </>
          ) : (
            "Opens full-screen like an app, with alerts"
          )}
        </p>
      </div>
      {bip && (
        <button type="button" onClick={install} className="chip-active h-9 shrink-0">
          Install
        </button>
      )}
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted">
        <IconClose size={16} />
      </button>
    </div>
  );
}
