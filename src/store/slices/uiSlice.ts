import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface UiState {
  isTopicDialogOpen: boolean;
  isOnboardingModalOpen: boolean;
  isLoading: boolean;
  greeting: string;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'בוקר טוב';
  else if (hour >= 12 && hour < 18) return 'צהריים טובים';
  else return 'ערב טוב';
};

const initialState: UiState = {
  isTopicDialogOpen: false,
  isOnboardingModalOpen: false,
  isLoading: false,
  greeting: getGreeting(),
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTopicDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.isTopicDialogOpen = action.payload;
    },
    setOnboardingModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isOnboardingModalOpen = action.payload;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateGreeting: (state) => {
      state.greeting = getGreeting();
    },
  },
});

export const {
  setTopicDialogOpen,
  setOnboardingModalOpen,
  setIsLoading,
  updateGreeting,
} = uiSlice.actions;

export const selectTopicDialogOpen = (state: RootState) =>
  state.ui.isTopicDialogOpen;
export const selectOnboardingModalOpen = (state: RootState) =>
  state.ui.isOnboardingModalOpen;
export const selectIsLoading = (state: RootState) => state.ui.isLoading;
export const selectGreeting = (state: RootState) => state.ui.greeting;

export default uiSlice.reducer;
