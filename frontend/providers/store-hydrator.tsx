"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { AUTH_KEY, UI_KEY, loadJSON } from "@/store/persist";
import { hydrateAuth } from "@/store/slices/auth.slice";
import { hydrateUI } from "@/store/slices/ui.slice";
import type { AuthUser } from "@/types";

/** Reads persisted auth + UI prefs once on the client (avoids SSR mismatch). */
export function StoreHydrator() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const auth = loadJSON<{ user?: AuthUser; accessToken?: string }>(AUTH_KEY);
    dispatch(hydrateAuth(auth?.user && auth.accessToken ? { user: auth.user, accessToken: auth.accessToken } : null));
    dispatch(hydrateUI(loadJSON<{ sidebarCollapsed?: boolean; accent?: string }>(UI_KEY)));
  }, [dispatch]);

  return null;
}

/** Applies the chosen accent preset to <html data-accent>. */
export function AccentSync() {
  const accent = useAppSelector((s) => s.ui.accent);
  const hydrated = useAppSelector((s) => s.ui.hydrated);

  useEffect(() => {
    if (!hydrated) return; // keep what the pre-hydration script set, avoid a flash
    const el = document.documentElement;
    if (accent === "emerald") delete el.dataset.accent;
    else el.dataset.accent = accent;
  }, [accent, hydrated]);

  return null;
}
