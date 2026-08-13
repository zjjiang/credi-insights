"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Card {
  id: string;
  bank: string;
  cardLast4: string;
  alias: string | null;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  billingDay: number | null;
  dueDay: number | null;
  isActive: boolean;
}

export default function CardSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id as string;

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    bank: "",
    cardLast4: "",
    alias: "",
    imapHost: "",
    imapPort: "993",
    imapUser: "",
    imapPassword: "",
    billingDay: "",
    dueDay: "",
  });

  useEffect(() => {
    async function loadCard() {
      try {
        const res = await fetch(`/api/cards/${cardId}`);
        const result = await res.json();
        if (result.success) {
          const c = result.data;
          setCard(c);
          setFormData({
            bank: c.bank || "",
            cardLast4: c.cardLast4 || "",
            alias: c.alias || "",
            imapHost: c.imapHost || "",
            imapPort: c.imapPort ? String(c.imapPort) : "993",
            imapUser: c.imapUser || "",
            imapPassword: c.imapPassword || "",
            billingDay: c.billingDay ? String(c.billingDay) : "",
            dueDay: c.dueDay ? String(c.dueDay) : "",
          });
        }
      } finally {
        setLoading(false);
      }
    }
    loadCard();
  }, [cardId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: {
        bank: string;
        cardLast4: string;
        alias: string | null;
        imapHost: string;
        imapPort: number;
        imapUser: string;
        imapPassword: string;
        billingDay: number | null;
        dueDay: number | null;
      } = {
        bank: formData.bank,
        cardLast4: formData.cardLast4,
        alias: formData.alias || null,
        imapHost: formData.imapHost,
        imapPort: Number(formData.imapPort),
        imapUser: formData.imapUser,
        imapPassword: formData.imapPassword,
        billingDay: formData.billingDay ? Number(formData.billingDay) : null,
        dueDay: formData.dueDay ? Number(formData.dueDay) : null,
      };

      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        router.push(`/cards/${cardId}`);
      } else {
        setError(result.error || "保存失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">卡片不存在</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/cards/${cardId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">卡片设置</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 font-medium">基本信息</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                银行名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.bank}
                onChange={(e) =>
                  setFormData({ ...formData, bank: e.target.value })
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="例如:招商银行"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                卡号后4位 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                pattern="[0-9]{4}"
                value={formData.cardLast4}
                onChange={(e) =>
                  setFormData({ ...formData, cardLast4: e.target.value })
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="例如: 1234"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">卡片别名</label>
              <input
                type="text"
                value={formData.alias}
                onChange={(e) =>
                  setFormData({ ...formData, alias: e.target.value })
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="例如: 主卡"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 font-medium">IMAP 配置</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                IMAP 服务器 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.imapHost}
                onChange={(e) =>
                  setFormData({ ...formData, imapHost: e.target.value })
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="例如: imap.qq.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                IMAP 端口 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.imapPort}
                onChange={(e) =>
                  setFormData({ ...formData, imapPort: e.target.value })
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                IMAP 用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.imapUser}
                onChange={(e) =>
                  setFormData({ ...formData, imapUser: e.target.value })
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="邮箱地址"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                IMAP 密码/授权码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={formData.imapPassword}
                onChange={(e) =>
                  setFormData({ ...formData, imapPassword: e.target.value })
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 font-medium">账单周期</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">账单日</label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.billingDay}
                onChange={(e) =>
                  setFormData({ ...formData, billingDay: e.target.value })
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="1-31"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">还款日</label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dueDay}
                onChange={(e) =>
                  setFormData({ ...formData, dueDay: e.target.value })
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="1-31"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/cards/${cardId}`)}
            disabled={saving}
          >
            取消
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
