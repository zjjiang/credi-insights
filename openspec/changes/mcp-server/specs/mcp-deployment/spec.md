## ADDED Requirements

### Requirement: Deployment documentation provides Claude Desktop configuration

The deployment documentation SHALL include complete Claude Desktop configuration with MCP server registration in claude_desktop_config.json.

#### Scenario: Configure MCP server in Claude Desktop
- **WHEN** user follows configuration steps
- **THEN** documentation provides exact JSON structure for mcpServers section with command and args

#### Scenario: Configure environment variables
- **WHEN** MCP server requires DATABASE_URL
- **THEN** documentation explains how to pass environment variables through Claude Desktop config

### Requirement: Deployment documentation provides startup instructions

The deployment documentation SHALL include instructions for starting the MCP server via ts-node or compiled JavaScript.

#### Scenario: Start via ts-node for development
- **WHEN** user wants to test MCP server during development
- **THEN** documentation provides command to run with ts-node and hot reload

#### Scenario: Start via compiled JavaScript for production
- **WHEN** user wants stable production deployment
- **THEN** documentation provides commands to compile TypeScript and run compiled output

### Requirement: Deployment documentation provides testing procedures

The deployment documentation SHALL include procedures to verify MCP server tools are accessible from Claude Desktop.

#### Scenario: Test basic connectivity
- **WHEN** MCP server is configured in Claude Desktop
- **THEN** documentation provides sample prompts to verify tool discovery and execution

#### Scenario: Test transaction queries
- **WHEN** user wants to verify data access
- **THEN** documentation provides example prompt to list cards and query transactions

### Requirement: Deployment documentation provides troubleshooting guide

The deployment documentation SHALL include common failure scenarios and resolution steps.

#### Scenario: MCP server not appearing in Claude Desktop
- **WHEN** server is configured but not showing in tools list
- **THEN** documentation provides checklist: config syntax, file paths, server startup errors

#### Scenario: Database connection failures
- **WHEN** MCP server cannot connect to MySQL
- **THEN** documentation provides steps to verify DATABASE_URL, network access, and credentials

#### Scenario: IMAP sync failures
- **WHEN** sync_card tool returns connection errors
- **THEN** documentation provides debugging steps for IMAP credentials and network connectivity

### Requirement: Deployment documentation explains security considerations

The deployment documentation SHALL warn about IMAP credentials and database access in local-only deployment context.

#### Scenario: Local-only deployment security
- **WHEN** user deploys MCP server for personal use
- **THEN** documentation explains that server has direct database and IMAP access, suitable for local trusted use only

#### Scenario: No remote deployment guidance
- **WHEN** user considers exposing MCP server remotely
- **THEN** documentation explicitly states this is a local-only tool and warns against remote exposure without authentication
