## Context

Users want to interact with Credi Insights bill data through AI assistants (Claude Desktop, automation scripts) rather than only through the Next.js web UI. The system currently has all the necessary data access and IMAP sync logic in TypeScript, but no programmatic interface for external tools.

MCP (Model Context Protocol) is the standard protocol for exposing tools to Claude Desktop and other AI clients. By implementing an MCP server, we enable natural language queries like "show me transactions over ¥500 this month" or "sync my CMB card".

Current state:
- Next.js app with Prisma ORM connecting to MySQL
- IMAP sync logic in `src/lib/imap/ingest.ts`
- Transaction parsing in `scripts/parse_msg.py` (called from TypeScript)
- Two-card setup (low transaction volume)

## Goals / Non-Goals

**Goals:**
- Expose read-only access to cards, transactions, categories, rules
- Enable category/rule management and auto-classification
- Provide card sync with user confirmation
- Run as standalone process (independent of Next.js dev server)
- Document deployment to Claude Desktop

**Non-Goals:**
- Multi-user authentication (local-only, single-user tool)
- Remote deployment or HTTP API exposure
- Real-time notifications or webhooks
- Modifying Next.js app code (except shared imports)

## Decisions

### Decision 1: Standalone TypeScript process vs HTTP bridge

**Choice:** Standalone TypeScript process using stdio transport

**Rationale:**
- MCP stdio transport is the standard for local tools
- Can directly import Prisma client and IMAP logic (no duplication)
- No dependency on Next.js dev server being up
- Simpler deployment (one `ts-node` command)

**Alternative considered:** HTTP bridge calling Next.js API routes
- Rejected: Adds latency, requires Next.js to be running, duplicates validation logic

### Decision 2: Rule pattern syntax

**Choice:** Simple DSL format `"field operator value"` where operator ∈ {contains, equals, startsWith, endsWith}

**Rationale:**
- Easy for Claude to construct in tool calls
- Simple to parse with regex
- Covers 95% of classification use cases
- Examples: `"merchant contains 美团"`, `"merchant startsWith 招商"`

**Alternatives considered:**
- Structured JSON: `{field, operator, value}` — more verbose in tool calls
- Regex patterns: too error-prone for AI generation
- Natural language: unreliable parsing

### Decision 3: Database access pattern

**Choice:** Import generated Prisma client from `src/generated/prisma`

**Rationale:**
- Already generated and type-safe
- Shares singleton client instance pattern from `src/lib/db.ts`
- No schema duplication

### Decision 4: Tool granularity

**Choice:** Fine-grained tools (10 separate tools vs monolithic query tool)

**Rationale:**
- Claude can compose operations naturally ("first list categories, then apply rules")
- Clearer tool descriptions improve AI understanding
- User approval per-operation (only `sync_card` requires approval)

**Alternative considered:** Generic `query` tool with action parameter
- Rejected: Harder for AI to discover capabilities, loses per-tool approval control

### Decision 5: Sync confirmation mechanism

**Choice:** Use MCP's built-in user approval mechanism for `sync_card` tool

**Rationale:**
- Standard MCP pattern for destructive operations
- User sees card details before approving IMAP connection
- Prevents accidental sync loops

## Risks / Trade-offs

### Risk: Rule pattern parsing ambiguity
**Example:** `"merchant contains 美团外卖 套餐"` — where does value start?

**Mitigation:** Require quoting for multi-word values or document pattern format clearly. Start simple (assume value is everything after operator).

### Risk: IMAP credentials exposed in error messages
**Example:** Connection failure logs could leak email/password

**Mitigation:** Sanitize error messages, only log host/port, never credentials

### Risk: Large transaction result sets
**Example:** `get_transactions()` with no filters on 10k+ transactions

**Mitigation:** Document recommended filters in tool descriptions. Future: add limit parameter (not in v1 with only 2 cards).

### Trade-off: No transaction editing/deletion
**Choice:** Read-only for transactions (only category updates allowed)

**Rationale:** Reduces risk of data corruption. Users can delete via web UI if needed.

### Trade-off: Synchronous sync operation
**Choice:** `sync_card` blocks until IMAP sync completes

**Rationale:** Simpler than async job tracking. IMAP fetch is fast (~5-10s for 30 days). Acceptable for 2-card use case.

## Migration Plan

**Deployment steps:**
1. Install `@modelcontextprotocol/sdk` package
2. Create `mcp-server.ts` in project root
3. Add `mcp-server.json` config with DATABASE_URL passthrough
4. Add entry to `~/.config/claude/claude_desktop_config.json`
5. Restart Claude Desktop
6. Test with sample prompts

**Rollback:** Remove server entry from Claude Desktop config, restart. No database changes.

**Verification:**
- Claude Desktop shows "credi-insights" in tools list
- Sample query: "List my cards" returns 2 cards
- Sample sync: "Sync card ending in 0094" prompts for approval

## Open Questions

None — design is straightforward given existing codebase and clear requirements.
