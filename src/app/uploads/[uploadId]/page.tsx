import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { TransactionList } from "@/components/transactions/TransactionList";


import type { ApiUpload, ApiCategory } from "@/lib/api-types";

async function getUpload(id: string): Promise<ApiUpload | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/uploads/${id}`, { cache: "no-store" });
  const json = await res.json();
  return json.success ? json.data : null;
}

async function getCategories(): Promise<ApiCategory[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/categories`, { cache: "no-store" });
  const json = await res.json();
  return json.success ? json.data : [];
}

export default async function UploadDetailPage({
  params,
}: {
  params: Promise<{ uploadId: string }>;
}) {
  const { uploadId } = await params;
  const [upload, categories] = await Promise.all([getUpload(uploadId), getCategories()]);

  if (!upload) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">找不到该上传记录</p>
      </div>
    );
  }

  const title = [
    upload.imageMonth
      ? new Date(upload.imageMonth + "-01").toLocaleDateString("zh-CN", { year: "numeric", month: "long" })
      : null,
    upload.cardLast4 ? `信用卡${upload.cardLast4}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 py-3">
        <Link
          href="/history"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          历史记录
        </Link>
        <span className="ml-auto text-sm font-medium">{title || upload.originalName}</span>
      </div>

      <div className="p-4">
        {upload.status !== "DONE" && (
          <div className="mb-4 text-sm text-muted-foreground">
            {upload.status === "FAILED" ? "解析失败" : "处理中..."}
          </div>
        )}
        <TransactionList
          transactions={upload.transactions ?? []}
          categories={categories}
        />
      </div>
    </div>
  );
}
