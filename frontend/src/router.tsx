import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 5, // 5 seconds stale time
        gcTime: 1000 * 60 * 60, // 1 hour memory persistence
        refetchOnWindowFocus: true, // Auto-refetch on tab focus
        refetchOnMount: true, // Refetch on mount if stale
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 1000 * 60 * 15,
  });

  return router;
};

export type AppRouter = ReturnType<typeof getRouter>;
