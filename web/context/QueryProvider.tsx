import React, { PropsWithChildren } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data doesn't change frequently
      gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep data in cache for persistence
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

// Persist query cache to localStorage for instant loading on new sessions
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'chronodex-cache',
});

export const QueryProvider: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ 
        persister, 
        maxAge: 1000 * 60 * 60 * 24, // 24 hours max cache age
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
};
