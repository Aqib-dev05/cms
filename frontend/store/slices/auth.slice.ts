import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/types";

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  /** true once persisted auth has been read from localStorage on the client */
  hydrated: boolean;
}

const initialState: AuthState = { user: null, accessToken: null, hydrated: false };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuth(state, action: PayloadAction<{ user: AuthUser; accessToken: string } | null>) {
      if (action.payload) {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      }
      state.hydrated = true;
    },
    setCredentials(state, action: PayloadAction<{ user: AuthUser; accessToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
    },
    tokenRefreshed(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
    },
  },
});

export const { hydrateAuth, setCredentials, tokenRefreshed, setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;

type WithAuth = { auth: AuthState };
export const selectUser = (s: WithAuth) => s.auth.user;
export const selectAccessToken = (s: WithAuth) => s.auth.accessToken;
export const selectHydrated = (s: WithAuth) => s.auth.hydrated;
export const selectIsAuthenticated = (s: WithAuth) => !!s.auth.user && !!s.auth.accessToken;
