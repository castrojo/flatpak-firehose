/**
 * Search Module - Functional search logic for app names
 * Uses pure functions without classes or OOP patterns
 */

// Types
export interface SearchResult {
  appName: string;
  matchIndex: number;
}

// Pure function: Escape HTML for safe display
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Pure function: Fuzzy match (case-insensitive substring match)
export const fuzzyMatch = (text: string, query: string): boolean => {
  return text.toLowerCase().includes(query.toLowerCase());
};

// Pure function: Filter apps by search query
export const filterApps = (apps: string[], query: string): SearchResult[] => {
  if (!query || query.length === 0) return [];
  
  const queryLower = query.toLowerCase();
  
  return apps
    .filter(appName => fuzzyMatch(appName, query))
    .map(appName => ({
      appName,
      matchIndex: appName.toLowerCase().indexOf(queryLower),
    }))
    .sort((a, b) => a.appName.localeCompare(b.appName));
};

// Pure function: Generate search result HTML
export const generateResultHtml = (result: SearchResult): string => {
  return `
    <div class="search-result" data-app-name="${escapeHtml(result.appName)}">
      <span class="app-name">${escapeHtml(result.appName)}</span>
    </div>
  `;
};

// Pure function: Generate no results HTML
export const generateNoResultsHtml = (query: string): string => {
  return `
    <div class="no-results">
      <p>No apps found matching "${escapeHtml(query)}"</p>
      <p class="no-results-hint">Try a different app name</p>
    </div>
  `;
};

// Side effect: Scroll to app card by name
const scrollToApp = (appName: string): boolean => {
  const allCards = document.querySelectorAll('.app-card, .release-card');
  
  for (const card of allCards) {
    const cardTitle = card.querySelector('.app-name a')?.textContent?.trim();
    if (cardTitle === appName) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log(`[Search] Scrolled to app: ${appName}`);
      return true;
    }
  }
  
  console.warn(`[Search] App not found: ${appName}`);
  return false;
};

// Side effect: Update search results UI
const updateSearchUI = (
  resultsList: HTMLElement,
  resultsContainer: HTMLElement,
  countElement: HTMLElement,
  results: SearchResult[],
  query: string
): void => {
  if (results.length === 0) {
    resultsList.innerHTML = generateNoResultsHtml(query);
    countElement.textContent = '0 apps';
  } else {
    resultsList.innerHTML = results.map(generateResultHtml).join('');
    countElement.textContent = `${results.length} app${results.length === 1 ? '' : 's'}`;
  }
  
  resultsContainer.style.display = 'block';
};

// Side effect: Hide search results
const hideSearchResults = (resultsContainer: HTMLElement): void => {
  resultsContainer.style.display = 'none';
};

// Side effect: Clear search input and results
export const clearSearch = (
  input: HTMLInputElement,
  resultsContainer: HTMLElement,
  clearButton: HTMLElement
): void => {
  input.value = '';
  hideSearchResults(resultsContainer);
  clearButton.style.display = 'none';
};

// Side effect: Attach click handlers to search results
const attachResultHandlers = (resultsList: HTMLElement, onSelect: () => void): void => {
  const resultElements = resultsList.querySelectorAll('.search-result[data-app-name]');
  
  resultElements.forEach(result => {
    result.addEventListener('click', () => {
      const appName = (result as HTMLElement).dataset.appName || '';
      if (appName) {
        scrollToApp(appName);
        onSelect();
      }
    });
  });
};

// Main search function with side effects
export const performSearch = (
  query: string,
  apps: string[],
  elements: {
    resultsList: HTMLElement;
    resultsContainer: HTMLElement;
    countElement: HTMLElement;
  },
  minChars: number = 1
): void => {
  if (query.length < minChars) {
    hideSearchResults(elements.resultsContainer);
    return;
  }
  
  const results = filterApps(apps, query);
  updateSearchUI(
    elements.resultsList,
    elements.resultsContainer,
    elements.countElement,
    results,
    query
  );
  
  // Attach click handlers after updating DOM
  attachResultHandlers(elements.resultsList, () => {
    hideSearchResults(elements.resultsContainer);
  });
  
  console.log(`[Search] Found ${results.length} apps matching "${query}"`);
};

// Initialize search with event listeners
export const initSearch = (container: HTMLElement, apps: string[]): void => {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const searchClear = document.getElementById('search-clear') as HTMLButtonElement;
  const searchResults = document.getElementById('search-results') as HTMLElement;
  const searchResultsList = document.getElementById('search-results-list') as HTMLElement;
  const searchCount = document.getElementById('search-count') as HTMLElement;
  
  if (!searchInput || !searchClear || !searchResults || !searchResultsList || !searchCount) {
    console.error('[Search] Required elements not found');
    return;
  }
  
  const elements = {
    resultsList: searchResultsList,
    resultsContainer: searchResults,
    countElement: searchCount,
  };
  
  let debounceTimer: number | null = null;
  const DEBOUNCE_MS = 300;
  const MIN_CHARS = 1;
  
  // Input handler with debouncing
  const handleInput = (e: Event): void => {
    const query = (e.target as HTMLInputElement).value.trim();
    
    // Show/hide clear button
    searchClear.style.display = query ? 'block' : 'none';
    
    // Clear existing timer
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
    }
    
    // Debounce search
    if (query.length >= MIN_CHARS) {
      debounceTimer = window.setTimeout(() => {
        performSearch(query, apps, elements, MIN_CHARS);
      }, DEBOUNCE_MS);
    } else {
      hideSearchResults(searchResults);
    }
  };
  
  // Clear button handler
  const handleClear = (): void => {
    clearSearch(searchInput, searchResults, searchClear);
  };
  
  // Keyboard handler
  const handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      if (searchInput.value.trim() !== '' || searchResults.style.display === 'block') {
        handleClear();
      } else {
        searchInput.blur();
      }
    }
  };
  
  // Global keyboard shortcut handler
  const handleGlobalKeydown = (e: KeyboardEvent): void => {
    if ((e.key === '/' || e.key === 's') && 
        document.activeElement !== searchInput &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      searchInput.focus();
    }
  };
  
  // Click outside handler
  const handleClickOutside = (e: Event): void => {
    if (!searchResults.contains(e.target as Node) &&
        !searchInput.contains(e.target as Node) &&
        !searchClear.contains(e.target as Node)) {
      if (searchResults.style.display === 'block') {
        hideSearchResults(searchResults);
      }
    }
  };
  
  // Attach event listeners
  searchInput.addEventListener('input', handleInput);
  searchClear.addEventListener('click', handleClear);
  searchInput.addEventListener('keydown', handleKeydown);
  document.addEventListener('keydown', handleGlobalKeydown);
  document.addEventListener('click', handleClickOutside);
  
  console.log(`[Search] Initialized with ${apps.length} apps`);
};
