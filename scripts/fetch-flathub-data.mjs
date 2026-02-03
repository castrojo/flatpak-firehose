import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FLATHUB_API = 'https://flathub.org/api/v2';
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

/**
 * Fetch recently updated apps from Flathub
 */
async function fetchRecentlyUpdatedApps() {
  console.log('Fetching recently updated apps from Flathub...');
  
  try {
    const response = await fetch(`${FLATHUB_API}/feed/recently-updated`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const apps = await response.json();
    console.log(`Fetched ${apps.length} recently updated apps`);
    return apps;
  } catch (error) {
    console.error('Error fetching apps:', error);
    throw error;
  }
}

/**
 * Fetch detailed app information including metadata
 */
async function fetchAppDetails(appId) {
  try {
    const response = await fetch(`${FLATHUB_API}/appstream/${appId}`);
    if (!response.ok) {
      console.warn(`Could not fetch details for ${appId}: ${response.status}`);
      return null;
    }
    const details = await response.json();
    return details;
  } catch (error) {
    console.warn(`Error fetching details for ${appId}:`, error.message);
    return null;
  }
}

/**
 * Extract source repository URL from app metadata
 */
function extractSourceRepo(appDetails) {
  if (!appDetails) return null;
  
  // Check for URLs in metadata
  if (appDetails.urls) {
    // Look for homepage or repository URLs
    const repoUrl = appDetails.urls.homepage || appDetails.urls.bugtracker;
    
    // Check if it's a GitHub URL
    if (repoUrl && repoUrl.includes('github.com')) {
      // Extract owner/repo from GitHub URL
      const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
      if (match) {
        const repo = match[1].replace(/\.git$/, '');
        return {
          type: 'github',
          url: repoUrl,
          repo: repo
        };
      }
    }
    
    return {
      type: 'other',
      url: repoUrl
    };
  }
  
  return null;
}

/**
 * Main function to fetch and process Flathub data
 */
async function main() {
  // Create data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Fetch recently updated apps
  const apps = await fetchRecentlyUpdatedApps();
  
  // Save apps data
  const appsPath = path.join(DATA_DIR, 'flathub-apps.json');
  fs.writeFileSync(appsPath, JSON.stringify(apps, null, 2));
  console.log(`Saved apps data to ${appsPath}`);
  
  // Fetch detailed information for each app (limit to first 50 to avoid rate limiting)
  const appsToFetch = apps.slice(0, 50);
  console.log(`Fetching detailed information for ${appsToFetch.length} apps...`);
  
  const appRepos = {};
  
  for (const app of appsToFetch) {
    console.log(`Fetching details for ${app.id}...`);
    const details = await fetchAppDetails(app.id);
    
    if (details) {
      const sourceRepo = extractSourceRepo(details);
      if (sourceRepo) {
        appRepos[app.id] = sourceRepo;
      }
      
      // Store releases information if available
      if (details.releases && details.releases.length > 0) {
        appRepos[app.id] = {
          ...appRepos[app.id],
          releases: details.releases.slice(0, 5) // Keep last 5 releases
        };
      }
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Save repository mapping
  const reposPath = path.join(DATA_DIR, 'app-repos.json');
  fs.writeFileSync(reposPath, JSON.stringify(appRepos, null, 2));
  console.log(`Saved repository mapping to ${reposPath}`);
  
  console.log('Done!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
