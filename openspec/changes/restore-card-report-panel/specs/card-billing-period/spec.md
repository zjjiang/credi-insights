# Spec: 卡片账单周期报告与分类面板

## ADDED Requirements

### Requirement: 卡片详情页可选择账单周期

系统 SHALL 在卡片详情页提供该卡历史账单周期的选择器，供用户查看某一期账单的报告与分类状态。

#### Scenario: 卡片有多期账单
- Given 某卡已上传过 3 期月账单
- When 用户打开该卡的详情页
- Then 账单周期下拉默认选中最新一期账单，其余两期可切换选择

#### Scenario: 卡片没有账单
- Given 某卡从未上传过月账单
- When 用户打开该卡的详情页
- Then 账单周期区块不显示

### Requirement: 按选中账单下载 PDF 报告

系统 SHALL 允许用户对选中的账单周期下载消费 PDF 报告，复用现有 `GET /api/uploads/[id]/report` 接口。

#### Scenario: 下载报告
- Given 用户已选中某期账单，且该账单状态为 DONE
- When 点击「下载报告」
- Then 浏览器下载对应账期的 PDF 文件，文件名包含账期起止日期

#### Scenario: 账单未处理完成
- Given 选中账单状态为 PENDING 或 PROCESSING
- When 查看操作区
- Then 「下载报告」按钮禁用

### Requirement: 按选中账单重新分类

系统 SHALL 允许用户对选中账单周期内的交易重新运行分类规则，复用现有 `POST /api/uploads/[id]/reclassify` 接口。

#### Scenario: 重新分类成功
- Given 用户已配置 AI Key 且存在启用的分类规则
- When 点击「重新分类」
- Then 显示本次分类笔数，且已分类的交易在明细中更新分类

#### Scenario: 未配置 AI Key
- Given 用户未配置 ANTHROPIC_API_KEY
- When 点击「重新分类」
- Then 显示错误提示「未配置 API Key」

### Requirement: 按选中账单查看未分类交易与大额交易

系统 SHALL 在选中账单下提供「未分类」和「大额」两个 tab：未分类 tab 按商户分组待分类交易并支持批量指定分类；大额 tab 展示本期 Top10 支出交易。

#### Scenario: 未分类交易按商户分组
- Given 选中账单存在 5 笔未分类交易，分属 3 个商户
- When 切换到「未分类」tab
- Then 显示 3 个商户分组，每组显示笔数、合计金额、最近交易日期

#### Scenario: 批量指定分类
- Given 未分类 tab 中某商户分组展开
- When 用户为该分组选择一个分类
- Then 该商户下所有未分类交易的 categoryId 更新为选中分类，分组从未分类列表中消失

#### Scenario: 查看大额交易
- Given 选中账单存在多笔支出交易
- When 切换到「大额」tab
- Then 按金额降序展示前 10 笔支出交易，每笔可直接编辑分类和备注

## API 变更

### `GET /api/cards/[id]/uploads`（新增）

返回该卡的历史账单列表，按账期倒序（账期缺失的按创建时间倒序兜底）。

```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx",
      "originalName": "bill_202408.msg",
      "imageMonth": "2026-08",
      "billingStart": "2026-07-18T00:00:00.000Z",
      "billingEnd": "2026-08-17T00:00:00.000Z",
      "dueDate": "2026-09-08T00:00:00.000Z",
      "status": "DONE",
      "txCount": 42,
      "createdAt": "2026-08-11T10:00:00.000Z"
    }
  ]
}
```

若 `id` 对应的卡片不存在，返回 `{ success: false, error: "卡片不存在" }`，状态码 404。

## 验收

- [ ] `GET /api/cards/[id]/uploads` 只返回该卡的账单，按账期倒序
- [ ] 卡片详情页新增账单周期选择器，默认选中最新账期
- [ ] 报告下载、重新分类按钮行为与迁移前的 `UploadBatchCard` 一致
- [ ] 未分类 tab 商户分组、批量分类逻辑与迁移前一致
- [ ] 大额 tab 排序、行内编辑逻辑与迁移前一致
- [ ] 无账单的卡片不显示账单周期区块
