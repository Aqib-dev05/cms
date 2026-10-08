import { combineReducers, configureStore, createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import authReducer, { clearAuth, setCredentials, setUser, tokenRefreshed } from "./slices/auth.slice";
import uiReducer, { setAccent, toggleSidebarCollapsed } from "./slices/ui.slice";
import { AUTH_KEY, UI_KEY, removeKey, saveJSON } from "./persist";

const rootReducer = combineReducers({ auth: authReducer, ui: uiReducer });
export type RootState = ReturnType<typeof rootReducer>;

// Persist auth + UI prefs to localStorage whenever the relevant actions fire.
const persistence = createListenerMiddleware();

persistence.startListening({
  matcher: isAnyOf(setCredentials, tokenRefreshed, setUser, clearAuth),
  effect: (_action, api) => {
    const { user, accessToken } = (api.getState() as RootState).auth;
    if (user && accessToken) saveJSON(AUTH_KEY, { user, accessToken });
    else removeKey(AUTH_KEY);
  },
});

persistence.startListening({
  matcher: isAnyOf(toggleSidebarCollapsed, setAccent),
  effect: (_action, api) => {
    const { sidebarCollapsed, accent } = (api.getState() as RootState).ui;
    saveJSON(UI_KEY, { sidebarCollapsed, accent });
  },
});

/**
 * Singleton store. The server never dispatches into it (all state is filled
 * client-side after hydration), so sharing the module instance is safe here.
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault().prepend(persistence.middleware),
});

export type AppDispatch = typeof store.dispatch;
