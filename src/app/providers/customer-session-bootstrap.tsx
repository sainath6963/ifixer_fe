import { useEffect, type ReactNode } from 'react';

import { customerAuthApi } from '@/features/customer-auth/customer-auth-api';
import { clearCustomer } from '@/features/session/session-slice';

import type { AppDispatch } from '../store';
import { useAppDispatch } from '../hooks';

let restoration: Promise<void> | undefined;

async function restoreCustomerSession(dispatch: AppDispatch): Promise<void> {
  const meRequest = dispatch(
    customerAuthApi.endpoints.getCustomer.initiate(undefined, {
      forceRefetch: true,
      subscribe: false,
    }),
  );
  try {
    await meRequest.unwrap();
  } catch {
    dispatch(clearCustomer());
  }
}

export function CustomerSessionBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    restoration ??= restoreCustomerSession(dispatch);
    void restoration;
  }, [dispatch]);

  return children;
}
