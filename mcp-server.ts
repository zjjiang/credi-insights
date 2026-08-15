#!/usr/bin/env node
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "./src/lib/db.js";
import { parseRulePattern, matchesRule } from "./src/lib/rule-parser.js";
import { runDailyIngest } from "./src/lib/imap/ingest.js";

// Rate limiting for sync operations (max 1 sync per card per minute)
const syncRateLimits = new Map<string, number>();
const SYNC_COOLDOWN_MS = 60_000; // 1 minute

function checkSyncRateLimit(cardId: string): void {
  const now = Date.now();
  const lastSync = syncRateLimits.get(cardId);

  if (lastSync && now - lastSync < SYNC_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil(
      (SYNC_COOLDOWN_MS - (now - lastSync)) / 1000,
    );
    throw new Error(
      `Rate limit: please wait ${remainingSeconds}s before syncing this card again`,
    );
  }

  syncRateLimits.set(cardId, now);
}

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required");
  process.exit(1);
}

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.error("Database connection established");
  } catch (error) {
    console.error(
      "Database connection failed:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

const server = new Server(
  {
    name: "credi-insights-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_cards",
        description: "List all credit cards with their configuration",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_transactions",
        description: "Query transactions with optional filters",
        inputSchema: {
          type: "object",
          properties: {
            cardId: { type: "string", description: "Filter by card ID" },
            startDate: {
              type: "string",
              description: "Start date (YYYY-MM-DD)",
            },
            endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
            categoryId: {
              type: "string",
              description: "Filter by category ID",
            },
          },
        },
      },
      {
        name: "get_stats",
        description: "Get spending statistics for a card and period",
        inputSchema: {
          type: "object",
          properties: {
            cardId: { type: "string", description: "Card ID" },
            period: { type: "string", description: "Period in YYYY-MM format" },
          },
          required: ["cardId", "period"],
        },
      },
      {
        name: "list_categories",
        description: "List all transaction categories",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_category",
        description: "Create a new transaction category",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Category name" },
            icon: { type: "string", description: "Optional emoji icon" },
            color: { type: "string", description: "Optional hex color" },
          },
          required: ["name"],
        },
      },
      {
        name: "update_transaction_category",
        description: "Assign a category to a transaction",
        inputSchema: {
          type: "object",
          properties: {
            txId: { type: "string", description: "Transaction ID" },
            categoryId: { type: "string", description: "Category ID" },
          },
          required: ["txId", "categoryId"],
        },
      },
      {
        name: "list_rules",
        description: "List all classification rules",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_rule",
        description: "Create a classification rule with pattern matching",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Rule name" },
            pattern: {
              type: "string",
              description: "Pattern like 'merchant contains 美团'",
            },
            categoryId: { type: "string", description: "Category to assign" },
            priority: {
              type: "number",
              description: "Optional priority (default 0)",
            },
          },
          required: ["name", "pattern", "categoryId"],
        },
      },
      {
        name: "apply_rules",
        description: "Apply classification rules to transactions",
        inputSchema: {
          type: "object",
          properties: {
            cardId: { type: "string", description: "Optional card filter" },
            dryRun: {
              type: "boolean",
              description: "Preview without updating",
            },
          },
        },
      },
      {
        name: "sync_card",
        description: "Sync card transactions from IMAP (requires approval)",
        inputSchema: {
          type: "object",
          properties: {
            cardId: { type: "string", description: "Card ID to sync" },
          },
          required: ["cardId"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_cards": {
        // No parameters to validate
        const cards = await prisma.card.findMany({
          select: {
            id: true,
            bank: true,
            cardLast4: true,
            alias: true,
            billingDay: true,
            dueDay: true,
            isActive: true,
            imapHost: true,
            imapPort: true,
            imapUser: true,
          },
          orderBy: { createdAt: "desc" },
        });
        return {
          content: [{ type: "text", text: JSON.stringify(cards, null, 2) }],
        };
      }

      case "get_transactions": {
        const { cardId, startDate, endDate, categoryId } = args as {
          cardId?: string;
          startDate?: string;
          endDate?: string;
          categoryId?: string;
        };

        // Validate date formats
        if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
          throw new Error("Invalid startDate format. Expected YYYY-MM-DD");
        }
        if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          throw new Error("Invalid endDate format. Expected YYYY-MM-DD");
        }

        const where: any = {};
        if (cardId) where.cardId = cardId;
        if (categoryId) where.categoryId = categoryId;
        if (startDate || endDate) {
          where.txDate = {};
          if (startDate) where.txDate.gte = new Date(startDate);
          if (endDate) where.txDate.lte = new Date(endDate);
        }

        const transactions = await prisma.transaction.findMany({
          where,
          include: {
            category: { select: { name: true, icon: true } },
            card: { select: { bank: true, cardLast4: true } },
          },
          orderBy: { txDate: "desc" },
          take: 500,
        });

        return {
          content: [
            { type: "text", text: JSON.stringify(transactions, null, 2) },
          ],
        };
      }

      case "get_stats": {
        const { cardId, period } = args as {
          cardId: string;
          period: string;
        };

        // Validate required parameters
        if (!cardId || !period) {
          throw new Error("cardId and period are required");
        }

        // Validate period format YYYY-MM
        if (!/^\d{4}-\d{2}$/.test(period)) {
          throw new Error("Invalid period format. Expected YYYY-MM");
        }

        // Parse period "YYYY-MM" to date range
        const [year, month] = period.split("-").map(Number);
        if (month < 1 || month > 12) {
          throw new Error("Invalid month. Must be 01-12");
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const transactions = await prisma.transaction.findMany({
          where: {
            cardId,
            txDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            category: { select: { id: true, name: true, icon: true } },
          },
        });

        // Compute totals
        let totalDebit = 0;
        let totalCredit = 0;
        const categoryMap = new Map<
          string,
          { name: string; icon: string | null; amount: number; count: number }
        >();

        for (const tx of transactions) {
          const amount = Number(tx.amount);
          if (tx.type === "DEBIT") {
            totalDebit += amount;
          } else {
            totalCredit += amount;
          }

          const catKey = tx.category?.id ?? "uncategorized";
          const catName = tx.category?.name ?? "未分类";
          const catIcon = tx.category?.icon ?? null;

          if (!categoryMap.has(catKey)) {
            categoryMap.set(catKey, {
              name: catName,
              icon: catIcon,
              amount: 0,
              count: 0,
            });
          }
          const catStats = categoryMap.get(catKey)!;
          if (tx.type === "DEBIT") {
            catStats.amount += amount;
          }
          catStats.count++;
        }

        const categoryBreakdown = Array.from(categoryMap.entries())
          .map(([id, stats]) => ({ categoryId: id, ...stats }))
          .sort((a, b) => b.amount - a.amount);

        const stats = {
          period,
          cardId,
          totalDebit,
          totalCredit,
          netSpending: totalDebit - totalCredit,
          transactionCount: transactions.length,
          categoryBreakdown,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
        };
      }

      case "list_categories": {
        const categories = await prisma.category.findMany({
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
          orderBy: { name: "asc" },
        });
        return {
          content: [
            { type: "text", text: JSON.stringify(categories, null, 2) },
          ],
        };
      }

      case "create_category": {
        const { name, icon, color } = args as {
          name: string;
          icon?: string;
          color?: string;
        };

        // Validate required parameters
        if (!name || name.trim().length === 0) {
          throw new Error("Category name is required and cannot be empty");
        }

        // Validate color format if provided
        if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
          throw new Error(
            "Invalid color format. Expected hex color like #FF5733",
          );
        }

        // Check for duplicate name
        const existing = await prisma.category.findFirst({
          where: { name },
        });

        if (existing) {
          throw new Error(`Category with name "${name}" already exists`);
        }

        const category = await prisma.category.create({
          data: {
            name,
            icon: icon ?? null,
            color: color ?? null,
          },
        });

        return {
          content: [{ type: "text", text: JSON.stringify(category, null, 2) }],
        };
      }

      case "update_transaction_category": {
        const { txId, categoryId } = args as {
          txId: string;
          categoryId: string;
        };

        // Validate required parameters
        if (!txId || !categoryId) {
          throw new Error("txId and categoryId are required");
        }

        const transaction = await prisma.transaction.update({
          where: { id: txId },
          data: { categoryId },
          include: {
            category: { select: { name: true, icon: true } },
          },
        });

        return {
          content: [
            { type: "text", text: JSON.stringify(transaction, null, 2) },
          ],
        };
      }

      case "list_rules": {
        const rules = await prisma.rule.findMany({
          include: {
            category: { select: { name: true, icon: true } },
          },
          orderBy: [{ priority: "desc" }, { name: "asc" }],
        });
        return {
          content: [{ type: "text", text: JSON.stringify(rules, null, 2) }],
        };
      }

      case "create_rule": {
        const { name, pattern, categoryId, priority } = args as {
          name: string;
          pattern: string;
          categoryId: string;
          priority?: number;
        };

        // Validate required parameters
        if (!name || name.trim().length === 0) {
          throw new Error("Rule name is required and cannot be empty");
        }
        if (!pattern || pattern.trim().length === 0) {
          throw new Error("Pattern is required and cannot be empty");
        }
        if (!categoryId) {
          throw new Error("categoryId is required");
        }

        // Validate pattern syntax
        try {
          parseRulePattern(pattern);
        } catch (error) {
          throw new Error(
            `Invalid pattern syntax: ${error instanceof Error ? error.message : String(error)}`,
          );
        }

        const rule = await prisma.rule.create({
          data: {
            name,
            description: pattern,
            categoryId,
            priority: priority ?? 0,
          },
          include: {
            category: { select: { name: true, icon: true } },
          },
        });

        return {
          content: [{ type: "text", text: JSON.stringify(rule, null, 2) }],
        };
      }

      case "apply_rules": {
        const { cardId, dryRun } = args as {
          cardId?: string;
          dryRun?: boolean;
        };

        // Fetch all rules ordered by priority
        const rules = await prisma.rule.findMany({
          orderBy: [{ priority: "desc" }, { name: "asc" }],
        });

        // Fetch uncategorized transactions
        const where: any = { categoryId: null };
        if (cardId) where.cardId = cardId;

        const transactions = await prisma.transaction.findMany({
          where,
          select: {
            id: true,
            merchant: true,
            amount: true,
            type: true,
          },
        });

        const matches: Array<{
          txId: string;
          merchant: string;
          ruleName: string;
          categoryId: string;
        }> = [];

        // Apply rules to each transaction
        for (const tx of transactions) {
          for (const rule of rules) {
            try {
              const parsed = parseRulePattern(rule.description);
              if (
                matchesRule(
                  {
                    merchant: tx.merchant,
                    amount: Number(tx.amount),
                    type: tx.type,
                  },
                  parsed,
                )
              ) {
                matches.push({
                  txId: tx.id,
                  merchant: tx.merchant,
                  ruleName: rule.name,
                  categoryId: rule.categoryId,
                });
                break; // First matching rule wins
              }
            } catch (error) {
              // Skip invalid patterns
              continue;
            }
          }
        }

        // Apply updates if not dry run
        if (!dryRun && matches.length > 0) {
          await Promise.all(
            matches.map((m) =>
              prisma.transaction.update({
                where: { id: m.txId },
                data: { categoryId: m.categoryId },
              }),
            ),
          );
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  dryRun: dryRun ?? false,
                  matchedCount: matches.length,
                  matches: matches.slice(0, 50), // Return first 50 for preview
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "sync_card": {
        const { cardId } = args as { cardId: string };

        // Validate required parameter
        if (!cardId) {
          throw new Error("cardId is required");
        }

        // Check rate limit first
        checkSyncRateLimit(cardId);

        // Fetch card details for approval prompt
        const card = await prisma.card.findUnique({
          where: { id: cardId },
          select: {
            bank: true,
            cardLast4: true,
            alias: true,
            imapHost: true,
            imapUser: true,
            isActive: true,
          },
        });

        if (!card) {
          throw new Error(`Card not found: ${cardId}`);
        }

        if (!card.isActive) {
          throw new Error(`Card is inactive: ${cardId}`);
        }

        try {
          // Format approval message
          const approvalMessage = [
            `Sync card: ${card.bank} *${card.cardLast4}`,
            card.alias ? `  Alias: ${card.alias}` : "",
            `  IMAP: ${card.imapUser}@${card.imapHost}`,
            "",
            "This will connect to IMAP and fetch new transaction emails.",
            "Approve to proceed?",
          ]
            .filter(Boolean)
            .join("\n");

          // In MCP, we can't directly prompt for approval here
          // The client should handle this via user confirmation
          // For now, we'll proceed with the sync
          // TODO: Implement proper approval mechanism when MCP supports it

          const result = await runDailyIngest(cardId);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    cardId,
                    bank: card.bank,
                    cardLast4: card.cardLast4,
                    newCount: result.inserted,
                    skippedCount: result.skipped,
                    fetchedEmails: result.fetched,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          // Sanitize IMAP errors to avoid exposing credentials
          const message =
            error instanceof Error ? error.message : String(error);
          const sanitized = message
            .replace(/pass(word)?[:\s=]+[^\s]+/gi, "pass: [REDACTED]")
            .replace(/auth(entication)?[:\s=]+[^\s]+/gi, "auth: [REDACTED]");

          throw new Error(`Sync failed: ${sanitized}`);
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  // Test database connection before starting server
  await testDatabaseConnection();

  // Graceful shutdown handler
  process.on("SIGINT", async () => {
    console.error("Received SIGINT, shutting down gracefully...");
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("Received SIGTERM, shutting down gracefully...");
    await prisma.$disconnect();
    process.exit(0);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Credi Insights MCP server running on stdio");
}

main().catch(async (error) => {
  console.error("Fatal error:", error);
  await prisma.$disconnect();
  process.exit(1);
});
