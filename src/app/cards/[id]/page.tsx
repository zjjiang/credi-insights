"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { DailyView } from "@/components/daily/DailyView";
import type { ApiCategory } from "@/lib/api-types";

interface Card {
  id: string;
  bank: string;
  cardLast4: string;
  alias: string | null;
  billingDay: number | null;
  isActive: boolean;
}

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id as string;

  const [card, setCard] = useState<Card | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [cardRes, catRes] = await Promise.all([
          fetch(`/api/cards/${cardId}`).then((r) => r.json()),
          fetch("/api/categories").then((r) => r.json()),
        ]);
        if (cardRes.success) setCard(cardRes.data);
        if (catRes.success) setCategories(catRes.data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [cardId]);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch(`/api/cards/${cardId}/sync`, { method: "POST" });
      // 刷新页面重新加载交易
      window.location.reload();
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl p-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          加载中...
        </p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="container mx-auto max-w-5xl p-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          卡片不存在
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/cards")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {card.alias || `${card.bank} ${card.cardLast4}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {card.bank} •{" "}尾号 {card.cardLast4}
              {card.billingDay && ` • 账单日 ${card.billingDay} 号`}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          <span className="ml-2">同步日推</span>
        </Button>
      </div>

      <DailyView categories={categories} cardId={cardId} />
    </div>
  );
}
