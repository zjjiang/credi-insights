import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/db";

const { createMock, getAiClientMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  getAiClientMock: vi.fn(),
}));

vi.mock("@/lib/ai-client", () => ({ getAiClient: getAiClientMock }));

vi.mock("@/lib/db", () => ({
  prisma: {
    card: { findMany: vi.fn() },
    category: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    rule: { findMany: vi.fn(), create: vi.fn() },
    transaction: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

async function collectSSE(response: Response): Promise<unknown[]> {
  const text = await response.text();
  return text
    .split("\n\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => {
      const raw = line.slice(6);
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    });
}

const okRequest = (body: object) =>
  new Request("http://localhost/api/ai/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/ai/chat", () => {
  beforeEach(() => {
    createMock.mockReset();
    getAiClientMock.mockResolvedValue({
      client: { chat: { completions: { create: createMock } } },
      model: "glm-5.3",
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("glm 请求携带 thinking disabled，max_tokens 提升到 4096", async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: "你好", tool_calls: [] } }],
    });

    const response = await POST(okRequest({ messages: [{ role: "user", content: "hi" }] }));
    await collectSSE(response);

    const payload = createMock.mock.calls[0][0];
    expect(payload.thinking).toEqual({ type: "disabled" });
    expect(payload.max_tokens).toBe(4096);
  });

  it("工具注册表完整转换为 OpenAI 格式，含新增的管理类工具", async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: "ok", tool_calls: [] } }],
    });

    const response = await POST(okRequest({ messages: [{ role: "user", content: "hi" }] }));
    await collectSSE(response);

    const names = createMock.mock.calls[0][0].tools.map(
      (t: { function: { name: string } }) => t.function.name,
    );
    for (const expected of [
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
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("工具调用回填：执行 create_category 并把结果回填给模型收尾", async () => {
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call-1",
                  type: "function",
                  function: {
                    name: "create_category",
                    arguments: '{"name":"宠物","icon":"🐱"}',
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "已创建分类「宠物」", tool_calls: [] } }],
      });

    vi.mocked(prisma.category.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.category.create).mockResolvedValue({
      id: "cat-x",
      name: "宠物",
    } as never);

    const response = await POST(
      okRequest({ messages: [{ role: "user", content: "加一个分类叫宠物" }] }),
    );
    const events = await collectSSE(response);

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: "宠物", icon: "🐱", color: null },
    });

    const toolResultEvent = events.find(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        (e as { type?: string }).type === "tool_result",
    ) as { name: string; result: { id: string } } | undefined;
    expect(toolResultEvent?.name).toBe("create_category");
    expect(toolResultEvent?.result).toMatchObject({ id: "cat-x" });

    const textEvents = events.filter(
      (e) => typeof e === "object" && (e as { type?: string }).type === "text",
    );
    expect(textEvents.length).toBe(1);
    expect((textEvents[0] as { delta: string }).delta).toContain("宠物");
  });
});
