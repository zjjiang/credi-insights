import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { POST, GET } from "./route";

vi.mock("@/lib/db", () => ({
  prisma: {
    card: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    transaction: {
      aggregate: vi.fn(),
    },
  },
}));

describe("POST /api/cards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("创建卡片成功", async () => {
    const mockCard = {
      id: "card-1",
      bank: "招商银行",
      cardLast4: "1234",
      alias: "主卡",
      billingDay: 28,
      dueDay: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      imapHost: "imap.qq.com",
      imapPort: 993,
      imapUser: "test@qq.com",
      imapPassword: "secret",
      imapSubject: "每日信用管家",
    };

    // Mock findUnique to return null (no existing card)
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.card.create).mockResolvedValue(mockCard);

    const req = new Request("http://localhost/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bank: "招商银行",
        cardLast4: "1234",
        alias: "主卡",
        billingDay: 28,
        dueDay: 10,
        imapHost: "imap.qq.com",
        imapPort: 993,
        imapUser: "test@qq.com",
        imapPassword: "secret",
        imapSubject: "每日信用管家",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.cardId).toBe("card-1");
  });

  it("缺少必填字段返回 400", async () => {
    const req = new Request("http://localhost/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bank: "招商银行", cardLast4: "1234" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });
});

describe("GET /api/cards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("列出所有激活卡片", async () => {
    const mockCards = [
      {
        id: "card-1",
        bank: "招商银行",
        cardLast4: "1234",
        alias: "主卡",
        billingDay: 28,
        dueDay: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        imapHost: "imap.qq.com",
        imapPort: 993,
        imapUser: "test@qq.com",
        imapPassword: "secret",
        imapSubject: "每日信用管家",
        transactions: [{ createdAt: new Date("2026-08-11") }],
      },
    ];

    vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards);
    // Mock aggregate to return monthly total
    vi.mocked(prisma.transaction.aggregate).mockResolvedValue({
      _sum: { amount: 1000 },
      _count: null,
      _avg: null,
      _min: null,
      _max: null,
    });

    const res = await GET();
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.cards).toHaveLength(1);
    expect(json.data.cards[0].id).toBe("card-1");
  });
});
