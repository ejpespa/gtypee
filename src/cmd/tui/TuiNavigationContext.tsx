import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type TuiNavigationContextValue = {
  accountEmail: string;
  breadcrumbs: string[];
  helpLines: string[];
  setBreadcrumbs: (crumbs: string[]) => void;
  setHelpLines: (lines: string[]) => void;
};

const TuiNavigationContext = createContext<TuiNavigationContextValue | null>(null);

export function TuiNavigationProvider({
  accountEmail,
  children,
}: {
  accountEmail: string;
  children: React.ReactNode;
}) {
  const [breadcrumbs, setBreadcrumbsState] = useState<string[]>([]);
  const [helpLines, setHelpLinesState] = useState<string[]>([]);

  const setBreadcrumbs = useCallback((crumbs: string[]) => {
    setBreadcrumbsState(crumbs);
  }, []);

  const setHelpLines = useCallback((lines: string[]) => {
    setHelpLinesState(lines);
  }, []);

  const value = useMemo(
    (): TuiNavigationContextValue => ({
      accountEmail,
      breadcrumbs,
      helpLines,
      setBreadcrumbs,
      setHelpLines,
    }),
    [accountEmail, breadcrumbs, helpLines, setBreadcrumbs, setHelpLines],
  );

  return (
    <TuiNavigationContext.Provider value={value}>
      {children}
    </TuiNavigationContext.Provider>
  );
}

export function useTuiNavigation(): TuiNavigationContextValue {
  const ctx = useContext(TuiNavigationContext);
  if (!ctx) {
    throw new Error('useTuiNavigation must be used within TuiNavigationProvider');
  }
  return ctx;
}