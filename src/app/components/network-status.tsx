import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);

  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
}

function isOnline(): boolean {
  return navigator.onLine;
}

export function NetworkStatus() {
  const online = useSyncExternalStore(subscribe, isOnline, () => true);

  if (online) return null;

  return (
    <div className="network-status" role="status" aria-live="polite">
      <strong>You’re offline.</strong>
      <span>Changes and payments will not be retried automatically.</span>
    </div>
  );
}
