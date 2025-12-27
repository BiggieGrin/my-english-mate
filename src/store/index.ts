import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authApi } from './api/authApi';
import { profileApi } from './api/profileApi';
import { topicsApi } from './api/topicsApi';
import { conversationsApi } from './api/conversationsApi';
import { messagesApi } from './api/messagesApi';
import ageGroupReducer from './slices/ageGroupSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    // API slices
    [authApi.reducerPath]: authApi.reducer,
    [profileApi.reducerPath]: profileApi.reducer,
    [topicsApi.reducerPath]: topicsApi.reducer,
    [conversationsApi.reducerPath]: conversationsApi.reducer,
    [messagesApi.reducerPath]: messagesApi.reducer,

    // Standard slices
    ageGroup: ageGroupReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      profileApi.middleware,
      topicsApi.middleware,
      conversationsApi.middleware,
      messagesApi.middleware
    ),
  devTools: process.env.NODE_ENV !== 'production',
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
