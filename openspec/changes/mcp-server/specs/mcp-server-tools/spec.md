## ADDED Requirements

### Requirement: MCP server provides card listing

The MCP server SHALL expose a `list_cards` tool that returns all cards with their configuration.

#### Scenario: List all cards
- **WHEN** user calls `list_cards` tool
- **THEN** system returns array of cards with id, bank, cardLast4, alias, billingDay, dueDay, isActive

#### Scenario: Empty database
- **WHEN** user calls `list_cards` with no cards in database
- **THEN** system returns empty array

### Requirement: MCP server provides transaction querying

The MCP server SHALL expose a `get_transactions` tool that accepts optional filters for cardId, startDate, endDate, and categoryId.

#### Scenario: Query all transactions
- **WHEN** user calls `get_transactions` with no filters
- **THEN** system returns all transactions with merchant, amount, txDate, category, card info

#### Scenario: Filter by card
- **WHEN** user calls `get_transactions` with cardId filter
- **THEN** system returns only transactions for that card

#### Scenario: Filter by date range
- **WHEN** user calls `get_transactions` with startDate and endDate
- **THEN** system returns only transactions within that period (inclusive)

#### Scenario: Filter by category
- **WHEN** user calls `get_transactions` with categoryId
- **THEN** system returns only transactions in that category

### Requirement: MCP server provides spending statistics

The MCP server SHALL expose a `get_stats` tool that computes debit/credit totals and category breakdowns for a given card and period.

#### Scenario: Get monthly stats
- **WHEN** user calls `get_stats` with cardId and period "2026-08"
- **THEN** system returns totalDebit, totalCredit, and byCategory array with amounts per category

#### Scenario: Invalid period format
- **WHEN** user calls `get_stats` with invalid period format
- **THEN** system returns error describing expected format (YYYY-MM)

### Requirement: MCP server provides category management

The MCP server SHALL expose `list_categories` and `create_category` tools for managing transaction categories.

#### Scenario: List categories
- **WHEN** user calls `list_categories`
- **THEN** system returns all categories with id, name, icon, color, sortOrder

#### Scenario: Create category
- **WHEN** user calls `create_category` with name, optional icon and color
- **THEN** system creates category and returns the new category object

#### Scenario: Duplicate category name
- **WHEN** user calls `create_category` with existing category name
- **THEN** system returns error indicating name already exists

### Requirement: MCP server allows transaction categorization

The MCP server SHALL expose `update_transaction_category` tool to assign a category to a transaction.

#### Scenario: Assign category to transaction
- **WHEN** user calls `update_transaction_category` with txId and categoryId
- **THEN** system updates transaction's categoryId and returns updated transaction

#### Scenario: Invalid transaction ID
- **WHEN** user calls `update_transaction_category` with non-existent txId
- **THEN** system returns error indicating transaction not found

### Requirement: MCP server provides rule management

The MCP server SHALL expose `list_rules`, `create_rule`, and `apply_rules` tools for classification automation.

#### Scenario: List rules
- **WHEN** user calls `list_rules`
- **THEN** system returns all rules with id, name, pattern, category, priority, enabled status

#### Scenario: Create rule with simple pattern
- **WHEN** user calls `create_rule` with name, pattern "merchant contains 美团", and categoryId
- **THEN** system creates rule and returns the new rule object

#### Scenario: Apply rules to all transactions
- **WHEN** user calls `apply_rules` with no filters
- **THEN** system applies all enabled rules to uncategorized transactions and returns count of matched transactions

#### Scenario: Apply rules in dry-run mode
- **WHEN** user calls `apply_rules` with dryRun=true
- **THEN** system returns preview of matches without updating database

#### Scenario: Apply rules to specific card
- **WHEN** user calls `apply_rules` with cardId filter
- **THEN** system applies rules only to transactions from that card

### Requirement: MCP server provides card synchronization

The MCP server SHALL expose a `sync_card` tool that connects to IMAP and fetches recent daily transaction emails.

#### Scenario: Sync card with user approval
- **WHEN** user calls `sync_card` with cardId
- **THEN** system prompts for user approval with card details
- **THEN** upon approval, system connects to IMAP, fetches emails, parses transactions, and returns count of new/updated transactions

#### Scenario: User denies sync
- **WHEN** user calls `sync_card` and denies approval prompt
- **THEN** system cancels operation and returns cancellation message

#### Scenario: IMAP connection failure
- **WHEN** user approves sync but IMAP credentials are invalid
- **THEN** system returns error with connection details for troubleshooting

### Requirement: Rule pattern syntax supports common operators

The system SHALL parse rule patterns with format "field operator value" where operator is one of: contains, equals, startsWith, endsWith.

#### Scenario: Pattern with contains operator
- **WHEN** rule pattern is "merchant contains 美团"
- **THEN** system matches transactions where merchant field contains "美团"

#### Scenario: Pattern with equals operator
- **WHEN** rule pattern is "merchant equals 美团外卖"
- **THEN** system matches transactions where merchant exactly equals "美团外卖"

#### Scenario: Pattern with startsWith operator
- **WHEN** rule pattern is "merchant startsWith 招商银行"
- **THEN** system matches transactions where merchant starts with "招商银行"

#### Scenario: Invalid pattern syntax
- **WHEN** rule pattern does not match expected format
- **THEN** system returns error explaining pattern syntax

### Requirement: MCP server runs as standalone process

The MCP server SHALL run independently via ts-node or compiled JavaScript, using stdio transport for JSON-RPC communication.

#### Scenario: Start server via ts-node
- **WHEN** user runs `ts-node mcp-server.ts`
- **THEN** server initializes, connects to database, and listens on stdio

#### Scenario: Database connection failure
- **WHEN** server starts but cannot connect to database
- **THEN** server logs error with connection details and exits with non-zero code

#### Scenario: Missing environment variables
- **WHEN** server starts without DATABASE_URL in environment
- **THEN** server logs error indicating missing DATABASE_URL and exits
