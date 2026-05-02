"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Upload, LayoutDashboard, History, Tag } from "lucide-react";

const navItems = [
  { href: "/upload", label: "上传", icon: Upload },
  { href: "/dashboard", label: "统计", icon: LayoutDashboard },
  { href: "/history", label: "历史", icon: History },
  { href: "/categories", label: "分类", icon: Tag },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex h-16 items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-2 text-xs transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
