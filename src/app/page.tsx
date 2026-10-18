"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Empty, Spin, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";

interface CardItem {
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
  const [cards, setCards] = useState<CardItem[]>([]);
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
      } catch (err) {
        console.error("加载卡片列表失败:", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const openNewCard = () => router.push("/cards/new");

  if (loading) {
    return (
      <div className="container mx-auto flex max-w-5xl justify-center p-4 py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl p-4">
        <Empty
          className="py-16"
          description="暂无卡片，点击下方按钮添加您的第一张信用卡"
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={openNewCard}>
            新增卡片
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          我的信用卡
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNewCard}>
          新增卡片
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <CardTile
            key={card.id}
            card={card}
            stat={stats[card.id]}
            onOpen={() => router.push(`/cards/${card.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

interface CardTileProps {
  card: CardItem;
  stat?: CardStats;
  onOpen: () => void;
}

function CardTile({ card, stat, onOpen }: CardTileProps) {
  return (
    <Card hoverable onClick={onOpen}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <Typography.Text strong>
            {card.alias || `${card.bank} ${card.cardLast4}`}
          </Typography.Text>
          <div>
            <Typography.Text type="secondary">
              {card.bank} • 尾号 {card.cardLast4}
            </Typography.Text>
          </div>
        </div>
        {card.billingDay && (
          <div className="text-right">
            <Typography.Text type="secondary" className="text-xs">
              账单日
            </Typography.Text>
            <div>
              <Typography.Text strong className="text-sm">
                {card.billingDay} 号
              </Typography.Text>
            </div>
          </div>
        )}
      </div>

      {stat && (
        <div style={{ borderTop: "1px solid #f0f0f0" }} className="pt-3">
          <div className="flex gap-4">
            <div>
              <Typography.Text type="secondary" className="text-xs">
                本月支出
              </Typography.Text>
              <p className="text-lg font-semibold text-red-500">
                ¥{stat.monthDebit.toFixed(2)}
              </p>
            </div>
            {stat.monthCredit > 0 && (
              <div>
                <Typography.Text type="secondary" className="text-xs">
                  本月收入
                </Typography.Text>
                <p className="text-lg font-semibold text-emerald-600">
                  ¥{stat.monthCredit.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
