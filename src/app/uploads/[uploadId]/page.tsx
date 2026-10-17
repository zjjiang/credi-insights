import Link from "next/link";
import { TransactionList } from "@/components/transactions/TransactionList";
import { StatusTag } from "@/components/shared/StatusTag";

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
  const [upload, categories] = await Promise.all([
    getUpload(uploadId),
    getCategories(),
  ]);

  if (!upload) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <p className="text-sm text-gray-400">找不到该上传记录</p>
      </div>
    );
  }

  const title = [
    upload.imageMonth
      ? new Date(upload.imageMonth + "-01").toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "long",
        })
      : null,
    upload.cardLast4 ? `信用卡${upload.cardLast4}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-4 py-3">
        <Link
          href="/history"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <span className="text-xs">←</span>
          历史记录
        </Link>
        <span className="ml-auto truncate text-sm font-medium">{title || upload.originalName}</span>
      </div>

      <div className="p-4">
        {upload.status !== "DONE" && <StatusTag status={upload.status} />}
        <TransactionList
          transactions={upload.transactions ?? []}
          categories={categories}
        />
      </div>
    </div>
  );
}
