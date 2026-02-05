# Mozilla Release RSS/Atom Feeds Research

**Date:** February 5, 2026  
**Scope:** Research official RSS/Atom feeds for Firefox and Thunderbird releases

## Summary

- **Thunderbird:** ✅ Has official Atom feed (viable)
- **Firefox:** ❌ No official RSS/Atom feed for releases
- **Recommendation:** Use Atom feed for Thunderbird, keep current API approach for Firefox

## Findings

### Thunderbird Release Feed

**Feed URL:** `https://www.thunderbird.net/en-US/thunderbird/releases/atom.xml`

**Format:** Atom (XML)

**Status:** ✅ Active and well-maintained

**Update Frequency:** Updated with each Thunderbird release

**Content Structure:**
- Feed contains complete release notes with structured HTML content
- Each entry includes:
  - Version number (in title)
  - Publication date
  - Release notes HTML (with sections: New, Fixed, Changed, etc.)
  - Direct link to release notes page
  - Security fixes links

**Sample Entry:**
```xml
<entry>
  <id>https://www.thunderbird.net/en-US/thunderbird/147.0.1/releasenotes/</id>
  <title type="html">Thunderbird 147.0.1</title>
  <author>
    <name>Thunderbird</name>
    <uri>https://www.thunderbird.net</uri>
  </author>
  <link rel="alternate" type="text/html" href="https://www.thunderbird.net/en-US/thunderbird/147.0.1/releasenotes/"/>
  <updated>2026-01-28T00:00:00+00:00</updated>
  <published>2026-01-28T00:00:00+00:00</published>
  <content type="html"><![CDATA[
    <h3>Fixed</h3>
    <ul>
      <li>
        <p>Thunderbird crashed during search, even when not actively searching</p>
      </li>
      <li>
        <p><a href="https://www.mozilla.org/en-US/security/known-vulnerabilities/thunderbird/#thunderbird147.0.1">Security fixes</a></p>
      </li>
    </ul>
  ]]></content>
</entry>
```

### Firefox Release Feed

**Feed URL:** ❌ None found

**Research Conducted:**
- Checked `https://www.mozilla.org/en-US/firefox/releases/` (no feed link)
- Checked `https://www.mozilla.org/en-US/firefox/releases/atom.xml` (404)
- Checked `https://www.mozilla.org/en-US/firefox/notes/rss.xml` (404)
- Alternative: Firefox category blog RSS available at `https://blog.mozilla.org/en/category/products/firefox/feed/`
  - ⚠️ This is a blog feed, NOT a release notes feed
  - Contains product announcements and feature articles
  - Not suitable for structured release tracking

**Why No Feed?**
Firefox uses a different infrastructure (mozilla.org/bedrock) than Thunderbird (thunderbird.net). The Thunderbird website generates Atom feeds specifically for release notes, but Firefox does not.

## Current Implementation (internal/mozilla/mozilla.go)

The current implementation:
1. **Fetches version info** from `product-details.mozilla.org` JSON API
   - Firefox: `https://product-details.mozilla.org/1.0/firefox_versions.json`
   - Thunderbird: `https://product-details.mozilla.org/1.0/thunderbird_versions.json`
2. **Scrapes HTML** release notes pages
   - Extracts structured sections (New, Fixed, Changed, Enterprise, Developer)
   - Parses HTML with regex to build markdown
3. **Returns single latest release** for each product

## Pros/Cons Comparison

### Atom Feed Approach (Thunderbird)

**Pros:**
- ✅ Official, stable feed format
- ✅ Multiple releases available in one request
- ✅ Structured XML easier to parse than HTML
- ✅ Includes publication dates
- ✅ Less brittle than HTML scraping
- ✅ Standard library/minimal dependencies for parsing

**Cons:**
- ❌ Content is still HTML (inside CDATA), requires HTML parsing
- ❌ Only available for Thunderbird (not Firefox)
- ❌ Feed may not include all historical releases (typically last 10-20)

### Current API + HTML Scraping Approach

**Pros:**
- ✅ Works for both Firefox and Thunderbird
- ✅ Can fetch any specific version
- ✅ Direct access to release notes structure
- ✅ Already implemented and working

**Cons:**
- ❌ HTML scraping is brittle (breaks when page structure changes)
- ❌ Requires regex patterns for HTML parsing
- ❌ Only fetches single latest version
- ❌ More complex error handling

## Code Example: Parsing Thunderbird Atom Feed

Below is a working Go example using the standard `encoding/xml` library to parse the Thunderbird Atom feed:

```go
package mozilla

import (
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/castrojo/bluefin-releases/internal/models"
)

// AtomFeed represents the Atom feed structure
type AtomFeed struct {
	XMLName xml.Name    `xml:"feed"`
	Title   string      `xml:"title"`
	Updated time.Time   `xml:"updated"`
	Entries []AtomEntry `xml:"entry"`
}

// AtomEntry represents a single release entry
type AtomEntry struct {
	ID        string    `xml:"id"`
	Title     string    `xml:"title"`
	Link      AtomLink  `xml:"link"`
	Published time.Time `xml:"published"`
	Updated   time.Time `xml:"updated"`
	Content   string    `xml:"content"`
}

// AtomLink represents the link element
type AtomLink struct {
	Href string `xml:"href,attr"`
	Type string `xml:"type,attr"`
}

// fetchThunderbirdReleasesFromAtom fetches releases from Thunderbird Atom feed
func fetchThunderbirdReleasesFromAtom() ([]models.Release, error) {
	feedURL := "https://www.thunderbird.net/en-US/thunderbird/releases/atom.xml"
	
	resp, err := http.Get(feedURL)
	if err != nil {
		return nil, fmt.Errorf("fetch atom feed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("atom feed returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read atom feed: %w", err)
	}

	var feed AtomFeed
	if err := xml.Unmarshal(body, &feed); err != nil {
		return nil, fmt.Errorf("parse atom feed: %w", err)
	}

	var releases []models.Release
	for _, entry := range feed.Entries {
		// Extract version from title (e.g., "Thunderbird 147.0.1" -> "147.0.1")
		version := extractVersionFromTitle(entry.Title)
		
		releases = append(releases, models.Release{
			Version:     version,
			Date:        entry.Published,
			Title:       entry.Title,
			Description: entry.Content, // HTML content in CDATA
			URL:         entry.Link.Href,
			Type:        "mozilla-atom",
		})
	}

	return releases, nil
}

// extractVersionFromTitle extracts version number from "Thunderbird X.Y.Z" title
func extractVersionFromTitle(title string) string {
	// Simple approach: strip "Thunderbird " prefix
	const prefix = "Thunderbird "
	if len(title) > len(prefix) && title[:len(prefix)] == prefix {
		return title[len(prefix):]
	}
	return title
}
```

**Usage:**
```go
releases, err := fetchThunderbirdReleasesFromAtom()
if err != nil {
    log.Printf("Failed to fetch Thunderbird releases: %v", err)
    return
}

// Returns multiple releases (typically 10-20 recent versions)
for _, release := range releases {
    fmt.Printf("Version: %s, Date: %s\n", release.Version, release.Date.Format("2006-01-02"))
}
```

**Dependencies:**
- Standard library only (`encoding/xml`, `net/http`, `time`)
- No external RSS/Atom parsing libraries needed

## Recommendation

### For Thunderbird
**Switch to Atom feed approach**

**Rationale:**
1. Official feed is more reliable than HTML scraping
2. Provides multiple releases in one request (vs. current single release)
3. Standard XML parsing is more maintainable
4. Less likely to break with website changes
5. Better performance (one request vs. two)

**Implementation:**
- Replace `fetchThunderbirdReleases()` with `fetchThunderbirdReleasesFromAtom()`
- Keep HTML cleaning logic for the content field (still contains HTML)
- Consider limiting to top N releases if needed

### For Firefox
**Keep current API + HTML scraping approach**

**Rationale:**
1. No official RSS/Atom feed available
2. Current approach works reliably
3. Product details API is stable
4. HTML structure has been consistent

**Improvements (optional):**
- Add error handling for HTML structure changes
- Consider caching to reduce scraping frequency
- Monitor for future RSS feed availability

## Testing

### Thunderbird Atom Feed
```bash
# Fetch and inspect feed
curl -s "https://www.thunderbird.net/en-US/thunderbird/releases/atom.xml" | xmllint --format -

# Verify feed is valid
curl -s "https://www.thunderbird.net/en-US/thunderbird/releases/atom.xml" | xmllint --noout -

# Count entries
curl -s "https://www.thunderbird.net/en-US/thunderbird/releases/atom.xml" | grep -c "<entry>"
```

### Firefox APIs
```bash
# Fetch version info
curl -s "https://product-details.mozilla.org/1.0/firefox_versions.json" | jq '.LATEST_FIREFOX_VERSION'

# Check for feed (returns 404)
curl -I "https://www.mozilla.org/en-US/firefox/releases/atom.xml"
```

## References

- Thunderbird Atom Feed: https://www.thunderbird.net/en-US/thunderbird/releases/atom.xml
- Firefox Product Details API: https://product-details.mozilla.org/1.0/firefox_versions.json
- Thunderbird Product Details API: https://product-details.mozilla.org/1.0/thunderbird_versions.json
- Mozilla Blog Firefox Feed (not suitable): https://blog.mozilla.org/en/category/products/firefox/feed/
- Current Implementation: internal/mozilla/mozilla.go

## Next Steps

1. Implement Atom feed parsing for Thunderbird
2. Test with production data
3. Keep Firefox implementation as-is
4. Monitor for Firefox RSS feed availability in future
