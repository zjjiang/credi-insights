"use client";

import { FloatButton } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { useAi } from "@/lib/ai-context";

export function AiToggleButton() {
  const { isOpen, open } = useAi();
  if (isOpen) return null;
  return (
    <FloatButton
      type="primary"
      icon={<RobotOutlined />}
      onClick={open}
      tooltip="打开AI助手"
      aria-label="打开AI助手"
    />
  );
}
