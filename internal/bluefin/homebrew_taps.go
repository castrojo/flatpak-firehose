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
