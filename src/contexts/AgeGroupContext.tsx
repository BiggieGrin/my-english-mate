import React, { createContext, useContext, useState, ReactNode } from 'react';

type AgeGroup = 'young' | 'middle' | 'high';

interface AgeGroupContextType {
  ageGroup: AgeGroup;
  setAgeGroup: (group: AgeGroup) => void;
  gradeText: string;
}

const AgeGroupContext = createContext<AgeGroupContextType | undefined>(undefined);

export const useAgeGroup = () => {
  const context = useContext(AgeGroupContext);
  if (!context) {
    throw new Error('useAgeGroup must be used within an AgeGroupProvider');
  }
  return context;
};

export const AgeGroupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('middle');
  
  const gradeText = 
    ageGroup === 'young' ? 'כיתות א׳-ג׳' :
    ageGroup === 'middle' ? 'כיתות ד׳-ו׳' :
    'כיתות ז׳-י״ב';

  return (
    <AgeGroupContext.Provider value={{ ageGroup, setAgeGroup, gradeText }}>
      <div className={`theme-${ageGroup}`}>
        {children}
      </div>
    </AgeGroupContext.Provider>
  );
};
