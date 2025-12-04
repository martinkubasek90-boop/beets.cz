import { useEffect, useState } from 'react';
import type { Lang } from './i18n';

export function useLanguage(defaultLang: Lang = 'cs') {
  const [lang, setLang] = useState<Lang>(defaultLang);

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
      if (saved === 'cs' || saved === 'en') {
        setLang(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        localStorage.setItem('lang', lang);
        document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`;
      }
    } catch {
      /* ignore */
    }
  }, [lang]);

  return { lang, setLang };
}
