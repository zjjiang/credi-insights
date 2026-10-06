#!/usr/bin/env node
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "./src/lib/db.js";
import { runDailyIngest } from "./src/lib/imap/ingest.js";
import { aiTools, getTool, runTool } from "./src/lib/ai-tools.js";

// sync 操作限流（每卡每分钟最多 1 次）
const syncRateLimits = new Map<string, number>();
const SYNC_COOLDOWN_MS = 60_000;

function checkSyncRateLimit(cardId: string): void {
  const now = Date.now();
  const lastSync = syncRateLimits.get(cardId);
  if (lastSync && now - lastSync < SYNC_COOLDOWN_MS) {
    throw new Error(
      `Rate limit: please wait ${Math.ceil((SYNC_COOLDOWN_MS - (now - lastSync)) / 1000)}s before syncing this card again`,
    );
  }
  syncRateLimits.set(cardId, now);
}

// ---------- 启动检查 ----------

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required");
  process.exit(1);
}

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

// ---------- sync_card（MCP 独有：审批提示 + 限流） ----------

async function syncCard(args: Record<string, unknown>) {
  const cardId =
    typeof args.cardId === "string" && args.cardId.trim()
      ? args.cardId.trim()
      : (() => {
          throw new Error("cardId is required");
        })();

  checkSyncRateLimit(cardId);

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
  if (!card) throw new Error(`Card not found: ${cardId}`);
  if (!card.isActive) throw new Error(`Card is inactive: ${cardId}`);

  try {
    const result = await runDailyIngest(cardId);
    return {
      cardId,
      bank: card.bank,
      cardLast4: card.cardLast4,
      newCount: result.inserted,
      skippedCount: result.skipped,
      fetchedEmails: result.fetched,
    };
  } catch (error) {
    // IMAP 错误脱敏，避免泄漏凭证
    const message = error instanceof Error ? error.message : String(error);
    const sanitized = message
      .replace(/pass(word)?[:\s=]+[^\s]+/gi, "pass: [REDACTED]")
      .replace(/auth(entication)?[:\s=]+[^\s]+/i, "auth: [REDACTED]");
    throw new Error(`Sync failed: ${sanitized}`);
  }
}

// ---------- MCP Server ----------

const server = new Server(
  { name: "credi-insights-mcp", version: "1.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      ...aiTools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.parameters,
      })),
      {
        name: "sync_card",
        description: "Sync card transactions from IMAP (requires approval)",
        inputSchema: {
          type: "object" as const,
          properties: {
            cardId: { type: "string", description: "Card ID to sync" },
          },
          required: ["cardId"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result =
      name === "sync_card"
        ? await syncCard(args ?? {})
        : await runTool(name, args ?? {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
});

async function main() {
  await testDatabaseConnection();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("credi-insights MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
