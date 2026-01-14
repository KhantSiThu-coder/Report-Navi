
import { createContext, useContext } from 'react';
import { Language } from '../types';
import { TranslationKeys } from '../services/translations';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys) => string;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export const useTranslation = () => useContext(LanguageContext);
