export const ADMIN_THEME_STORAGE_KEY = 'resq-admin-theme'

export type AdminTheme = 'light' | 'dark'

export const ADMIN_THEME_CLASS = 'admin-theme'
export const ADMIN_DARK_CLASS = 'admin-dark'

export function isAdminTheme(value: unknown): value is AdminTheme {
  return value === 'light' || value === 'dark'
}

export function readStoredAdminTheme(): AdminTheme | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)
    return isAdminTheme(raw) ? raw : null
  } catch {
    return null
  }
}

export function applyAdminThemeClass(theme: AdminTheme | null) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme == null) {
    root.classList.remove(ADMIN_THEME_CLASS, ADMIN_DARK_CLASS)
    root.removeAttribute('data-admin-theme')
    root.style.colorScheme = ''
    return
  }
  root.classList.add(ADMIN_THEME_CLASS)
  root.setAttribute('data-admin-theme', theme)
  if (theme === 'dark') {
    root.classList.add(ADMIN_DARK_CLASS)
    root.style.colorScheme = 'dark'
  } else {
    root.classList.remove(ADMIN_DARK_CLASS)
    root.style.colorScheme = 'light'
  }
}

/** Inline bootstrap — runs before paint on /admin routes to avoid theme flash. */
export const ADMIN_THEME_BOOTSTRAP_SCRIPT = `(function(){try{if(!location.pathname.startsWith('/admin'))return;var t=localStorage.getItem('${ADMIN_THEME_STORAGE_KEY}');var root=document.documentElement;root.classList.add('${ADMIN_THEME_CLASS}');if(t==='dark'){root.classList.add('${ADMIN_DARK_CLASS}');root.setAttribute('data-admin-theme','dark');root.style.colorScheme='dark';}else{root.setAttribute('data-admin-theme','light');root.style.colorScheme='light';}}catch(e){}})();`
