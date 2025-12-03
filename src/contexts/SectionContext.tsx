import React, { createContext, useContext, useState } from 'react';

export type Section = 'landing' | 'rice-info' | 'user-guide' | 'research' | 'contact';

interface SectionContextType {
  currentSection: Section;
  setCurrentSection: (section: Section) => void;
}

const SectionContext = createContext<SectionContextType | undefined>(undefined);

export const SectionProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentSection, setCurrentSection] = useState<Section>('landing');
  return (
    <SectionContext.Provider value={{ currentSection, setCurrentSection }}>
      {children}
    </SectionContext.Provider>
  );
};

export const useSection = () => {
  const ctx = useContext(SectionContext);
  if (!ctx) throw new Error('useSection must be used within SectionProvider');
  return ctx;
};
