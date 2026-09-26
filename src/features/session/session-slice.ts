import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated';

export interface CustomerIdentity {
  id: string;
  name?: string;
  email?: string;
  mobile?: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  version: number;
  communicationPreferences: {
    marketingEmail: boolean;
    backInStockEmail: boolean;
    orderUpdatesSms: boolean;
    orderUpdatesWhatsapp: boolean;
  };
}

export interface AdminIdentity {
  id: string;
  name: string;
  email: string;
  roles: Array<'OWNER' | 'STAFF' | 'RECEPTION' | 'TECHNICIAN'>;
}

interface SessionState {
  customerStatus: SessionStatus;
  customer?: CustomerIdentity;
  adminStatus: SessionStatus;
  admin?: AdminIdentity;
}

const initialState: SessionState = {
  customerStatus: 'unknown',
  adminStatus: 'unknown',
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setCustomer: (state, action: PayloadAction<CustomerIdentity>) => {
      state.customer = action.payload;
      state.customerStatus = 'authenticated';
    },
    clearCustomer: (state) => {
      state.customer = undefined;
      state.customerStatus = 'anonymous';
    },
    setAdmin: (state, action: PayloadAction<AdminIdentity>) => {
      state.admin = action.payload;
      state.adminStatus = 'authenticated';
    },
    clearAdmin: (state) => {
      state.admin = undefined;
      state.adminStatus = 'anonymous';
    },
  },
});

export const { clearAdmin, clearCustomer, setAdmin, setCustomer } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
