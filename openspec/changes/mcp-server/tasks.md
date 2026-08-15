## 1. Dependencies and Setup

- [x] 1.1 Install @modelcontextprotocol/sdk package
- [x] 1.2 Create mcp-server.ts in project root with basic imports and server setup
- [x] 1.3 Add TypeScript path alias configuration for @/generated/prisma imports

## 2. Core MCP Server Infrastructure

- [x] 2.1 Initialize MCP Server with stdio transport
- [x] 2.2 Set up Prisma client connection using existing singleton pattern
- [x] 2.3 Implement graceful shutdown handler for database cleanup
- [x] 2.4 Add environment variable validation (DATABASE_URL required)

## 3. Read-Only Tools

- [x] 3.1 Implement list_cards tool returning all cards with config
- [x] 3.2 Implement get_transactions tool with optional cardId, startDate, endDate, categoryId filters
- [x] 3.3 Implement get_stats tool computing totals and category breakdowns for given card and period

## 4. Category Management Tools

- [x] 4.1 Implement list_categories tool returning all categories
- [x] 4.2 Implement create_category tool with name, optional icon and color
- [x] 4.3 Implement update_transaction_category tool to assign category to transaction
- [x] 4.4 Add validation for duplicate category names

## 5. Rule Management Tools

- [x] 5.1 Implement list_rules tool returning all rules with metadata
- [x] 5.2 Implement create_rule tool accepting name, pattern string, categoryId, optional priority
- [x] 5.3 Create rule pattern parser supporting "field operator value" format
- [x] 5.4 Implement pattern matching logic for contains, equals, startsWith, endsWith operators
- [x] 5.5 Implement apply_rules tool with optional cardId and dryRun parameters
- [x] 5.6 Add rule application logic to update uncategorized transactions

## 6. Card Synchronization Tool

- [x] 6.1 Implement sync_card tool with user approval mechanism
- [x] 6.2 Import and reuse IMAP ingest logic from src/lib/imap/ingest.ts
- [x] 6.3 Format approval prompt with card details (bank, cardLast4, IMAP host)
- [x] 6.4 Handle IMAP connection errors with sanitized error messages
- [x] 6.5 Return sync results with newCount and updatedCount

## 7. Error Handling and Validation

- [x] 7.1 Add input validation for all tool parameters
- [x] 7.2 Implement consistent error response format across all tools
- [x] 7.3 Add database connection error handling
- [x] 7.4 Sanitize IMAP credential exposure in error logs

## 8. Deployment Documentation

- [x] 8.1 Create docs/MCP_DEPLOYMENT.md with Claude Desktop configuration
- [x] 8.2 Document environment variable setup (DATABASE_URL passthrough)
- [x] 8.3 Add startup instructions for ts-node and compiled JavaScript
- [x] 8.4 Document testing procedures with sample prompts
- [x] 8.5 Add troubleshooting guide for common failure scenarios
- [x] 8.6 Document security considerations for local-only deployment

## 9. Testing and Verification

- [x] 9.1 Test list_cards returns correct data
- [ ] 9.2 Test get_transactions with various filter combinations
- [ ] 9.3 Test get_stats computation accuracy
- [ ] 9.4 Test category creation and transaction categorization
- [ ] 9.5 Test rule creation and pattern matching logic
- [ ] 9.6 Test apply_rules in dry-run and live modes
- [ ] 9.7 Test sync_card approval flow and IMAP integration
- [ ] 9.8 Verify error handling for invalid inputs
- [ ] 9.9 Test from Claude Desktop with natural language prompts
