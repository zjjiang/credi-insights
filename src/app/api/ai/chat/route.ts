import { NextResponse } from "next/server";
import { getAiClient } from "@/lib/ai-client";
import { aiTools, runTool } from "@/lib/ai-tools";
import type OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { messages, context } = await request.json();
    const { client, model } = await getAiClient();

    const tools: OpenAI.Chat.ChatCompletionTool[] = aiTools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const systemPrompt = `你是一个信用卡账单分析助手。你可以查询卡片/交易/统计，管理分类与规则：查分类（list_categories）、创建分类（create_category）、查规则（list_rules）、建规则（create_rule）、单笔/批量改分类、对未分类交易应用规则（apply_rules，先 dryRun 预览）。创建分类或规则前先用 list_categories/list_rules 查证是否已存在。回答简洁，数字保留两位小数。`;

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (data: unknown) =>
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

        let msgs: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: "system", content: systemPrompt },
          ...messages,
        ];

        for (let i = 0; i < 5; i++) {
          const response = await client.chat.completions.create({
            model,
            max_tokens: 4096,
            // glm 系推理模型的思考与正文共享 max_tokens 预算，不关闭会导致输出被截断
            ...(model.startsWith("glm")
              ? { thinking: { type: "disabled" as const } }
              : {}),
            tools,
            messages: msgs,
          });
          const msg = response.choices[0].message;

          if (msg.content) send({ type: "text", delta: msg.content });

          const toolCalls = msg.tool_calls ?? [];
          if (toolCalls.length === 0) break;

          msgs = [...msgs, msg];
          for (const tc of toolCalls) {
            if (tc.type !== "function") continue;
            let input: Record<string, unknown> = {};
            try {
              input = JSON.parse(tc.function.arguments);
            } catch {
              input = {};
            }
            let result: unknown;
            try {
              result = await runTool(tc.function.name, input);
            } catch (error) {
              result = {
                error: error instanceof Error ? error.message : String(error),
              };
            }
            send({ type: "tool_result", name: tc.function.name, result });
            msgs.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }
        }

        send("[DONE]");
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI chat failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
