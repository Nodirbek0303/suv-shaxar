import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { uz, type Dict } from './uz';
import { ru } from './ru';

type Lang = 'uz' | 'ru';
const dicts: Record<Lang, Dict> = { uz, ru };

const I18nContext = createContext<{
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem('op_lang') as Lang) || 'uz',
  );

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem('op_lang', l);
    setLangState(l);
  }, []);

  const value = useMemo(
    () => ({ lang, t: dicts[lang], setLang }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside provider');
  return ctx;
}
