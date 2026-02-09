# Design: ublue-os Homebrew Tap Integration

**Date:** 2026-02-08  
**Status:** Approved  
**Author:** OpenCode (with user validation)

## Overview

Add support for tracking packages from ublue-os Homebrew taps to the Bluefin Firehose dashboard, automatically discovering and displaying ~41 additional packages alongside the existing 44 homebrew-core packages.

### Goals

- **Automatic discovery**: New packages appear automatically when added to ublue-os taps (no manual maintenance)
- **Clear distinction**: Experimental tap packages marked with visual badges
- **Unified experience**: All Homebrew packages (core + taps) treated consistently
- **GitHub enrichment**: Tap packages get release notes when GitHub repos are available

### Non-Goals

- Parsing complex Ruby DSL syntax (simple regex extraction is sufficient)
- Real-time updates (existing 6-hour GitHub Actions schedule is adequate)
- Per-tap filtering UI (can be added later if users request)
- Install command generation (out of scope)

## Background

**Current state:**
- Dashboard tracks 44 Homebrew packages from homebrew-core (CLI tools from Bluefin Brewfiles)
- Uses Homebrew Formulae API: `https://formulae.brew.sh/api/formula/<name>.json`
- Enriches with GitHub releases when repos are detected

**What's missing:**
- ublue-os maintains custom taps with Linux-specific packages:
  - **ublue-os/homebrew-tap** (production): 3 formulae + 13 casks (VSCode, JetBrains, wallpapers, etc.)
  - **ublue-os/homebrew-experimental-tap** (staging): 6 formulae + 19 casks (individual IDEs, tools)
- These taps aren't indexed by formulae.brew.sh API
- Users can't see release updates for tap packages

## Package Inventory

### ublue-os/homebrew-tap (16 packages)

**Formulae (3):**
- heic-to-dynamic-gnome-wallpaper - Convert HEIC wallpapers to GNOME format
- linux-mcp-server - Model Context Protocol server for Linux
- pmbootstrap - postmarketOS chroot/build/flash tool

**Casks (13):**
- visual-studio-code-linux - Microsoft's code editor
- vscodium-linux - Open-source VS Code build
- jetbrains-toolbox-linux - JetBrains tools manager
- lm-studio-linux - Local LLM runtime
- 1password-gui-linux - Password manager
- framework-tool - Framework laptop hardware tool
- antigravity-linux - Gaming tool
- goose-linux - AI coding assistant
- bluefin-wallpapers - Bluefin wallpaper pack
- bluefin-wallpapers-extra - Additional wallpapers
- aurora-wallpapers - Aurora wallpaper pack
- bazzite-wallpapers - Bazzite wallpaper pack
- framework-wallpapers - Framework wallpaper pack

### ublue-os/homebrew-experimental-tap (25 packages)

**Formulae (6):**
- asusctl - ASUS laptop control utility
- bluefin-cli - Bluefin CLI utilities
- buildstream - Build and integration tool
- foundry - Ethereum development toolkit
- libvirt-full - Full-featured libvirt build
- ydotool - Generic command-line automation tool

**Casks (19):**
- Individual JetBrains IDEs: clion, datagrip, dataspell, goland, intellij-idea, phpstorm, pycharm, rider, rubymine, rustrover, webstorm
- Other tools: cursor-linux, opencode-desktop-linux, rancher-desktop-linux, docker-rootless-linux, emacs-app-linux
- Utilities: 1password-flatpak-browser-integration, buildbox, winboat

**Total new packages: ~41**

## Design Decisions

### 1. Package Discovery Strategy

**Decision:** Dynamic discovery via GitHub API + .rb file parsing

**Alternatives considered:**
- ❌ **Static list in Go code** - Requires manual updates when new packages added
- ❌ **Parse Brewfiles** - Taps don't have Brewfiles, packages defined in Formula/Casks directories
- ✅ **GitHub Contents API + raw file fetching** - Automatic, maintainable, no manual intervention

**Implementation:**
1. Use GitHub Contents API to list `.rb` files in `/Formula` and `/Casks` directories
2. Fetch raw `.rb` file contents via `raw.githubusercontent.com`
3. Extract metadata using regex patterns: `desc "..."`, `homepage "..."`, `version "..."`, `url "github.com/owner/repo"`
4. Convert to `models.App` format with GitHub repo detection

**Trade-offs:**
- **Pro:** Fully automatic, no maintenance needed
- **Pro:** Works for both taps using same code
- **Con:** Adds ~3-5s to build time (~41 HTTP requests)
- **Con:** Regex may miss complex Ruby syntax (acceptable - can add fallbacks)

### 2. Data Model Changes

**Decision:** Minimal changes to existing schema

**New field:**
```go
type App struct {
    // ... existing fields ...
    Experimental bool `json:"experimental,omitempty"` // Marks experimental-tap packages
}
```

**Existing fields (no changes needed):**
- `PackageType` = "homebrew" (same as core Homebrew)
- `HomebrewInfo.Tap` = "ublue-os/tap" or "ublue-os/experimental-tap"
- `HomebrewInfo.Formula` = "ublue-os/tap/visual-studio-code-linux"
- `SourceRepo` = extracted GitHub owner/repo (for release tracking)

**Rationale:**
- Reuse existing Homebrew infrastructure (GitHub enrichment, filters, display logic)
- `Experimental` flag is boolean (simpler than string enums)
- No breaking changes to JSON schema

### 3. UI Representation

**Decision:** Subtle experimental badges, no separate package type

**Visual changes:**
- **Experimental badge:** Yellow warning badge on experimental-tap packages
  ```
  ⚠️ Experimental
  ```
- **Tooltip:** "Experimental package - may be unstable"
- **Package counts:** "85 Homebrew Packages" (includes core + taps)
- **Optional detail:** Show tap source in metadata section (e.g., "Source: ublue-os/tap")

**Why this approach:**
- Users primarily care about "is this Homebrew?" not "which tap?"
- Experimental warning is important (unstable packages)
- Keeps UI simple (no filter explosion)
- Can add tap-specific filters later if users request

**Alternative considered:**
- ❌ Separate package types ("homebrew-tap", "homebrew-experimental") - Creates confusing categories
- ❌ Hide experimental by default - Users might want to see them

### 4. Metadata Extraction

**Decision:** Simple regex parsing with fallback

**Patterns to extract from .rb files:**
```ruby
desc "Human-readable description"        → App.Summary
homepage "https://example.com"           → HomebrewInfo.Homepage
version "1.2.3"                          → App.Version
url "https://github.com/owner/repo/..."  → SourceRepo (owner/repo)
```

**Regex patterns:**
```go
descRe     := regexp.MustCompile(`desc\s+"([^"]+)"`)
homepageRe := regexp.MustCompile(`homepage\s+"([^"]+)"`)
versionRe  := regexp.MustCompile(`version\s+"([^"]+)"`)
githubRe   := regexp.MustCompile(`github\.com[/:]([^/]+)/([^/\s"]+)`)
```

**Fallback behavior:**
- If metadata missing: Use filename as name, generate minimal description
- If parsing fails: Log warning, skip package (don't break build)
- If GitHub repo not found: Package still appears, just no release notes

## Implementation Plan

### Phase 1: Backend - Dynamic Tap Fetching

**Files to create:**
- `internal/bluefin/homebrew_taps.go` - Core fetching logic

**Key functions:**
```go
func FetchUblueOSTapPackages() ([]models.App, error)
func fetchTapDirectory(owner, repo, directory, pkgType string, experimental bool) ([]models.App, error)
func parseTapPackage(owner, repo, directory, filename, pkgName, pkgType string, experimental bool) (models.App, error)
func parseRubyFormula(content string) FormulaMetadata
```

**Integration:**
```go
// In cmd/bluefin-releases/main.go
tapApps, err := bluefin.FetchUblueOSTapPackages()
if err != nil {
    log.Printf("⚠️  Failed to fetch tap packages: %v", err)
} else {
    allApps = append(allApps, tapApps...)
}
```

**Error handling:**
- GitHub API failures: Log warning, continue with other taps
- Parsing failures: Log warning, skip package, continue with others
- Rate limiting: Use GITHUB_TOKEN if available, cache responses

### Phase 2: Data Model Update

**File to modify:**
- `internal/models/models.go`

**Change:**
```go
type App struct {
    // ... existing fields ...
    Experimental bool `json:"experimental,omitempty"`
}
```

### Phase 3: Frontend - Experimental Badges

**Files to modify:**
- `src/components/AppCard.astro` - Add badge rendering
- `src/components/ReleaseCard.astro` - Add badge rendering
- `src/layouts/Layout.astro` - Add badge CSS

**Badge HTML:**
```astro
{app.experimental && (
  <span class="experimental-badge" title="Experimental package - may be unstable">
    ⚠️ Experimental
  </span>
)}
```

**CSS:**
```css
.experimental-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(255, 193, 7, 0.15);
  border: 1px solid rgba(255, 193, 7, 0.4);
  border-radius: 4px;
  font-size: 0.75rem;
  color: #ff9800;
  font-weight: 500;
}
```

### Phase 4: Documentation Updates

**Files to modify:**
- `README.md` - Update package counts, add tap section
- `AGENTS.md` - Update architecture docs, counts

**Changes:**
- "~130 packages total" (was ~89)
- "85 Homebrew packages (44 core + 41 from ublue-os taps)"
- Add section explaining tap packages and experimental badge

## Testing Strategy

### Unit Testing

**Pipeline smoke test:**
```bash
go run cmd/bluefin-releases/main.go

# Verify tap packages present
jq '.apps | map(select(.homebrewInfo.tap != null)) | length' src/data/apps.json
# Expected: ~41

# Verify experimental flag
jq '.apps | map(select(.experimental == true)) | length' src/data/apps.json
# Expected: ~25

# Verify GitHub repos extracted
jq '.apps | map(select(.homebrewInfo.tap != null and .sourceRepo != null)) | length' src/data/apps.json
# Expected: 15-25 (not all packages have GitHub repos)
```

**Regex validation:**
```bash
# Download sample .rb files
curl https://raw.githubusercontent.com/ublue-os/homebrew-tap/main/Formula/heic-to-dynamic-gnome-wallpaper.rb

# Manually verify parsed metadata matches file content
```

### Integration Testing

**Frontend verification:**
```bash
npm run build
npm run preview

# Visual checks:
# ✓ Experimental badges appear on experimental-tap packages
# ✓ Package counts: "~130 packages total"
# ✓ Homebrew filter includes tap packages
# ✓ Search works for tap package names (e.g., "visual-studio-code")
# ✓ GitHub release notes appear for packages with repos
```

**Performance testing:**
```bash
time npm run build

# Expected times:
# - Without GITHUB_TOKEN: ~5-8s (no release enrichment)
# - With GITHUB_TOKEN: ~25-35s (full enrichment)
# - Acceptable: <60s total
```

### Edge Cases

1. **Missing metadata fields** - Package still appears with minimal info
2. **Malformed .rb files** - Package skipped, warning logged
3. **GitHub API rate limit** - Degrades gracefully, uses token if available
4. **Network failures** - Pipeline continues without tap packages
5. **New package added to tap** - Appears automatically on next build (6 hours)

## Performance Impact

**Current build times:**
- Flatpak fetch: ~600-800ms (42 apps)
- Homebrew fetch: ~200-300ms (44 packages)
- OS releases: ~300ms (10 releases)
- GitHub enrichment: ~10-20s (with token)
- Astro build: ~600ms
- **Total: ~20-30s**

**After adding taps:**
- Tap discovery: ~3-5s (2 GitHub API calls + 41 raw file fetches)
- Parsing: <100ms (regex on small files)
- **New total: ~25-35s**

**Impact:** +5s (~20% increase) - Acceptable for 6-hour build schedule

**Future optimizations (if needed):**
- Cache parsed .rb files (1 hour TTL)
- Batch GitHub API requests
- Parse only changed files (track git SHA)

## Rollout Plan

### Implementation Order

1. ✅ Design approved
2. Add `Experimental` field to `models.App`
3. Implement `homebrew_taps.go` with dynamic fetching
4. Update `main.go` to call tap fetcher
5. Test pipeline locally (verify 41 new packages)
6. Add experimental badge to Astro components
7. Update documentation (README, AGENTS.md)
8. Run full build and preview
9. Commit and push to main

### Validation Checklist

Before merging:
- [ ] Pipeline succeeds without errors
- [ ] ~41 new packages in apps.json
- [ ] Experimental flag set correctly (25 packages)
- [ ] GitHub repos extracted where available
- [ ] Experimental badges render in UI
- [ ] Package counts updated in UI
- [ ] Build time <60s
- [ ] No broken links or missing metadata
- [ ] README and AGENTS.md updated

### Deployment

- Merge to main
- GitHub Actions runs automatically (next 6-hour cycle or manual trigger)
- Monitor logs for errors
- Verify site displays new packages

## Future Enhancements

**Not in scope for initial implementation:**

1. **"Hide experimental" filter toggle** - Add if users request it
2. **Prominent tap source display** - Currently subtle, can emphasize if useful
3. **Install command generation** - Show `brew install ublue-os/tap/package`
4. **Caching layer** - Speed up builds by caching parsed .rb files
5. **Webhook updates** - Real-time updates when taps change (vs 6-hour schedule)
6. **Brewfile export** - Generate Brewfile from dashboard selections

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Regex fails on complex Ruby syntax | Medium | Low | Fallback to minimal metadata, log warning |
| GitHub API rate limits | Low | Medium | Use GITHUB_TOKEN, cache responses |
| Build time too long | Low | Low | Add caching in future (not needed now) |
| Experimental packages confuse users | Low | Medium | Clear badge + tooltip explanation |
| Tap repo structure changes | Low | High | Code checks for 404, degrades gracefully |

## Success Metrics

**After deployment, verify:**
- ✅ ~130 total packages displayed (was ~89)
- ✅ 85 Homebrew packages shown (was 44)
- ✅ Experimental badges appear on 25 packages
- ✅ GitHub release notes work for tap packages with repos
- ✅ Build completes in <60s
- ✅ No errors in GitHub Actions logs

## Appendix: API Examples

### GitHub Contents API Response
```json
[
  {
    "name": "heic-to-dynamic-gnome-wallpaper.rb",
    "path": "Formula/heic-to-dynamic-gnome-wallpaper.rb",
    "download_url": "https://raw.githubusercontent.com/.../heic-to-dynamic-gnome-wallpaper.rb"
  }
]
```

### Sample .rb File (heic-to-dynamic-gnome-wallpaper.rb)
```ruby
class HeicToDynamicGnomeWallpaper < Formula
  desc "Convert HEIC dynamic wallpapers to GNOME dynamic wallpapers"
  homepage "https://github.com/kewlfft/heic-to-dynamic-gnome-wallpaper"
  url "https://github.com/kewlfft/heic-to-dynamic-gnome-wallpaper/archive/refs/tags/v1.0.0.tar.gz"
  sha256 "..."
  version "1.0.0"
  
  # ... rest of formula
end
```

### Parsed Metadata
```go
FormulaMetadata{
  Description: "Convert HEIC dynamic wallpapers to GNOME dynamic wallpapers",
  Homepage: "https://github.com/kewlfft/heic-to-dynamic-gnome-wallpaper",
  Version: "1.0.0",
  GitHubRepo: "kewlfft/heic-to-dynamic-gnome-wallpaper",
}
```

### Resulting App JSON
```json
{
  "id": "homebrew-ublue-os-tap-heic-to-dynamic-gnome-wallpaper",
  "name": "heic-to-dynamic-gnome-wallpaper",
  "summary": "Convert HEIC dynamic wallpapers to GNOME dynamic wallpapers",
  "version": "1.0.0",
  "packageType": "homebrew",
  "experimental": false,
  "homebrewInfo": {
    "formula": "ublue-os/tap/heic-to-dynamic-gnome-wallpaper",
    "tap": "ublue-os/tap",
    "homepage": "https://github.com/kewlfft/heic-to-dynamic-gnome-wallpaper"
  },
  "sourceRepo": {
    "type": "github",
    "owner": "kewlfft",
    "repo": "heic-to-dynamic-gnome-wallpaper",
    "url": "https://github.com/kewlfft/heic-to-dynamic-gnome-wallpaper"
  }
}
```

## References

- ublue-os/homebrew-tap: https://github.com/ublue-os/homebrew-tap
- ublue-os/homebrew-experimental-tap: https://github.com/ublue-os/homebrew-experimental-tap
- GitHub Contents API: https://docs.github.com/en/rest/repos/contents
- Homebrew Formula Documentation: https://docs.brew.sh/Formula-Cookbook
