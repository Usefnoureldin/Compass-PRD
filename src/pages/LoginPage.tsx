import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";

export const LoginPage: React.FC = () => {
  const { session, loading, authError, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md border rounded-2xl bg-card shadow-sm p-8 flex flex-col items-center gap-6">
        <img
          src="/brand/logos/logomark/hostbase-logomark-full-color.svg"
          alt="Hostbase"
          className="w-14 h-14"
        />
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Compass</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in with your Google account to continue.
          </p>
        </div>

        <Button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3"
        >
          <GoogleMark />
          Sign in with Google
        </Button>

        {authError && (
          <div className="w-full rounded-md border border-destructive/30 bg-destructive/5 text-destructive text-sm px-3 py-2">
            {authError}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Access is restricted to allowlisted accounts.
        </p>
      </div>
    </div>
  );
};

const GoogleMark: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.61Z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.92v2.33A9 9 0 0 0 9 18Z"
      fill="#34A853"
    />
    <path
      d="M3.97 10.71A5.42 5.42 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.92A9 9 0 0 0 0 9c0 1.45.35 2.83.92 4.04l3.05-2.33Z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 9 0 9 9 0 0 0 .92 4.96l3.05 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      fill="#EA4335"
    />
  </svg>
);
