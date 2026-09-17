import { combineSlices, configureStore, type Reducer } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { baseApi } from './api/baseApi';
import sessionSlice from './session/sessionSlice';

const rootReducer = combineSlices(sessionSlice, baseApi).withLazyLoadedSlices<
  Record<string, unknown>
>();

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

setupListeners(store.dispatch);

/** Modules bring their own state; it is injected when the module mounts and
 * never bundled into the shell. */
export function injectModuleReducer(name: string, reducer: Reducer): void {
  rootReducer.inject({ reducerPath: name, reducer });
}

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
