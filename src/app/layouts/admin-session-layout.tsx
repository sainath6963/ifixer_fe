import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { PageMeta } from '@/app/components/page-meta';
import { useAppDispatch } from '@/app/hooks';
import type { AppDispatch } from '@/app/store';
import { adminAuthApi } from '@/features/admin/admin-auth-api';
import { clearAdmin } from '@/features/session/session-slice';

let restoration: Promise<void> | undefined;

async function restoreAdminSession(dispatch: AppDispatch): Promise<void> {
  const request = dispatch(
    adminAuthApi.endpoints.getAdmin.initiate(undefined, { forceRefetch: true, subscribe: false }),
  );
  try {
    await request.unwrap();
  } catch {
    dispatch(clearAdmin());
  }
}

export function AdminSessionLayout() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    restoration ??= restoreAdminSession(dispatch);
    void restoration;
  }, [dispatch]);
  return (
    <>
      <PageMeta
        title="Admin operations"
        description="Restricted iFixer administration area."
        noIndex
      />
      <Outlet />
    </>
  );
}
