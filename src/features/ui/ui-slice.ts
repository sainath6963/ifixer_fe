import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  mobileMenuOpen: boolean;
  cartDrawerOpen: boolean;
}

const initialState: UiState = {
  mobileMenuOpen: false,
  cartDrawerOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },
    setCartDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.cartDrawerOpen = action.payload;
    },
  },
});

export const { setCartDrawerOpen, setMobileMenuOpen } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
