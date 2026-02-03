package bluefin

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/castrojo/bluefin-releases/internal/models"
)

const (
	// GitHub repository for Bluefin OS releases
	BluefinOSOwner = "ublue-os"
	BluefinOSRepo  = "bluefin"
)

// GitHubRelease represents a GitHub release from the API
type GitHubRelease struct {
	TagName     string    `json:"tag_name"`
	Name        string    `json:"name"`
	Body        string    `json:"body"`
	HTMLURL     string    `json:"html_url"`
	PublishedAt time.Time `json:"published_at"`
	Draft       bool      `json:"draft"`
	Prerelease  bool      `json:"prerelease"`
}

// FetchBluefinReleases fetches the latest Bluefin OS releases from GitHub
// Returns a slice of Release structs compatible with the existing models.
// Supports GITHUB_TOKEN environment variable for API rate limits.
func FetchBluefinReleases() ([]models.Release, error) {
	log.Println("Fetching Bluefin OS releases from GitHub...")

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases?per_page=10", BluefinOSOwner, BluefinOSRepo)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	// Add GitHub token if available
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("token %s", token))
	}

	// GitHub API requires a User-Agent header
	req.Header.Set("User-Agent", "bluefin-releases")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch releases: %w", err)
	}
	defer resp.Body.Close()

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

	var githubReleases []GitHubRelease
	if err := json.Unmarshal(body, &githubReleases); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	// Convert GitHub releases to our Release model
	var releases []models.Release
	for _, ghRelease := range githubReleases {
		// Skip draft and pre-releases
		if ghRelease.Draft || ghRelease.Prerelease {
			continue
		}

		release := models.Release{
			Version:     ghRelease.TagName,
			Date:        ghRelease.PublishedAt,
			Title:       ghRelease.Name,
			Description: parseReleaseNotes(ghRelease.Body),
			URL:         ghRelease.HTMLURL,
			Type:        "bluefin-os-release",
		}

		releases = append(releases, release)
	}

	log.Printf("✅ Fetched %d Bluefin OS releases", len(releases))
	return releases, nil
}

// parseReleaseNotes formats release notes for display
// This is a simple implementation that can be enhanced later
func parseReleaseNotes(body string) string {
	// For now, just return the body as-is
	// Future enhancements could:
	// - Extract key highlights
	// - Remove excessive formatting
	// - Limit length
	// - Parse markdown to plain text

	// Limit length to avoid massive descriptions
	maxLength := 1000
	if len(body) > maxLength {
		return body[:maxLength] + "..."
	}

	return body
}
