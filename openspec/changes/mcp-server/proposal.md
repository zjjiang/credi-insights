## Why

Users need programmatic access to bill analysis data and card synchronization to integrate with AI assistants (Claude Desktop, custom automation). Currently all operations require manual UI interaction, limiting automation and AI-driven insights.

## What Changes

- Add MCP (Model Context Protocol) server exposing credit card bill data and operations
- Implement read-only tools for querying cards, transactions, and statistics
- Add classification management tools (categories, rules, auto-classification)
- Add card synchronization tool with user confirmation
- Provide deployment documentation for Claude Desktop integration

## Capabilities

### New Capabilities

- `mcp-server-tools`: MCP server implementation with tools for reading cards/transactions, managing categories/rules, and syncing cards via IMAP
- `mcp-deployment`: Configuration and deployment documentation for Claude Desktop integration

### Modified Capabilities

<!-- No existing capabilities are being modified -->

## Impact

- New TypeScript MCP server (`mcp-server.ts`) sharing Prisma client and IMAP logic with Next.js app
- No changes to existing Next.js API or UI
- Requires `@modelcontextprotocol/sdk` package
- Claude Desktop users can query and manage bills via natural language
