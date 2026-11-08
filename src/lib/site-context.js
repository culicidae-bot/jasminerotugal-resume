import { createContext, useContext } from 'react';

export const SiteContext = createContext(null);

export function useSite() {
  const site = useContext(SiteContext);
  if (!site) throw new Error('Site context is not available.');
  return site;
}
