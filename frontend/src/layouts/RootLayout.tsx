import React, { useEffect } from "react";
import { Outlet, Link, useNavigate, useRouteError } from "react-router-dom";

export function NotFoundPage({ isError = false }: { isError?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">{isError ? "500" : "404"}</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {isError ? "Something went wrong" : "Page not found"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isError
            ? "An unexpected error occurred while rendering this page."
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError() as Error;
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      console.error("Router error boundary caught:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message || "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => navigate(0)}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RootLayout() {
  return <Outlet />;
}

export default RootLayout;
