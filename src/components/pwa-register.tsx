"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds only (dev would fight hot reload). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("[lifolio] service worker:", error);
    });
  }, []);
  return null;
}
