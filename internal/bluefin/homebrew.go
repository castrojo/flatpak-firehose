package bluefin

import (
	"log"
	"regexp"
)

// FetchHomebrewList fetches the list of Homebrew packages that Bluefin includes
// by parsing the Brewfiles from projectbluefin/common repository.
// Returns a slice of Homebrew package names (e.g., "bat", "gh").
// Supports GITHUB_TOKEN environment variable for API rate limits.
func FetchHomebrewList() ([]string, error) {
	log.Println("Fetching Bluefin Homebrew package list from Brewfiles...")

	var allPackages []string

	// List of Brewfiles containing Homebrew package definitions
	brewfiles := []string{
		"system_files/shared/usr/share/ublue-os/homebrew/cli.Brewfile",
		"system_files/shared/usr/share/ublue-os/homebrew/fonts.Brewfile",
		"system_files/shared/usr/share/ublue-os/homebrew/ai-tools.Brewfile",
		"system_files/shared/usr/share/ublue-os/homebrew/k8s-tools.Brewfile",
		"system_files/shared/usr/share/ublue-os/homebrew/cncf.Brewfile",
		"system_files/shared/usr/share/ublue-os/homebrew/artwork.Brewfile",
		"system_files/shared/usr/share/ublue-os/homebrew/ide.Brewfile",
		"system_files/shared/usr/share/ublue-os/homebrew/experimental-ide.Brewfile",
		"system_files/shared/usr/share/ublue-os/homebrew/swift.Brewfile",
	}

	for _, brewfile := range brewfiles {
		log.Printf("  Fetching %s...", brewfile)

		content, err := fetchRawFile(BluefinCommonOwner, BluefinCommonRepo, BluefinCommonBranch, brewfile)
		if err != nil {
			log.Printf("⚠️  Failed to fetch %s: %v", brewfile, err)
			continue // Skip this file, but continue with others
		}

		packages := parseHomebrewBrewfile(content)
		log.Printf("  Found %d Homebrew packages in %s", len(packages), brewfile)

		allPackages = append(allPackages, packages...)
	}

	// Deduplicate package names
	allPackages = deduplicate(allPackages)

	log.Printf("✅ Total Homebrew packages: %d", len(allPackages))
	return allPackages, nil
}

// parseHomebrewBrewfile parses a Brewfile and extracts Homebrew package names
// Matches lines like: brew "package-name"
// Ignores tap lines like: tap "owner/repo"
func parseHomebrewBrewfile(content []byte) []string {
	var packages []string

	// Regex pattern: brew "package-name"
	// Note: We ignore tap lines, only extract brew package names
	re := regexp.MustCompile(`brew\s+"([^"]+)"`)

	matches := re.FindAllSubmatch(content, -1)
	for _, match := range matches {
		if len(match) >= 2 {
			packageName := string(match[1])
			packages = append(packages, packageName)
		}
	}

	return packages
}
