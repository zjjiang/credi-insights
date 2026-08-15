import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "./route";

vi.mock("@/lib/db", () => ({
  prisma: {
    card: {
      findUnique: vi.fn(),
    },
    upload: {
      findMany: vi.fn(),
    },
  },
}));

function makeRequest(cardId: string) {
  return {
    params: Promise.resolve({ id: cardId }),
  };
}

describe("GET /api/cards/[id]/uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("按账期倒序返回该卡的账单列表", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({ id: "card-1" } as never);

    const mockUploads = [
      {
        id: "upload-2",
        originalName: "bill_202408.msg",
        imageMonth: "2026-08",
        billingStart: new Date("2026-07-18"),
        billingEnd: new Date("2026-08-17"),
        dueDate: new Date("2026-09-08"),
        status: "DONE",
        txCount: 42,
        createdAt: new Date("2026-08-11"),
      },
      {
        id: "upload-1",
        originalName: "bill_202407.msg",
        imageMonth: "2026-07",
        billingStart: new Date("2026-06-18"),
        billingEnd: new Date("2026-07-17"),
        dueDate: new Date("2026-08-08"),
        status: "DONE",
        txCount: 30,
        createdAt: new Date("2026-07-11"),
      },
    ];
    vi.mocked(prisma.upload.findMany).mockResolvedValue(mockUploads as never);

    const res = await GET(new Request("http://localhost"), makeRequest("card-1"));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].id).toBe("upload-2");
    expect(prisma.upload.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cardId: "card-1" } }),
    );
  });

  it("卡片不存在时返回 404", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), makeRequest("missing-card"));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it("该卡没有账单时返回空数组", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({ id: "card-1" } as never);
    vi.mocked(prisma.upload.findMany).mockResolvedValue([]);

    const res = await GET(new Request("http://localhost"), makeRequest("card-1"));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
  });
});
