// 共享 AI 工具注册表：MCP server 与应用内 AI 助手共用的单一实现源
// 每个工具 = { name, description, parameters(JSON Schema), run(input) }
import { prisma } from "@/lib/db";
import { parseRulePattern, matchesRule } from "@/lib/rule-parser";

export interface AiTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  run: (input: Record<string, unknown>) => Promise<unknown>;
}

// ---------- 校验辅助 ----------

function requireString(
  input: Record<string, unknown>,
  field: string,
  label?: string,
): string {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`参数 ${label ?? field} 为必填项`);
  }
  return value.trim();
}

function monthRange(month: string): { gte: Date; lt: Date } {
  const [y, m] = month.split("-").map(Number);
  return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
}

// ---------- 工具定义 ----------

const listCards: AiTool = {
  name: "list_cards",
  description: "查询所有信用卡卡片列表，含卡号尾号、账单日、当前状态",
  parameters: { type: "object", properties: {} },
  run: async () => {
    const cards = await prisma.card.findMany({
      orderBy: { createdAt: "asc" },
    });
    return cards.map((c) => ({
      id: c.id,
      bank: c.bank,
      cardLast4: c.cardLast4,
      alias: c.alias,
      isActive: c.isActive,
    }));
  },
};

const getTransactions: AiTool = {
  name: "get_transactions",
  description: "查询交易明细，支持按月份、商户关键词、收支类型过滤",
  parameters: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "卡片ID（可选）" },
      month: { type: "string", description: "YYYY-MM 格式（可选）" },
      merchantContains: { type: "string", description: "商户关键词（可选）" },
      type: {
        type: "string",
        enum: ["DEBIT", "CREDIT"],
        description: "收支类型（可选）",
      },
      limit: { type: "number", description: "返回条数上限，默认 50" },
    },
  },
  run: async (input) => {
    const where: Record<string, unknown> = {};
    if (input.cardId) where.cardId = input.cardId;
    if (input.month) where.txDate = monthRange(input.month as string);
    if (input.merchantContains)
      where.merchant = { contains: input.merchantContains as string };
    if (input.type) where.type = input.type;

    const txs = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { txDate: "desc" },
      take: (input.limit as number) ?? 50,
    });
    return txs.map((t) => ({
      id: t.id,
      date: t.txDate.toISOString().slice(0, 10),
      merchant: t.merchant,
      amount: Number(t.amount),
      type: t.type,
      category: t.category?.name ?? "未分类",
    }));
  },
};

const getStats: AiTool = {
  name: "get_stats",
  description: "统计某张卡某个月的收支总额与分类分布",
  parameters: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "卡片ID" },
      period: { type: "string", description: "YYYY-MM 格式" },
    },
    required: ["cardId", "period"],
  },
  run: async (input) => {
    const cardId = requireString(input, "cardId");
    const period = requireString(input, "period");
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new Error("period 格式应为 YYYY-MM");
    }

    const [year, month] = period.split("-").map(Number);
    if (month < 1 || month > 12) {
      throw new Error("month 应为 01-12");
    }
    const txs = await prisma.transaction.findMany({
      where: {
        cardId,
        txDate: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
      include: { category: { select: { id: true, name: true, icon: true } } },
    });

    let totalDebit = 0;
    let totalCredit = 0;
    const byCategory = new Map<
      string,
      { name: string; amount: number; count: number }
    >();
    for (const tx of txs) {
      const amount = Number(tx.amount);
      if (tx.type === "DEBIT") totalDebit += amount;
      else totalCredit += amount;
      const key = tx.category?.id ?? "uncategorized";
      const entry = byCategory.get(key) ?? {
        name: tx.category?.name ?? "未分类",
        amount: 0,
        count: 0,
      };
      byCategory.set(key, {
        name: entry.name,
        amount: entry.amount + amount,
        count: entry.count + 1,
      });
    }
    return {
      period,
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      byCategory: [...byCategory.values()].map((c) => ({
        ...c,
        amount: Number(c.amount.toFixed(2)),
      })),
    };
  },
};

const listCategories: AiTool = {
  name: "list_categories",
  description: "查询所有可用分类列表，用于创建规则或分配分类前获取 categoryId",
  parameters: { type: "object", properties: {} },
  run: async () => {
    const cats = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return cats.map((c) => ({ id: c.id, name: c.name, icon: c.icon }));
  },
};

const createCategory: AiTool = {
  name: "create_category",
  description:
    "创建新的消费分类（如宠物、育儿）。创建前先用 list_categories 检查是否已存在",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "分类名称" },
      icon: { type: "string", description: "emoji 图标（可选）" },
      color: { type: "string", description: "#RRGGBB 十六进制颜色（可选）" },
    },
    required: ["name"],
  },
  run: async (input) => {
    const name = requireString(input, "name", "分类名称");
    const color = input.color as string | undefined;
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new Error("color 格式应为 #RRGGBB");
    }

    const existing = await prisma.category.findFirst({ where: { name } });
    if (existing) {
      throw new Error(`分类「${name}」已存在，可直接使用其 categoryId`);
    }

    return prisma.category.create({
      data: {
        name,
        icon: (input.icon as string) ?? null,
        color: color ?? null,
      },
    });
  },
};

const listRules: AiTool = {
  name: "list_rules",
  description: "查询全部分类规则（含目标分类与优先级），用于创建规则前后查证",
  parameters: { type: "object", properties: {} },
  run: async () => {
    const rules = await prisma.rule.findMany({
      include: { category: { select: { name: true, icon: true } } },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
    });
    return rules.map((r) => ({
      id: r.id,
      name: r.name,
      pattern: r.description,
      category: r.category.name,
      priority: r.priority,
      enabled: r.enabled,
    }));
  },
};

const createRule: AiTool = {
  name: "create_rule",
  description:
    '创建分类规则。pattern 格式为 "字段 操作 值"，如 "merchant contains 美团"、"amount > 1000"。创建前先用 list_categories 获取 categoryId',
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "规则名称" },
      pattern: {
        type: "string",
        description: '"merchant contains X" 等规则表达式',
      },
      categoryId: { type: "string", description: "目标分类ID" },
      priority: {
        type: "number",
        description: "优先级，数字越大越先匹配，默认 0",
      },
    },
    required: ["name", "pattern", "categoryId"],
  },
  run: async (input) => {
    const name = requireString(input, "name", "规则名称");
    const pattern = requireString(input, "pattern", "pattern");
    const categoryId = requireString(input, "categoryId");

    try {
      parseRulePattern(pattern);
    } catch (error) {
      throw new Error(
        `pattern 语法错误：${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return prisma.rule.create({
      data: {
        name,
        description: pattern,
        categoryId,
        priority: (input.priority as number) ?? 0,
      },
      include: { category: { select: { name: true, icon: true } } },
    });
  },
};

const updateTransactionCategory: AiTool = {
  name: "update_transaction_category",
  description: "修改单笔交易的分类",
  parameters: {
    type: "object",
    properties: {
      txId: { type: "string", description: "交易ID" },
      categoryId: { type: "string", description: "目标分类ID" },
    },
    required: ["txId", "categoryId"],
  },
  run: async (input) => {
    const txId = requireString(input, "txId");
    const categoryId = requireString(input, "categoryId");

    return prisma.transaction.update({
      where: { id: txId },
      data: { categoryId },
      include: { category: { select: { name: true, icon: true } } },
    });
  },
};

const bulkUpdateCategory: AiTool = {
  name: "bulk_update_category",
  description: "按条件批量修改交易分类",
  parameters: {
    type: "object",
    properties: {
      filter: {
        type: "object",
        properties: {
          merchantContains: { type: "string" },
          month: { type: "string", description: "YYYY-MM" },
          categoryId: { type: "string", description: "筛选当前分类" },
        },
      },
      update: {
        type: "object",
        properties: {
          categoryId: { type: "string" },
          purpose: { type: "string" },
        },
      },
    },
    required: ["filter", "update"],
  },
  run: async (input) => {
    const filter = input.filter as Record<string, unknown> | undefined;
    const update = input.update as Record<string, unknown> | undefined;
    if (
      !filter ||
      !update ||
      typeof filter !== "object" ||
      typeof update !== "object"
    ) {
      throw new Error("参数 filter 和 update 为必填项");
    }

    const where: Record<string, unknown> = {};
    if (filter.merchantContains)
      where.merchant = { contains: filter.merchantContains as string };
    if (filter.month) where.txDate = monthRange(filter.month as string);
    if (filter.categoryId) where.categoryId = filter.categoryId;

    const data: Record<string, unknown> = {};
    if (update.categoryId !== undefined) data.categoryId = update.categoryId;
    if (update.purpose !== undefined) data.purpose = update.purpose;

    const result = await prisma.transaction.updateMany({ where, data });
    return { affected: result.count };
  },
};

const applyRules: AiTool = {
  name: "apply_rules",
  description:
    "对未分类交易批量应用分类规则。dryRun=true 时只返回将命中的匹配不写库",
  parameters: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "限定卡片（可选）" },
      dryRun: { type: "boolean", description: "试运行，默认 false" },
    },
  },
  run: async (input) => {
    const rules = await prisma.rule.findMany({
      orderBy: [{ priority: "desc" }, { name: "asc" }],
    });

    const where: Record<string, unknown> = { categoryId: null };
    if (input.cardId) where.cardId = input.cardId;

    const transactions = await prisma.transaction.findMany({
      where,
      select: { id: true, merchant: true, amount: true, type: true },
    });

    const matches: Array<{
      txId: string;
      merchant: string;
      ruleName: string;
      categoryId: string;
    }> = [];

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
            break; // 首条命中规则生效
          }
        } catch {
          continue; // 无效 pattern 的规则跳过
        }
      }
    }

    if (input.dryRun) {
      return {
        matched: matches.length,
        updated: 0,
        matches: matches.slice(0, 20),
      };
    }

    await Promise.all(
      matches.map((m) =>
        prisma.transaction.update({
          where: { id: m.txId },
          data: { categoryId: m.categoryId },
        }),
      ),
    );
    return { matched: matches.length, updated: matches.length };
  },
};

// ---------- 注册表 ----------

export const aiTools: AiTool[] = [
  listCards,
  getTransactions,
  getStats,
  listCategories,
  createCategory,
  listRules,
  createRule,
  updateTransactionCategory,
  bulkUpdateCategory,
  applyRules,
];

export function getTool(name: string): AiTool | undefined {
  return aiTools.find((t) => t.name === name);
}

export async function runTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const tool = getTool(name);
  if (!tool) throw new Error(`未知工具：${name}`);
  return tool.run(input);
}
