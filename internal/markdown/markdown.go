package markdown

import (
	"github.com/gomarkdown/markdown"
	"github.com/gomarkdown/markdown/html"
	"github.com/gomarkdown/markdown/parser"
)

// ToHTML converts markdown text to HTML
// Uses GitHub Flavored Markdown extensions for compatibility
func ToHTML(md string) string {
	// Handle empty input
	if md == "" {
		return ""
	}

	// Create markdown parser with GitHub Flavored Markdown extensions
	extensions := parser.CommonExtensions | parser.AutoHeadingIDs | parser.NoEmptyLineBeforeBlock
	p := parser.NewWithExtensions(extensions)
	doc := p.Parse([]byte(md))

	// Create HTML renderer with safe options
	htmlFlags := html.CommonFlags | html.HrefTargetBlank
	opts := html.RendererOptions{Flags: htmlFlags}
	renderer := html.NewRenderer(opts)

	// Render markdown to HTML
	htmlBytes := markdown.Render(doc, renderer)
	return string(htmlBytes)
}
