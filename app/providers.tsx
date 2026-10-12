"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toast";
import { useUIStore } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  // The store uses skipHydration so server and first client render match;
  // restore the sessionStorage copy right after mount.
  useEffect(() => {
    void useUIStore.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
