"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Form, Input, InputNumber, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

interface NewCardFormValues {
  bank: string;
  cardLast4: string;
  alias?: string;
  billingDay: number;
  dueDay: number;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  imapSubject: string;
}

export default function NewCardPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(values: NewCardFormValues) {
    setSaving(true);

    const data = {
      bank: values.bank,
      cardLast4: values.cardLast4,
      alias: values.alias || null,
      billingDay: values.billingDay ?? null,
      dueDay: values.dueDay ?? null,
      imapHost: values.imapHost || null,
      imapPort: values.imapPort ?? null,
      imapUser: values.imapUser || null,
      imapPassword: values.imapPassword || null,
      imapSubject: values.imapSubject || null,
    };

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (result.success) {
        message.success("创建成功");
        router.push("/");
      } else {
        message.error(result.error || "创建失败");
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <div className="mb-6 flex items-center gap-3">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/")}
          aria-label="返回首页"
        />
        <Typography.Title level={4} style={{ margin: 0 }}>
          新增信用卡
        </Typography.Title>
      </div>

      <Form layout="vertical" onFinish={handleSubmit}>
        <Card title="基本信息" className="mb-6">
          <Form.Item
            label="发卡行"
            name="bank"
            rules={[{ required: true, message: "请输入发卡行" }]}
          >
            <Input placeholder="如：招商银行" />
          </Form.Item>

          <Form.Item
            label="卡号后四位"
            name="cardLast4"
            rules={[
              { required: true, message: "请输入卡号后四位" },
              { pattern: /^\d{4}$/, message: "必须是 4 位数字" },
            ]}
          >
            <Input placeholder="如：1234" maxLength={4} />
          </Form.Item>

          <Form.Item label="卡片别名（可选）" name="alias">
            <Input placeholder="如：主卡、备用卡" />
          </Form.Item>

          <Form.Item
            label="账单日（1-31）"
            name="billingDay"
            rules={[{ required: true, message: "请输入账单日" }]}
          >
            <InputNumber min={1} max={31} style={{ width: "100%" }} placeholder="如：18" />
          </Form.Item>

          <Form.Item
            label="还款日（1-31）"
            name="dueDay"
            rules={[{ required: true, message: "请输入还款日" }]}
          >
            <InputNumber min={1} max={31} style={{ width: "100%" }} placeholder="如：8" />
          </Form.Item>
        </Card>

        <Card title="IMAP 配置（日推同步）" className="mb-6">
          <Typography.Text type="secondary" className="mb-4 block text-sm">
            配置后可自动同步「每日信用管家」日推邮件
          </Typography.Text>

          <Form.Item
            label="IMAP 服务器"
            name="imapHost"
            rules={[{ required: true, message: "请输入 IMAP 服务器" }]}
          >
            <Input placeholder="如：imap.qq.com" />
          </Form.Item>

          <Form.Item
            label="IMAP 端口"
            name="imapPort"
            initialValue={993}
            rules={[{ required: true, message: "请输入 IMAP 端口" }]}
          >
            <InputNumber min={1} max={65535} style={{ width: "100%" }} placeholder="993" />
          </Form.Item>

          <Form.Item
            label="邮箱账号"
            name="imapUser"
            rules={[
              { required: true, message: "请输入邮箱账号" },
              { type: "email", message: "邮箱格式不正确" },
            ]}
          >
            <Input placeholder="your@email.com" />
          </Form.Item>

          <Form.Item
            label="IMAP 密码/授权码"
            name="imapPassword"
            rules={[{ required: true, message: "请输入 IMAP 密码/授权码" }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          <Form.Item
            label="邮件主题过滤"
            name="imapSubject"
            initialValue="每日信用管家"
            rules={[{ required: true, message: "请输入邮件主题过滤" }]}
          >
            <Input placeholder="每日信用管家" />
          </Form.Item>
        </Card>

        <div className="flex gap-3">
          <Button htmlType="submit" type="primary" loading={saving}>
            创建卡片
          </Button>
          <Button htmlType="button" onClick={() => router.push("/")}>
            取消
          </Button>
        </div>
      </Form>
    </div>
  );
}
