"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ApiCategory } from "@/lib/api-types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCategories(json.data);
      });
  }, []);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">分类管理</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                添加分类
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加分类</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              分类添加功能将在后续版本中完成。
            </p>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        {categories.map((cat, i) => (
          <div
            key={cat.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < categories.length - 1 ? "border-b" : ""
            }`}
          >
            <span className="text-xl">{cat.icon}</span>
            <span className="flex-1 text-sm">{cat.name}</span>
            {cat.color && (
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
