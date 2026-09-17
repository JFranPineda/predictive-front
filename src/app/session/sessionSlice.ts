import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface MenuEntry {
  label: string;
  route: string;
  icon: string;
  order: number;
  parent: string | null;
  permission: string | null;
}

export interface ModuleSummary {
  code: string;
  name: string;
  version: string;
  summary: string;
  category: string;
  depends: string[];
  is_core: boolean;
  state: 'installed' | 'uninstalled' | 'to_upgrade' | 'broken';
  installed_version: string | null;
  upgradable: boolean;
  missing_depends: string[];
  menu: MenuEntry[];
  permissions: [string, string][];
}

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  companyId: number | null;
  /** Server-owned data lives in RTK Query; only what the request layer and the
   * ownership checks need is duplicated here. */
  userId: number | null;
  permissions: string[];
}

const initialState: SessionState = {
  accessToken: localStorage.getItem('access'),
  refreshToken: localStorage.getItem('refresh'),
  companyId: Number(localStorage.getItem('company')) || null,
  userId: null,
  permissions: [],
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    tokensReceived(state, action: PayloadAction<{ access: string; refresh: string }>) {
      state.accessToken = action.payload.access;
      state.refreshToken = action.payload.refresh;
      localStorage.setItem('access', action.payload.access);
      localStorage.setItem('refresh', action.payload.refresh);
    },
    companySwitched(state, action: PayloadAction<number>) {
      state.companyId = action.payload;
      localStorage.setItem('company', String(action.payload));
    },
    identityLoaded(state, action: PayloadAction<{ userId: number; permissions: string[] }>) {
      state.userId = action.payload.userId;
      state.permissions = action.payload.permissions;
    },
    loggedOut(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.userId = null;
      state.permissions = [];
      localStorage.clear();
    },
  },
});

export const { tokensReceived, companySwitched, identityLoaded, loggedOut } =
  sessionSlice.actions;
export default sessionSlice;
