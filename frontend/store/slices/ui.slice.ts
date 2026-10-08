import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const ACCENTS = ["emerald", "forest", "mint"] as const;
export type Accent = (typeof ACCENTS)[number];

export interface UIState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  accent: Accent;
  /** true once persisted UI prefs have been read on the client */
  hydrated: boolean;
}

const initialState: UIState = {
  sidebarCollapsed: false,
  mobileNavOpen: false,
  accent: "emerald",
  hydrated: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    hydrateUI(state, action: PayloadAction<{ sidebarCollapsed?: boolean; accent?: string } | null>) {
      const saved = action.payload;
      if (saved) {
        if (typeof saved.sidebarCollapsed === "boolean") state.sidebarCollapsed = saved.sidebarCollapsed;
        if (saved.accent && (ACCENTS as readonly string[]).includes(saved.accent)) {
          state.accent = saved.accent as Accent;
        }
      }
      state.hydrated = true;
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setMobileNav(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
    setAccent(state, action: PayloadAction<Accent>) {
      state.accent = action.payload;
    },
  },
});

export const { hydrateUI, toggleSidebarCollapsed, setMobileNav, setAccent } = uiSlice.actions;
export default uiSlice.reducer;
