"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Unregister any existing service worker to prevent stale cache crashes
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) {
          reg.unregister();
          console.log("Service Worker desregistrado");
        }
      });
    }
  }, []);

  return null;
}
