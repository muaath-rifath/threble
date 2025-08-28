import { createContext, useContext, useState, ReactNode } from 'react';

interface DropdownContextType {
  activeDropdown: string | null;
  setActiveDropdown: (dropdown: string | null) => void;
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export function DropdownProvider({ children }: { children: ReactNode }) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <DropdownContext.Provider value={{ activeDropdown, setActiveDropdown }}>
      {children}
    </DropdownContext.Provider>
  );
}

export function useDropdown() {
  const context = useContext(DropdownContext);
  if (context === undefined) {
    throw new Error('useDropdown must be used within a DropdownProvider');
  }
  return context;
}
