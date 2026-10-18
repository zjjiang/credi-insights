"use client";

import { Tag } from "antd";

/** 账单处理状态标签（antd Tag 需要客户端上下文，故抽为独立 client 组件） */
export function StatusTag({ status }: { status: string }) {
  if (status === "FAILED") return <Tag color="error">解析失败</Tag>;
  if (status !== "DONE") return <Tag color="processing">处理中...</Tag>;
  return null;
}
