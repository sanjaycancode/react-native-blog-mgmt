import { ReactNode, useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { getAsyncStorageItem } from "@/utils";

import { queryClient, REACT_QUERY_CACHE_KEY } from "@/lib/react-query/queryClient";

interface ReactQueryProviderProps {
  children: ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [persistOptions, setPersistOptions] = useState<{
    persister: ReturnType<typeof createAsyncStoragePersister>;
    maxAge: number;
  }>();

  useEffect(() => {
    let isMounted = true;

    async function initializePersistence() {
      try {
        await getAsyncStorageItem<unknown>(REACT_QUERY_CACHE_KEY);

        if (!isMounted) return;

        setPersistOptions({
          persister: createAsyncStoragePersister({
            storage: AsyncStorage,
            key: REACT_QUERY_CACHE_KEY,
          }),
          maxAge: 24 * 60 * 60 * 1000,
        });
      } catch {
        // Continue without persisted cache when device storage is unavailable.
      }
    }

    initializePersistence();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!persistOptions) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
