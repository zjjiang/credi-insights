"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard } from "lucide-react";

interface Card {
  id: string;
  bank: string;
  cardLast4: string;
  alias: string | null;
  billingDay: number | null;
  isActive: boolean;
}

interface CardStats {
  cardId: string;
  monthDebit: number;
  monthCredit: number;
}

export default function HomePage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [stats, setStats] = useState<Record<string, CardStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [cardsRes, statsRes] = await Promise.all([
          fetch("/api/cards").then((r) => r.json()),
          fetch("/api/cards/stats").then((r) => r.json()),
        ]);
        if (cardsRes.success) setCards(cardsRes.data.cards || []);
        if (statsRes.success) {
          const statsMap: Record<string, CardStats> = {};
          for (const s of statsRes.data) {
            statsMap[s.cardId] = s;
          }
          setStats(statsMap);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl p-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          加载中...
        </p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl p-4">
        <div className="flex flex-col items-center justify-center py-16">
          <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-6 text-center text-sm text-muted-foreground">
            暂无卡片，点击下方按钮添加您的第一张信用卡
          </p>
          <Button onClick={() => router.push("/cards/new")}>
            <Plus className="h-4 w-4" />
            <span className="ml-2">新增卡片</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">我的信用卡</h1>
        <Button onClick={() => router.push("/cards/new")} size="sm">
          <Plus className="h-4 w-4" />
          <span className="ml-2">新增卡片</span>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const stat = stats[card.id];
          return (
            <button
              key={card.id}
              onClick={() => router.push(`/cards/${card.id}`)}
              className="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-medium">
                    {card.alias || `${card.bank} ${card.cardLast4}`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {card.bank} • 尾号 {card.cardLast4}
                  </p>
                </div>
                {card.billingDay && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">账单日</p>
                    <p className="text-sm font-medium">{card.billingDay} 号</p>
                  </div>
                )}
              </div>

              {stat && (
                <div className="flex gap-4 border-t pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">本月支出</p>
                    <p className="text-lg font-semibold text-red-600">
                      ¥{stat.monthDebit.toFixed(2)}
                    </p>
                  </div>
                  {stat.monthCredit > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">本月收入</p>
                      <p className="text-lg font-semibold text-green-600">
                        ¥{stat.monthCredit.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
