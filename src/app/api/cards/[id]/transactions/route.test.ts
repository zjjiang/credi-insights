import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "./route";

vi.mock("@/lib/db", () => ({
  prisma: {
    card: {
      findUnique: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
    },
  },
}));

function makeRequest(cardId: string, query = "") {
  return {
    req: new Request(
      `http://localhost/api/cards/${cardId}/transactions${query}`,
    ),
    ctx: { params: Promise.resolve({ id: cardId }) },
  };
}

describe("GET /api/cards/[id]/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: "card-1",
    } as never);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
  });

  it("不传 since 时行为与现状一致：只按窗口过滤，不加 OR 兜底", async () => {
    const { req, ctx } = makeRequest("card-1");
    await GET(req, ctx);

    const call = vi.mocked(prisma.transaction.findMany).mock.calls[0][0];
    expect(call?.where).toEqual({
      cardId: "card-1",
      txDate: expect.any(Object),
    });
    expect(call?.where).not.toHaveProperty("OR");
  });

  it("传 since 时，用 OR 同时保留晚于 since 的交易和未关联账单的孤儿交易", async () => {
    // since 必须落在窗口内（晚于窗口起点）才会生效——过早的 since 会被
    // 「只收紧不放宽」守卫忽略（见下一条用例）。这里用 now-10d 保证在窗口内。
    const since = new Date(Date.now() - 10 * 86400_000)
      .toISOString()
      .slice(0, 10);
    const { req, ctx } = makeRequest("card-1", `?since=${since}&days=45`);
    await GET(req, ctx);

    const call = vi.mocked(prisma.transaction.findMany).mock.calls[0][0];
    expect(call?.where).toMatchObject({
      cardId: "card-1",
      OR: [
        // txDate 分支保持既有窗口上限（lt endExclusive），孤儿分支不设日期限制
        {
          txDate: {
            gt: new Date(`${since}T00:00:00`),
            lt: expect.any(Date),
          },
        },
        { uploadId: null },
      ],
    });
  });

  it("since 早于窗口自身起点时，不放宽窗口，退回窗口起点", async () => {
    // 用一个极早的 since，只验证「未回退到 gt 语义」——具体窗口起点数值
    // 由 days/before 既有换算逻辑决定（不在本次改动范围内，不重复断言其时区细节）
    const { req, ctx } = makeRequest(
      "card-1",
      "?since=2020-01-01&days=3&before=2026-08-15",
    );
    await GET(req, ctx);

    const call = vi.mocked(prisma.transaction.findMany).mock.calls[0][0];
    const orClause = (
      call?.where as { OR: Array<{ txDate?: { gt?: Date; gte?: Date } }> }
    ).OR;
    const txDateFilter = orClause.find((c) => c.txDate)?.txDate;
    expect(txDateFilter?.gte).toBeInstanceOf(Date);
    expect(txDateFilter?.gt).toBeUndefined();
  });

  it("卡片不存在时返回 404", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);
    const { req, ctx } = makeRequest("missing-card");
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });
});
