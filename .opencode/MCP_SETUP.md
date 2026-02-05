# OpenCode MCP Server Configurations

This document provides the complete configuration for all MCP servers available in this project.

## Quick Setup

Add the following to `~/.config/opencode/opencode.json`:

```json
{
  "mcpServers": {
    "dosu": {
      "transport": "remote",
      "url": "https://api.dosu.dev/v1/mcp",
      "headers": {
        "X-Deployment-ID": "83775020-c22e-485a-a222-987b2f5a3823"
      },
      "auth": {
        "type": "oauth2"
      }
    },
    "linux-diagnostics": {
      "transport": "stdio",
      "command": "/home/linuxbrew/.linuxbrew/bin/linux-mcp-server",
      "args": [],
      "env": {
        "LINUX_MCP_USER": "${USER}"
      }
    }
  }
}
```

## Available MCP Servers

### 1. Dosu (Organization Knowledge Base)

**Type:** Remote (OAuth2)  
**Config File:** `.opencode/mcp-config-dosu.json`

Search your organization's documentation, GitHub issues, Slack conversations, and Dosu-generated content.

**Tools:**
- `init_knowledge` - Search knowledge store for context
- `search_documentation` - Find docs, wikis, knowledge base
- `search_threads` - Search GitHub issues, Slack conversations
- `fetch_source` - Retrieve full content by source_id
- `save_topic` - Save discoveries to knowledge base
- `greet` - Test connection

**Authentication:** OAuth 2.0 (browser-based on first use)

**Reference:** https://app.dosu.dev/9affd04a-e6a9-452c-b927-c639e979994c/documents/8c21ef6e-14b7-4fa1-949e-d256af54bad1

---

### 2. Linux Diagnostics

**Type:** stdio (local process)  
**Config File:** `.opencode/mcp-config-linux.json`

Linux system monitoring and diagnostic tools.

**Capabilities:**
- System monitoring (CPU, memory, disk usage)
- Process management and inspection
- Network diagnostics
- Log file access and analysis
- Service status checks
- System configuration inspection

**Prerequisites:**
```bash
brew install linux-mcp-server
```

**Version:** 1.2.1  
**Source:** Copied from `~/.config/goose/config.yaml`

---

### 3. Astro Docs (Framework Documentation)

**Type:** Remote  
**Status:** Already configured (see commit 2583e8e)

Real-time access to Astro v5 documentation for accurate API recommendations.

**Config:**
```json
{
  "astro-docs": {
    "transport": "remote",
    "url": "https://mcp.docs.astro.build/mcp"
  }
}
```

**Reference:** https://docs.astro.build/en/guides/build-with-ai/

---

## Activation Steps

1. **Edit OpenCode config:**
   ```bash
   nano ~/.config/opencode/opencode.json
   ```

2. **Add the MCP servers** using the JSON configuration above

3. **Restart OpenCode** to load the new servers

4. **Test each server:**
   - Dosu: "Search Dosu for documentation about X" (will prompt for OAuth)
   - Linux: "Check current system CPU and memory usage"
   - Astro: "What's the latest way to create content collections in Astro?"

## Troubleshooting

### Dosu OAuth Issues
- Ensure browser allows pop-ups for OAuth flow
- Check that deployment ID is correct: `83775020-c22e-485a-a222-987b2f5a3823`

### Linux Diagnostics Not Working
- Verify installation: `which linux-mcp-server`
- Check version: `/home/linuxbrew/.linuxbrew/bin/linux-mcp-server --version`
- Reinstall if needed: `brew reinstall linux-mcp-server`

### General MCP Issues
- Check OpenCode logs for connection errors
- Verify JSON syntax is valid: `cat ~/.config/opencode/opencode.json | jq`
- Ensure proper transport type (remote vs stdio)

## Benefits

**Combined Capabilities:**
- 📚 Access organization knowledge (Dosu)
- 🖥️ Monitor system resources (Linux Diagnostics)
- 📖 Get framework documentation (Astro Docs)
- 🔍 Search past solutions and discussions
- 🛠️ Debug system issues without context switching
- ⚡ Faster development with in-editor access to all resources

## Maintenance

Configuration files are tracked in `.opencode/`:
- `mcp-config-dosu.json` - Dosu MCP server details
- `mcp-config-linux.json` - Linux diagnostics details

Update these files and commit changes when:
- Deployment IDs change
- New tools become available
- Server URLs are updated
- Authentication methods change
