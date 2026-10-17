"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { App, Button, Card, Form, Input, InputNumber, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

interface CardInfo {
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
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [card, setCard] = useState<CardInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCard() {
      try {
        const res = await fetch(`/api/cards/${cardId}`);
        const result = await res.json();
        if (result.success) {
          const c = result.data;
          setCard(c);
          form.setFieldsValue({
            bank: c.bank || "",
            cardLast4: c.cardLast4 || "",
            alias: c.alias || "",
            imapHost: c.imapHost || "",
            imapPort: c.imapPort ? Number(c.imapPort) : 993,
            imapUser: c.imapUser || "",
            imapPassword: c.imapPassword || "",
            billingDay: c.billingDay ? Number(c.billingDay) : undefined,
            dueDay: c.dueDay ? Number(c.dueDay) : undefined,
          });
        }
      } finally {
        setLoading(false);
      }
    }
    loadCard();
  }, [cardId, form]);

  async function handleSubmit(values: {
    bank: string;
    cardLast4: string;
    alias?: string;
    imapHost: string;
    imapPort: number;
    imapUser: string;
    imapPassword: string;
    billingDay?: number;
    dueDay?: number;
  }) {
    setSaving(true);

    try {
      const payload = {
        bank: values.bank,
        cardLast4: values.cardLast4,
        alias: values.alias || null,
        imapHost: values.imapHost,
        imapPort: Number(values.imapPort),
        imapUser: values.imapUser,
        imapPassword: values.imapPassword,
        billingDay: values.billingDay ?? null,
        dueDay: values.dueDay ?? null,
      };

      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        message.success("保存成功");
        router.push(`/cards/${cardId}`);
      } else {
        message.error(result.error || "保存失败");
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">卡片不存在</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push(`/cards/${cardId}`)}
          aria-label="返回卡片详情"
        />
        <Typography.Title level={4} style={{ margin: 0 }}>
          卡片设置
        </Typography.Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Card title="基本信息" className="mb-6">
          <Form.Item
            label="银行名称"
            name="bank"
            rules={[{ required: true, message: "请输入银行名称" }]}
          >
            <Input placeholder="例如:招商银行" />
          </Form.Item>

          <Form.Item
            label="卡号后4位"
            name="cardLast4"
            rules={[
              { required: true, message: "请输入卡号后4位" },
              { pattern: /^\d{4}$/, message: "必须是 4 位数字" },
            ]}
          >
            <Input placeholder="例如: 1234" maxLength={4} />
          </Form.Item>

          <Form.Item label="卡片别名" name="alias">
            <Input placeholder="例如: 主卡" />
          </Form.Item>
        </Card>

        <Card title="IMAP 配置" className="mb-6">
          <Form.Item
            label="IMAP 服务器"
            name="imapHost"
            rules={[{ required: true, message: "请输入 IMAP 服务器" }]}
          >
            <Input placeholder="例如: imap.qq.com" />
          </Form.Item>

          <Form.Item
            label="IMAP 端口"
            name="imapPort"
            rules={[{ required: true, message: "请输入 IMAP 端口" }]}
          >
            <InputNumber min={1} max={65535} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="IMAP 用户名"
            name="imapUser"
            rules={[{ required: true, message: "请输入 IMAP 用户名" }]}
          >
            <Input placeholder="邮箱地址" />
          </Form.Item>

          <Form.Item
            label="IMAP 密码/授权码"
            name="imapPassword"
            rules={[{ required: true, message: "请输入 IMAP 密码/授权码" }]}
          >
            <Input.Password />
          </Form.Item>
        </Card>

        <Card title="账单周期" className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="账单日" name="billingDay">
              <InputNumber
                min={1}
                max={31}
                style={{ width: "100%" }}
                placeholder="1-31"
              />
            </Form.Item>

            <Form.Item label="还款日" name="dueDay">
              <InputNumber
                min={1}
                max={31}
                style={{ width: "100%" }}
                placeholder="1-31"
              />
            </Form.Item>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            htmlType="button"
            onClick={() => router.push(`/cards/${cardId}`)}
            disabled={saving}
          >
            取消
          </Button>
          <Button htmlType="submit" type="primary" loading={saving} className="flex-1">
            保存
          </Button>
        </div>
      </Form>
    </div>
  );
}
