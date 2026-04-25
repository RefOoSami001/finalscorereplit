import React, { createContext, useContext, useState } from "react";
import type { GradesResponse } from "@workspace/api-client-react";

interface GradesContextType {
  grades: GradesResponse | null;
  setGrades: (grades: GradesResponse | null) => void;
}

const GradesContext = createContext<GradesContextType | undefined>(undefined);

export function GradesProvider({ children }: { children: React.ReactNode }) {
  const [grades, setGrades] = useState<GradesResponse | null>(null);
  return (
    <GradesContext.Provider value={{ grades, setGrades }}>
      {children}
    </GradesContext.Provider>
  );
}

export function useGrades() {
  const context = useContext(GradesContext);
  if (context === undefined) {
    throw new Error("useGrades must be used within a GradesProvider");
  }
  return context;
}
