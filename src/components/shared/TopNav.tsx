"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "antd";
import { HomeOutlined, SettingOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";

const navItems: Required<MenuProps>["items"] = [
  {
    key: "/",
    label: (
      <Link href="/" style={{ display: "inline-block" }}>
        首页
      </Link>
    ),
    icon: <HomeOutlined />,
  },
  {
    key: "/settings",
    label: (
      <Link href="/settings" style={{ display: "inline-block" }}>
        设置
      </Link>
    ),
    icon: <SettingOutlined />,
  },
];

export function TopNav() {
  const pathname = usePathname();

  const selectedKey = navItems
    .map((item) => String(item!.key))
    .find((key) => (key === "/" ? pathname === "/" : pathname.startsWith(key)));

  return (
    <nav className="w-full border-b bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <span className="text-sm font-semibold whitespace-nowrap">
          Credi Insights
        </span>
        <Menu
          mode="horizontal"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={navItems}
          style={{ flex: 1, minWidth: 0, borderBottom: "none" }}
        />
      </div>
    </nav>
  );
}
