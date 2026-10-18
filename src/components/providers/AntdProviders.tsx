"use client";

import { useSyncExternalStore } from "react";
import { App, ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";

const noopSubscribe = () => () => {};
const getIsDark = () =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");
const getIsDarkServer = () => false;

/**
 * 全局 antd 配置：中文本地化 + 阿里云风格主题令牌 + 亮暗主题接线。
 * 内嵌 antd App 组件，为全树提供 App.useApp() 的 message/modal 上下文。
 */
export function AntdProviders({ children }: { children: React.ReactNode }) {
  // SSR 首帧按亮色渲染；客户端同步 <html> 上的 dark 类
  const isDark = useSyncExternalStore(
    noopSubscribe,
    getIsDark,
    getIsDarkServer,
  );

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 6,
          fontSize: 14,
        },
        algorithm: isDark
          ? antdTheme.darkAlgorithm
          : antdTheme.defaultAlgorithm,
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
