/**
 * Theme Module - Functional theme switching logic
 * Uses pure functions without classes or OOP patterns
 */

// Types
export type Theme = 'light' | 'dark';

// Pure function: Get theme from localStorage
export const getStoredTheme = (): Theme | null => {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return null;
};

// Pure function: Get system theme preference
export const getSystemTheme = (): Theme => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

// Pure function: Determine initial theme
export const getInitialTheme = (): Theme => {
  return getStoredTheme() || getSystemTheme();
};

// Pure function: Toggle theme
export const getToggledTheme = (currentTheme: Theme): Theme => {
  return currentTheme === 'light' ? 'dark' : 'light';
};

// Pure function: Get theme announcement for screen reader
export const getThemeAnnouncement = (theme: Theme): string => {
  return `Switched to ${theme} mode`;
};

// Side effect: Apply theme to document
export const applyTheme = (theme: Theme): void => {
  document.documentElement.setAttribute('data-theme', theme);
};

// Side effect: Save theme to localStorage
export const saveTheme = (theme: Theme): void => {
  localStorage.setItem('theme', theme);
};

// Side effect: Announce theme change to screen reader
const announceThemeChange = (theme: Theme): void => {
  const liveRegion = document.getElementById('kbd-live-region');
  if (liveRegion) {
    liveRegion.textContent = getThemeAnnouncement(theme);
  }
};

// Main toggle function with side effects
export const toggleTheme = (): void => {
  const currentTheme = (document.documentElement.getAttribute('data-theme') || 'light') as Theme;
  const newTheme = getToggledTheme(currentTheme);
  
  applyTheme(newTheme);
  saveTheme(newTheme);
  announceThemeChange(newTheme);
  
  console.log(`[Theme] Switched from ${currentTheme} to ${newTheme}`);
};

// Initialize theme system
export const initTheme = (): void => {
  const themeToggle = document.getElementById('theme-toggle');
  
  if (!themeToggle) {
    console.error('[Theme] Theme toggle button not found');
    return;
  }
  
  // Attach click handler
  themeToggle.addEventListener('click', toggleTheme);
  
  // Expose toggle function for keyboard shortcut
  (window as any).toggleTheme = toggleTheme;
  
  console.log('[Theme] Theme toggle initialized');
};
