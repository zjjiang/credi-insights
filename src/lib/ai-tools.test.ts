import { describe, it, expect, beforeEach, vi } from "vitest";
import { aiTools, getTool, runTool } from "./ai-tools";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    card: { findMany: vi.fn() },
    category: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    rule: { findMany: vi.fn(), create: vi.fn() },
    transaction: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const SHARED_TOOL_NAMES = [
  "list_cards",
  "get_transactions",
  "get_stats",
  "list_categories",
  "create_category",
  "list_rules",
  "create_rule",
  "update_transaction_category",
  "bulk_update_category",
  "apply_rules",
];

describe("aiTools 注册表", () => {
  it("包含全部 10 个共享工具，sync_card 不在其中", () => {
    expect(aiTools.map((t) => t.name).sort()).toEqual(
      [...SHARED_TOOL_NAMES].sort(),
    );
  });

  it("每个工具都有 description、parameters 和 run", () => {
    for (const tool of aiTools) {
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.parameters).toMatchObject({ type: "object" });
      expect(typeof tool.run).toBe("function");
    }
  });

  it("getTool 按名称查找，未知工具返回 undefined", () => {
    expect(getTool("create_category")?.name).toBe("create_category");
    expect(getTool("nope")).toBeUndefined();
  });
});

describe("create_category", () => {
  beforeEach(() => vi.clearAllMocks());

  it("创建成功返回新分类", async () => {
    mocked(prisma.category.findFirst).mockResolvedValue(null);
    mocked(prisma.category.create).mockResolvedValue({
      id: "cat-1",
      name: "宠物",
      icon: "🐱",
      color: null,
    });

    const result = (await runTool("create_category", {
      name: "宠物",
      icon: "🐱",
    })) as { id: string };

    expect(result.id).toBe("cat-1");
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: "宠物", icon: "🐱", color: null },
    });
  });

  it("重名分类被拒绝", async () => {
    mocked(prisma.category.findFirst).mockResolvedValue({
      id: "cat-old",
      name: "宠物",
    });

    await expect(runTool("create_category", { name: "宠物" })).rejects.toThrow(
      /已存在/,
    );
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it("空名称被拒绝", async () => {
    await expect(runTool("create_category", { name: "  " })).rejects.toThrow(
      /名称/,
    );
  });
});

describe("create_rule", () => {
  beforeEach(() => vi.clearAllMocks());

  it("用 pattern 创建规则并校验语法", async () => {
    mocked(prisma.rule.create).mockResolvedValue({
      id: "rule-1",
      name: "美团→餐饮",
      description: "merchant contains 美团",
      category: { name: "餐饮", icon: "🍜" },
    });

    const result = (await runTool("create_rule", {
      name: "美团→餐饮",
      pattern: "merchant contains 美团",
      categoryId: "cat-food",
    })) as { id: string };

    expect(result.id).toBe("rule-1");
    expect(prisma.rule.create).toHaveBeenCalledWith({
      data: {
        name: "美团→餐饮",
        description: "merchant contains 美团",
        categoryId: "cat-food",
        priority: 0,
      },
      include: { category: { select: { name: true, icon: true } } },
    });
  });

  it("非法 pattern 语法被拒绝", async () => {
    await expect(
      runTool("create_rule", {
        name: "坏规则",
        pattern: "merchant explode 美团",
        categoryId: "cat-food",
      }),
    ).rejects.toThrow(/pattern|Invalid/i);
    expect(prisma.rule.create).not.toHaveBeenCalled();
  });

  it("缺 categoryId 被拒绝", async () => {
    await expect(
      runTool("create_rule", {
        name: "无分类",
        pattern: "merchant contains X",
      }),
    ).rejects.toThrow(/categoryId/);
  });
});

describe("apply_rules", () => {
  beforeEach(() => vi.clearAllMocks());

  const rules = [
    {
      id: "rule-1",
      name: "美团→餐饮",
      description: "merchant contains 美团",
      categoryId: "cat-food",
      priority: 10,
    },
  ];
  const txs = [
    { id: "tx-1", merchant: "财付通-美团", amount: 35, type: "DEBIT" },
    { id: "tx-2", merchant: "支付宝-打车", amount: 20, type: "DEBIT" },
  ];

  it("dryRun 返回匹配列表且不写库", async () => {
    mocked(prisma.rule.findMany).mockResolvedValue(rules);
    mocked(prisma.transaction.findMany).mockResolvedValue(txs);

    const result = (await runTool("apply_rules", {
      dryRun: true,
    })) as { matched: number; updated: number };

    expect(result.matched).toBe(1);
    expect(result.updated).toBe(0);
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it("live 模式更新命中交易的分类", async () => {
    mocked(prisma.rule.findMany).mockResolvedValue(rules);
    mocked(prisma.transaction.findMany).mockResolvedValue(txs);
    mocked(prisma.transaction.update).mockResolvedValue({ id: "tx-1" });

    const result = (await runTool("apply_rules", {})) as {
      matched: number;
      updated: number;
    };

    expect(result.updated).toBe(1);
    expect(prisma.transaction.update).toHaveBeenCalledWith({
      where: { id: "tx-1" },
      data: { categoryId: "cat-food" },
    });
  });

  it("无效 pattern 的规则被跳过不报错", async () => {
    mocked(prisma.rule.findMany).mockResolvedValue([
      { ...rules[0], description: "merchant explode X" },
    ]);
    mocked(prisma.transaction.findMany).mockResolvedValue(txs);

    const result = (await runTool("apply_rules", { dryRun: true })) as {
      matched: number;
    };

    expect(result.matched).toBe(0);
  });
});

describe("update_transaction_category", () => {
  beforeEach(() => vi.clearAllMocks());

  it("缺字段被拒绝", async () => {
    await expect(
      runTool("update_transaction_category", { txId: "tx-1" }),
    ).rejects.toThrow(/txId|categoryId/);
  });

  it("成功更新并带出分类信息", async () => {
    mocked(prisma.transaction.update).mockResolvedValue({
      id: "tx-1",
      category: { name: "餐饮", icon: "🍜" },
    });

    const result = (await runTool("update_transaction_category", {
      txId: "tx-1",
      categoryId: "cat-food",
    })) as { id: string };

    expect(result.id).toBe("tx-1");
  });
});

describe("bulk_update_category", () => {
  beforeEach(() => vi.clearAllMocks());

  it("按商户过滤批量更新并返回计数", async () => {
    mocked(prisma.transaction.updateMany).mockResolvedValue({ count: 7 });

    const result = (await runTool("bulk_update_category", {
      filter: { merchantContains: "美团" },
      update: { categoryId: "cat-food" },
    })) as { affected: number };

    expect(result.affected).toBe(7);
    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { merchant: { contains: "美团" } },
      data: { categoryId: "cat-food" },
    });
  });

  it("filter 和 update 都必填", async () => {
    await expect(
      runTool("bulk_update_category", { filter: {} }),
    ).rejects.toThrow(/filter|update/);
  });
});

describe("查询类工具", () => {
  beforeEach(() => vi.clearAllMocks());

  it("list_cards 返回卡片列表", async () => {
    mocked(prisma.card.findMany).mockResolvedValue([
      { id: "card-1", bank: "招商银行", cardLast4: "0094", alias: "主卡" },
    ]);

    const result = (await runTool("list_cards", {})) as unknown[];
    expect(result).toHaveLength(1);
  });

  it("get_stats 校验 period 格式", async () => {
    await expect(
      runTool("get_stats", { cardId: "card-1", period: "2026-13" }),
    ).rejects.toThrow(/period|month|YYYY-MM/i);
  });

  it("get_transactions 缺少任何条件时默认限 50 条", async () => {
    mocked(prisma.transaction.findMany).mockResolvedValue([]);
    await runTool("get_transactions", {});
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });
});
