"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export default function NewCardPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      bank: formData.get("bank") as string,
      cardLast4: formData.get("cardLast4") as string,
      alias: formData.get("alias") as string || null,
      billingDay: formData.get("billingDay") ? Number(formData.get("billingDay")) : null,
      imapHost: formData.get("imapHost") as string || null,
      imapPort: formData.get("imapPort") ? Number(formData.get("imapPort")) : null,
      imapUser: formData.get("imapUser") as string || null,
      imapPassword: formData.get("imapPassword") as string || null,
    };

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "创建失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">新增信用卡</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-lg border p-4">
          <h2 className="font-medium">基本信息</h2>

          <div>
            <Label htmlFor="bank">发卡行 *</Label>
            <Input
              id="bank"
              name="bank"
              placeholder="如：招商银行"
              required
            />
          </div>

          <div>
            <Label htmlFor="cardLast4">卡号后四位 *</Label>
            <Input
              id="cardLast4"
              name="cardLast4"
              placeholder="如：1234"
              pattern="[0-9]{4}"
              maxLength={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="alias">卡片别名（可选）</Label>
            <Input
              id="alias"
              name="alias"
              placeholder="如：主卡、备用卡"
            />
          </div>

          <div>
            <Label htmlFor="billingDay">账单日（可选）</Label>
            <Input
              id="billingDay"
              name="billingDay"
              type="number"
              min="1"
              max="31"
              placeholder="如：28"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <h2 className="font-medium">IMAP 配置（日推同步）</h2>
          <p className="text-sm text-muted-foreground">
            配置后可自动同步「每日信用管家」日推邮件
          </p>

          <div>
            <Label htmlFor="imapHost">IMAP 服务器</Label>
            <Input
              id="imapHost"
              name="imapHost"
              placeholder="如：imap.qq.com"
            />
          </div>

          <div>
            <Label htmlFor="imapPort">IMAP 端口</Label>
            <Input
              id="imapPort"
              name="imapPort"
              type="number"
              placeholder="如：993"
            />
          </div>

          <div>
            <Label htmlFor="imapUser">邮箱账号</Label>
            <Input
              id="imapUser"
              name="imapUser"
              type="email"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <Label htmlFor="imapPassword">IMAP 密码/授权码</Label>
            <Input
              id="imapPassword"
              name="imapPassword"
              type="password"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "创建中..." : "创建卡片"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/")}
          >
            取消
          </Button>
        </div>
      </form>
    </div>
  );
}
