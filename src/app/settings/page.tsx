"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Checkbox,
  ColorPicker,
  Divider,
  Empty,
  Form,
  Input,
  Select,
  Tabs,
  Typography,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { ApiCategory } from "@/lib/api-types";

const DEFAULT_COLOR = "#6366f1";

interface ApiRule {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  category: ApiCategory;
  enabled: boolean;
}

interface EditCatForm {
  name: string;
  icon: string;
  color: string;
}

interface AiSettingsValues {
  ANTHROPIC_API_KEY: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
}

interface CategoryFormValues {
  icon?: string;
  name: string;
  color?: unknown;
}

interface RuleFormValues {
  name: string;
  description: string;
  categoryId: string;
}

function toHex(color: unknown): string {
  if (typeof color === "string") return color;
  if (color && typeof color === "object" && "toHexString" in color) {
    return (color as { toHexString: () => string }).toHexString();
  }
  return DEFAULT_COLOR;
}

function getApiError(j: unknown, fallback: string): string {
  if (j && typeof j === "object" && "error" in j) {
    const msg = (j as { error?: unknown }).error;
    if (typeof msg === "string" && msg) return msg;
  }
  return fallback;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function SettingsPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setCategories(j.data);
      })
      .catch((err) => console.error("加载分类失败:", err));
  }, []);

  const items = [
    {
      key: "ai",
      label: "AI 配置",
      children: <AiSettingsCard />,
      forceRender: true,
    },
    {
      key: "categories",
      label: "分类",
      children: (
        <CategoriesCard categories={categories} setCategories={setCategories} />
      ),
      forceRender: true,
    },
    {
      key: "rules",
      label: "规则",
      children: <RulesCard categories={categories} />,
      forceRender: true,
    },
  ];

  return (
    <div className="container mx-auto flex max-w-5xl flex-col gap-4 p-4 pb-24">
      <Typography.Title level={4} style={{ margin: 0 }}>
        设置
      </Typography.Title>
      <Tabs defaultActiveKey="ai" items={items} />
    </div>
  );
}

function AiSettingsCard() {
  const { message } = App.useApp();
  const [form] = Form.useForm<AiSettingsValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        form.setFieldsValue({
          ANTHROPIC_API_KEY: j.data?.ANTHROPIC_API_KEY ?? "",
          AI_BASE_URL: j.data?.AI_BASE_URL ?? "",
          AI_MODEL: j.data?.AI_MODEL ?? "",
        });
      })
      .catch((err) => console.error("加载 AI 设置失败:", err));
  }, [form]);

  async function saveSettings(values: AiSettingsValues) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const j = await readJson(res);
      if (!res.ok || (j as { success?: boolean })?.success === false) {
        throw new Error(getApiError(j, `保存失败（HTTP ${res.status}）`));
      }
      message.success("已保存");
    } catch (err) {
      message.error(errorMessage(err, "保存失败，请稍后重试"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="AI 配置">
      <Typography.Paragraph type="secondary">
        用于自动分类和账单助手。支持 Anthropic、阿里云百炼等 OpenAI
        兼容接口。
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={saveSettings}>
        <Form.Item
          name="ANTHROPIC_API_KEY"
          label="API Key"
          rules={[{ required: true, message: "请输入 API Key" }]}
        >
          <Input.Password placeholder="API Key" autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="AI_BASE_URL" label="Base URL">
          <Input placeholder="如 https://dashscope.aliyuncs.com/compatible-mode/v1" />
        </Form.Item>
        <Form.Item name="AI_MODEL" label="模型名">
          <Input placeholder="如 qwen-plus" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          保存
        </Button>
      </Form>
    </Card>
  );
}

interface CategoriesCardProps {
  categories: ApiCategory[];
  setCategories: React.Dispatch<React.SetStateAction<ApiCategory[]>>;
}

function CategoriesCard({ categories, setCategories }: CategoriesCardProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<CategoryFormValues>();
  const [addingCat, setAddingCat] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatForm, setEditCatForm] = useState<EditCatForm>({
    name: "",
    icon: "",
    color: DEFAULT_COLOR,
  });

  function startEditCat(c: ApiCategory) {
    setEditingCat(c.id);
    setEditCatForm({
      name: c.name,
      icon: c.icon ?? "",
      color: c.color ?? DEFAULT_COLOR,
    });
  }

  async function addCategory(values: CategoryFormValues) {
    setAddingCat(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          icon: values.icon ?? "",
          color: toHex(values.color),
        }),
      });
      const j = await readJson(res);
      if (!res.ok || (j as { success?: boolean })?.success !== true) {
        throw new Error(getApiError(j, "新增分类失败"));
      }
      setCategories((prev) => [...prev, (j as { data: ApiCategory }).data]);
      form.resetFields();
      message.success("分类已新增");
    } catch (err) {
      message.error(errorMessage(err, "新增分类失败，请稍后重试"));
    } finally {
      setAddingCat(false);
    }
  }

  async function saveEditCat(id: string) {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editCatForm),
      });
      if (!res.ok) throw new Error(`保存失败（HTTP ${res.status}）`);
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...editCatForm } : c)),
      );
      setEditingCat(null);
      message.success("分类已更新");
    } catch (err) {
      message.error(errorMessage(err, "保存分类失败，请稍后重试"));
    }
  }

  async function deleteCat(id: string) {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`删除失败（HTTP ${res.status}）`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      message.success("分类已删除");
    } catch (err) {
      message.error(errorMessage(err, "删除分类失败，请稍后重试"));
    }
  }

  return (
    <Card title="分类管理">
      {categories.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="还没有分类"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              editing={editingCat === c.id}
              editForm={editCatForm}
              onEditFormChange={setEditCatForm}
              onStartEdit={() => startEditCat(c)}
              onSaveEdit={() => void saveEditCat(c.id)}
              onCancelEdit={() => setEditingCat(null)}
              onDelete={() => void deleteCat(c.id)}
            />
          ))}
        </div>
      )}
      <Divider />
      <Form form={form} layout="vertical" onFinish={addCategory}>
        <div className="flex items-start gap-2">
          <Form.Item name="icon" className="w-16" label="图标">
            <Input placeholder="图标" maxLength={2} />
          </Form.Item>
          <Form.Item
            name="name"
            className="flex-1"
            label="分类名称"
            rules={[{ required: true, message: "请输入分类名称" }]}
          >
            <Input placeholder="分类名称" />
          </Form.Item>
          <Form.Item name="color" label="颜色" initialValue={DEFAULT_COLOR}>
            <ColorPicker showText={false} disabledAlpha />
          </Form.Item>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          htmlType="submit"
          loading={addingCat}
        >
          新增分类
        </Button>
      </Form>
    </Card>
  );
}

interface CategoryRowProps {
  category: ApiCategory;
  editing: boolean;
  editForm: EditCatForm;
  onEditFormChange: (next: EditCatForm) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

function CategoryRow({
  category,
  editing,
  editForm,
  onEditFormChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: CategoryRowProps) {
  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded border border-gray-200 p-2">
        <Input
          size="small"
          value={editForm.icon}
          onChange={(e) =>
            onEditFormChange({ ...editForm, icon: e.target.value })
          }
          placeholder="图标"
          className="w-14 text-center"
        />
        <Input
          size="small"
          value={editForm.name}
          onChange={(e) =>
            onEditFormChange({ ...editForm, name: e.target.value })
          }
          className="flex-1"
        />
        <ColorPicker
          size="small"
          value={editForm.color}
          onChange={(c) => onEditFormChange({ ...editForm, color: c.toHexString() })}
          disabledAlpha
        />
        <Button
          size="small"
          type="text"
          icon={<CheckOutlined style={{ color: "#52c41a" }} />}
          onClick={onSaveEdit}
          aria-label="保存"
        />
        <Button
          size="small"
          type="text"
          icon={<CloseOutlined />}
          onClick={onCancelEdit}
          aria-label="取消"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded border border-gray-200 p-2">
      <span
        className="h-6 w-6 shrink-0 rounded"
        style={{ background: category.color ?? DEFAULT_COLOR }}
      />
      <span className="text-sm">{category.icon}</span>
      <span className="flex-1 truncate text-xs font-medium">
        {category.name}
      </span>
      <Button
        size="small"
        type="text"
        icon={<EditOutlined />}
        onClick={onStartEdit}
        aria-label="编辑"
      />
      <Button
        size="small"
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={onDelete}
        aria-label="删除"
      />
    </div>
  );
}

function RulesCard({ categories }: { categories: ApiCategory[] }) {
  const { message } = App.useApp();
  const [rules, setRules] = useState<ApiRule[]>([]);
  const [addingRule, setAddingRule] = useState(false);
  const [form] = Form.useForm<RuleFormValues>();

  useEffect(() => {
    fetch("/api/rules")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setRules(j.data);
      })
      .catch((err) => console.error("加载规则失败:", err));
  }, []);

  async function toggleRule(id: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(`更新失败（HTTP ${res.status}）`);
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled } : r)),
      );
    } catch (err) {
      message.error(errorMessage(err, "更新规则失败，请稍后重试"));
    }
  }

  async function deleteRule(id: string) {
    try {
      const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`删除失败（HTTP ${res.status}）`);
      setRules((prev) => prev.filter((r) => r.id !== id));
      message.success("规则已删除");
    } catch (err) {
      message.error(errorMessage(err, "删除规则失败，请稍后重试"));
    }
  }

  async function addRule(values: RuleFormValues) {
    setAddingRule(true);
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const j = await readJson(res);
      if (!res.ok || (j as { success?: boolean })?.success !== true) {
        throw new Error(getApiError(j, "添加规则失败"));
      }
      setRules((prev) => [...prev, (j as { data: ApiRule }).data]);
      form.resetFields();
      message.success("规则已添加");
    } catch (err) {
      message.error(errorMessage(err, "添加规则失败，请稍后重试"));
    } finally {
      setAddingRule(false);
    }
  }

  return (
    <Card title="分类规则">
      <Typography.Paragraph type="secondary">
        上传账单时 AI 会按规则自动打标分类。用自然语言描述规则即可。
      </Typography.Paragraph>
      {rules.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有规则" />
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-2 rounded border border-gray-200 p-2"
            >
              <Checkbox
                checked={r.enabled}
                onChange={(e) => void toggleRule(r.id, e.target.checked)}
                className="mt-0.5 shrink-0"
                aria-label={`启用规则：${r.name}`}
              />
              <div className="min-w-0 flex-1">
                <Typography.Text className="text-xs font-medium">
                  {r.name}
                </Typography.Text>
                <div className="truncate">
                  <Typography.Text type="secondary" className="text-xs">
                    {r.description}
                  </Typography.Text>
                </div>
                <Typography.Text
                  className="text-xs"
                  style={{ color: "#1677ff" }}
                >
                  → {r.category.icon} {r.category.name}
                </Typography.Text>
              </div>
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => void deleteRule(r.id)}
                aria-label="删除规则"
                className="shrink-0"
              />
            </div>
          ))}
        </div>
      )}
      <Divider />
      <Form form={form} layout="vertical" onFinish={addRule}>
        <Form.Item
          name="name"
          label="规则名称"
          rules={[{ required: true, message: "请输入规则名称" }]}
        >
          <Input placeholder="如：咖啡规则" />
        </Form.Item>
        <Form.Item
          name="description"
          label="规则描述"
          rules={[{ required: true, message: "请输入规则描述" }]}
        >
          <Input.TextArea
            rows={2}
            placeholder="如：商户包含星巴克、Manner、瑞幸 → 咖啡"
          />
        </Form.Item>
        <Form.Item
          name="categoryId"
          label="目标分类"
          rules={[{ required: true, message: "请选择目标分类" }]}
        >
          <Select
            placeholder="选择目标分类..."
            options={categories.map((c) => ({
              value: c.id,
              label: `${c.icon} ${c.name}`,
            }))}
          />
        </Form.Item>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          htmlType="submit"
          loading={addingRule}
        >
          添加规则
        </Button>
      </Form>
    </Card>
  );
}
