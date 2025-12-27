import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export type AgeGroup = 'young' | 'middle' | 'high';

interface AgeGroupState {
  ageGroup: AgeGroup;
}

const getInitialAgeGroup = (): AgeGroup => {
  const stored = localStorage.getItem('ageGroup') as AgeGroup | null;
  return stored || 'middle';
};

const initialState: AgeGroupState = {
  ageGroup: getInitialAgeGroup(),
};

const ageGroupSlice = createSlice({
  name: 'ageGroup',
  initialState,
  reducers: {
    setAgeGroup: (state, action: PayloadAction<AgeGroup>) => {
      state.ageGroup = action.payload;
      localStorage.setItem('ageGroup', action.payload);
    },
    setAgeGroupFromGrade: (state, action: PayloadAction<number>) => {
      const grade = action.payload;
      const newAgeGroup: AgeGroup =
        grade <= 3 ? 'young' : grade <= 6 ? 'middle' : 'high';
      state.ageGroup = newAgeGroup;
      localStorage.setItem('ageGroup', newAgeGroup);
    },
  },
});

export const { setAgeGroup, setAgeGroupFromGrade } = ageGroupSlice.actions;

export const selectAgeGroup = (state: RootState) => state.ageGroup.ageGroup;

export const selectGradeText = (state: RootState) => {
  const ageGroup = state.ageGroup.ageGroup;
  switch (ageGroup) {
    case 'young':
      return 'כיתות א-ג';
    case 'middle':
      return 'כיתות ד-ו';
    case 'high':
      return 'כיתות ז-יב';
    default:
      return '';
  }
};

export default ageGroupSlice.reducer;
