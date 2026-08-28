"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type ConnectionState = "connected" | "offline" | "checking";

interface ConnectionContextValue {
  reportConnection(connected: boolean): void;
  state: ConnectionState;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>("checking");

  const reportConnection = useCallback((connected: boolean) => {
    setState(connected ? "connected" : "offline");
  }, []);

  return (
    <ConnectionContext.Provider value={{ reportConnection, state }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextValue {
  const value = useContext(ConnectionContext);
  if (value === null) throw new Error("useConnection requires a ConnectionProvider.");
  return value;
}

export function connectionLabel(state: ConnectionState): string {
  if (state === "connected") return "Collector connected";
  if (state === "offline") return "Collector unavailable";
  return "Checking connection";
}
