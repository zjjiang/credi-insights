import { describe, it, expect, beforeEach, vi } from "vitest";
import { classifyTransactions } from "./ai-classify";

// mock getAiClient，捕获传入 chat.completions.create 的完整参数
const createMock = vi.fn();

vi.mock("./ai-client", () => ({
  getAiClient: vi.fn(async () => ({
    client: { chat: { completions: { create: createMock } } },
    model: "glm-5.3",
  })),
}));

const RULES = [
  { description: "merchant contains 美团", categoryId: "c-food", categoryName: "餐饮" },
];

const TXS = [
  { id: "tx-1", merchant: "财付通-美团", amount: 35 },
  { id: "tx-2", merchant: "支付宝-上海拉扎斯信息科技有限公司", amount: 28 },
];

function jsonResponse(content: string, finishReason = "stop") {
  return {
    choices: [{ message: { content }, finish_reason: finishReason }],
    usage: {
      completion_tokens: 100,
      completion_tokens_details: { reasoning_tokens: 0 },
    },
  };
}

describe("classifyTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("glm 模型请求携带 thinking:{type:'disabled'}，避免推理预算吃掉 JSON 输出", async () => {
    createMock.mockResolvedValue(
      jsonResponse('[{"txId":"tx-1","categoryId":"c-food"}]'),
    );

    await classifyTransactions(TXS, RULES);

    expect(createMock).toHaveBeenCalledTimes(1);
    const payload = createMock.mock.calls[0][0];
    expect(payload.thinking).toEqual({ type: "disabled" });
  });

  it("非 glm 模型（qwen-plus）不传 thinking 参数，避免端点拒绝未知字段", async () => {
    const { getAiClient } = await import("./ai-client");
    vi.mocked(getAiClient).mockResolvedValueOnce({
      client: { chat: { completions: { create: createMock } } },
      model: "qwen-plus",
    } as never);
    createMock.mockResolvedValue(
      jsonResponse('[{"txId":"tx-1","categoryId":"c-food"}]'),
    );

    await classifyTransactions(TXS, RULES);

    const payload = createMock.mock.calls[0][0];
    expect(payload.thinking).toBeUndefined();
  });

  it("max_tokens 为 4096，容纳单批 20 笔的 JSON 数组输出", async () => {
    createMock.mockResolvedValue(
      jsonResponse('[{"txId":"tx-1","categoryId":"c-food"}]'),
    );

    await classifyTransactions(TXS, RULES);

    expect(createMock.mock.calls[0][0].max_tokens).toBe(4096);
  });

  it("正常解析模型返回的 JSON 数组", async () => {
    createMock.mockResolvedValue(
      jsonResponse(
        '[{"txId":"tx-1","categoryId":"c-food"},{"txId":"tx-2","categoryId":"c-food"}]',
      ),
    );

    const results = await classifyTransactions(TXS, RULES);

    expect(results).toEqual([
      { txId: "tx-1", categoryId: "c-food" },
      { txId: "tx-2", categoryId: "c-food" },
    ]);
  });

  it("finish_reason 为 length（被截断）时返回空数组并输出告警日志", async () => {
    createMock.mockResolvedValue(
      jsonResponse('[{"txId":"tx-1","categoryId":"c-fo', "length"),
    );

    const results = await classifyTransactions(TXS, RULES);

    expect(results).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("length"),
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("glm-5.3"),
    );
  });

  it("正文不含合法 JSON 时返回空数组并输出告警日志", async () => {
    createMock.mockResolvedValue(jsonResponse("抱歉，我无法完成分类。"));

    const results = await classifyTransactions(TXS, RULES);

    expect(results).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("glm-5.3"),
    );
  });

  it("无规则或无交易时直接返回空数组，不发起请求", async () => {
    expect(await classifyTransactions(TXS, [])).toEqual([]);
    expect(await classifyTransactions([], RULES)).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();
  });
});
