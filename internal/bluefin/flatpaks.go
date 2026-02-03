package bluefin

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
)

const (
	// GitHub repository containing Bluefin Brewfiles
	BluefinCommonOwner  = "projectbluefin"
	BluefinCommonRepo   = "common"
	BluefinCommonBranch = "main"
)

// FetchFlatpakList fetches the list of Flatpak app IDs that Bluefin ships with
// by parsing the Brewfiles from projectbluefin/common repository.
// Returns a slice of Flatpak app IDs (e.g., "org.gnome.Calculator").
// Supports GITHUB_TOKEN environment variable for API rate limits.
func FetchFlatpakList() ([]string, error) {
	log.Println("Fetching Bluefin Flatpak list from Brewfiles...")

	var allAppIDs []string

	// List of Brewfiles containing Flatpak definitions
	brewfiles := []string{
		"system_files/bluefin/usr/share/ublue-os/homebrew/system-flatpaks.Brewfile",
		"system_files/bluefin/usr/share/ublue-os/homebrew/system-dx-flatpaks.Brewfile",
	}

	for _, brewfile := range brewfiles {
		log.Printf("  Fetching %s...", brewfile)

		content, err := fetchRawFile(BluefinCommonOwner, BluefinCommonRepo, BluefinCommonBranch, brewfile)
		if err != nil {
			log.Printf("⚠️  Failed to fetch %s: %v", brewfile, err)
			continue // Skip this file, but continue with others
		}

		appIDs := parseFlatpakBrewfile(content)
		log.Printf("  Found %d Flatpak app IDs in %s", len(appIDs), brewfile)

		allAppIDs = append(allAppIDs, appIDs...)
	}

	// Deduplicate app IDs
	allAppIDs = deduplicate(allAppIDs)

	log.Printf("✅ Total Flatpak app IDs: %d", len(allAppIDs))
	return allAppIDs, nil
}

// fetchRawFile fetches a raw file from GitHub using raw.githubusercontent.com
// Supports optional GITHUB_TOKEN for authentication (helps with rate limits)
func fetchRawFile(owner, repo, branch, path string) ([]byte, error) {
	url := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/%s/%s", owner, repo, branch, path)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	// Add GitHub token if available (optional, helps with rate limits)
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("token %s", token))
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("file not found (404): %s", path)
	}

	if resp.StatusCode == http.StatusForbidden {
		return nil, fmt.Errorf("rate limit exceeded (403) - consider setting GITHUB_TOKEN environment variable")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}

	return body, nil
}

// parseFlatpakBrewfile parses a Brewfile and extracts Flatpak app IDs
// Matches lines like: flatpak "org.gnome.Calculator"
func parseFlatpakBrewfile(content []byte) []string {
	var appIDs []string

	// Regex pattern: flatpak "app.id.here"
	re := regexp.MustCompile(`flatpak\s+"([^"]+)"`)

	matches := re.FindAllSubmatch(content, -1)
	for _, match := range matches {
		if len(match) >= 2 {
			appID := string(match[1])
			appIDs = append(appIDs, appID)
		}
	}

	return appIDs
}

// deduplicate removes duplicate strings from a slice
func deduplicate(items []string) []string {
	seen := make(map[string]bool)
	result := []string{}

	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}

	return result
}
