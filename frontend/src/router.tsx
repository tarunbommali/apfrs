import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 15, // 15 minutes fresh cache (zero redundant fetches on page switch)
        gcTime: 1000 * 60 * 60, // 1 hour memory persistence
        refetchOnWindowFocus: false, // Prevent background network requests on tab focus
        refetchOnMount: false, // Reuse cached data when switching routes
        refetchOnReconnect: false,
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
