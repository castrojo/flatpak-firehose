package bluefin

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/castrojo/bluefin-releases/internal/models"
)

// TapConfig defines a Homebrew tap repository to fetch from
type TapConfig struct {
	Owner        string
	Repo         string
	Experimental bool
}

// GitHubContentItem represents a file in GitHub Contents API response
type GitHubContentItem struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	Type        string `json:"type"`
	DownloadURL string `json:"download_url"`
}

// FormulaMetadata holds parsed metadata from .rb files
type FormulaMetadata struct {
	Description string
	Homepage    string
	Version     string
	GitHubRepo  string // owner/repo format
}

// FetchUblueOSTapPackages fetches packages from ublue-os Homebrew taps
// Discovers packages dynamically from GitHub repositories
func FetchUblueOSTapPackages() ([]models.App, error) {
	log.Println("Fetching ublue-os tap packages...")

	var allApps []models.App
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Define taps to fetch from
	taps := []TapConfig{
		{Owner: "ublue-os", Repo: "homebrew-tap", Experimental: false},
		{Owner: "ublue-os", Repo: "homebrew-experimental-tap", Experimental: true},
	}

	for _, tap := range taps {
		wg.Add(1)
		go func(t TapConfig) {
			defer wg.Done()

			// Fetch formulae from /Formula directory
			formulae, err := fetchTapDirectory(t.Owner, t.Repo, "Formula", "formula", t.Experimental)
			if err != nil {
				log.Printf("⚠️  Failed to fetch formulae from %s/%s: %v", t.Owner, t.Repo, err)
			} else {
				mu.Lock()
				allApps = append(allApps, formulae...)
				mu.Unlock()
				log.Printf("  ✅ Fetched %d formulae from %s/%s", len(formulae), t.Owner, t.Repo)
			}

			// Fetch casks from /Casks directory
			casks, err := fetchTapDirectory(t.Owner, t.Repo, "Casks", "cask", t.Experimental)
			if err != nil {
				log.Printf("⚠️  Failed to fetch casks from %s/%s: %v", t.Owner, t.Repo, err)
			} else {
				mu.Lock()
				allApps = append(allApps, casks...)
				mu.Unlock()
				log.Printf("  ✅ Fetched %d casks from %s/%s", len(casks), t.Owner, t.Repo)
			}
		}(tap)
	}

	wg.Wait()

	log.Printf("✅ Successfully discovered %d ublue-os tap packages", len(allApps))
	return allApps, nil
}
