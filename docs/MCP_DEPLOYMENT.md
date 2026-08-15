# MCP Server Deployment Guide

## Overview

The Credi Insights MCP (Model Context Protocol) server exposes credit card transaction data and management tools to Claude Desktop and other MCP clients.

## Prerequisites

- Node.js 18+ with `tsx` installed
- MySQL database running (same as the web app)
- Environment variables configured (`.env` file)

## Claude Desktop Configuration

Add the following to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "credi-insights": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/credi-insights/mcp-server.ts"],
      "env": {
        "DATABASE_URL": "mysql://root:password@localhost:3306/credi_insights"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/credi-insights` with the actual absolute path to your project directory.

## Environment Variables

The MCP server requires the following environment variable:

- `DATABASE_URL`: MySQL connection string (required)

The `DATABASE_URL` must be passed through the `env` field in the Claude Desktop config, as the MCP server runs in an isolated environment and cannot read your `.env` file.

## Starting the Server

### Development Mode (with auto-reload)

```bash
npm run mcp:dev
```

This runs `tsx --watch mcp-server.ts` for development with automatic reloading on file changes.

### Production Mode

The server is automatically started by Claude Desktop when configured. No manual startup is required.

### Manual Testing

To test the server manually via stdio:

```bash
npx tsx mcp-server.ts
```

Then type MCP protocol JSON messages. Press Ctrl+D to end input.

## Available Tools

Once configured, ask Claude in Claude Desktop:

- "List all my credit cards"
- "Show transactions from the last month"
- "Get spending stats for card X in March"
- "Create a new category called 餐饮"
- "Apply classification rules to my transactions"
- "Sync card X from IMAP"

## Testing Procedures

### 1. Verify Server Connection

In Claude Desktop, ask:
```
What MCP tools do you have access to?
```

You should see tools like `list_cards`, `get_transactions`, `get_stats`, etc.

### 2. Test Basic Queries

```
List all my credit cards
```

Expected: JSON array of cards with bank, cardLast4, alias, etc.

### 3. Test Filtered Queries

```
Show me transactions from card [cardId] between 2024-01-01 and 2024-01-31
```

Expected: Filtered transaction list

### 4. Test Stats

```
Get spending stats for card [cardId] in 2024-01
```

Expected: Total debit/credit amounts and category breakdown

### 5. Test Category Management

```
Create a new category called 交通 with icon 🚗
```

Expected: New category created with returned ID

### 6. Test Rule Application

```
Apply classification rules (dry run)
```

Expected: Preview of matches without updating database

## Troubleshooting

### Server Not Appearing in Claude Desktop

1. **Check config syntax**: Ensure `claude_desktop_config.json` is valid JSON
2. **Verify paths**: Use absolute paths, not relative ones
3. **Restart Claude Desktop**: Config changes require a full restart
4. **Check logs**: Claude Desktop logs appear in Developer Tools (Help → Developer Tools)

### Database Connection Errors

```
Error: DATABASE_URL environment variable is required
```

**Solution**: Add `DATABASE_URL` to the `env` field in the MCP config, not just your `.env` file.

```
Database connection failed: ECONNREFUSED
```

**Solution**: Ensure MySQL is running and credentials are correct.

### IMAP Sync Errors

```
Sync failed: auth: [REDACTED]
```

**Solution**: Check card's IMAP configuration in the database. Credentials may be invalid or expired.

```
Rate limit: please wait 45s before syncing this card again
```

**Solution**: Each card can only sync once per minute. Wait and retry.

### Permission Issues

```
Error: EACCES: permission denied
```

**Solution**: Ensure the MCP server process has read access to the project directory and write access to the database.

## Security Considerations

### Local-Only Deployment

The MCP server is designed for **local-only** use:

- Runs on stdio (standard input/output), not a network port
- Only accessible to Claude Desktop running on the same machine
- No authentication layer (relies on OS-level process isolation)

### Credential Protection

- IMAP passwords stored encrypted in the database
- Error messages sanitize credentials before logging
- Database connection string passed via environment, not hardcoded

### Rate Limiting

- Sync operations limited to 1 per card per minute
- Prevents accidental IMAP server abuse
- Rate limits stored in-memory (reset on server restart)

### Database Access

The MCP server has **full read/write access** to the database. It can:
- Read all cards and transactions
- Create/update categories
- Modify transaction classifications
- Trigger IMAP syncs

**Do not** expose this MCP server over a network or to untrusted clients.

## Next Steps

After deployment:

1. Test all tools with sample queries
2. Create classification rules for common merchants
3. Set up regular syncs via the web UI or manual tool calls
4. Monitor Claude Desktop logs for errors

For development, see the main [README.md](../README.md) and [CLAUDE.md](../CLAUDE.md).
