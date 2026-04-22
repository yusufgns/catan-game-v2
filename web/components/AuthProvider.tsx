"use client";

import { AuthCtx, useAuthProvider } from "@/lib/auth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthProvider();
  return <AuthCtx.Provider value={auth}>{children}</AuthCtx.Provider>;
}
