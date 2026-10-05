# upload-card-linking

## Purpose

定义月账单上传与卡片的自动关联能力：上传账单时按卡号识别所属卡片，账单与交易自动挂到该卡片下，卡片详情页可查看历史账单列表。

## Requirements

### Requirement: 上传账单自动关联卡片
系统 SHALL 在上传月账单 `.msg` 文件时，自动识别卡号并关联到 Card，若卡片不存在则提示先添加。

#### Scenario: 上传已配置卡片的账单
- **WHEN** 用户上传一张已添加卡片的月账单（如招商 0094 卡已配置）
- **THEN** 系统自动关联到该卡片，显示成功 toast

#### Scenario: 上传未配置卡片的账单
- **WHEN** 用户上传一张未添加卡片的月账单（如浦发 1234 卡未配置）
- **THEN** 系统返回错误「卡片未配置，请先在首页添加卡片（卡号：1234）」及 code "CARD_NOT_FOUND"

#### Scenario: 查看卡片历史账单
- **WHEN** 用户在卡片详情页查看账单列表
- **THEN** 显示该卡的所有历史账单，包含账期、笔数、上传时间

#### Scenario: 账单列表显示卡片信息
- **WHEN** 用户查看账单列表
- **THEN** 每条账单显示关联的卡片别名和卡号

### Requirement: 上传 API 关联逻辑
`POST /api/uploads` SHALL 在解析出 `cardLast4` 后查询 `Card.findFirst({ where: { cardLast4 } })`：
卡片不存在时返回 `{ success: false, code: "CARD_NOT_FOUND" }`；存在时绑定 `Upload.cardId` 和所有 `Transaction.cardId`。

#### Scenario: 成功响应包含卡片信息
- **WHEN** 账单上传成功
- **THEN** 返回 `{ success: true, data: { uploadId, cardId, cardAlias } }`

#### Scenario: 指纹去重合并时保留用户分类
- **WHEN** 上传过程中发生指纹去重合并
- **THEN** 保持已有 `categoryId` 不变

### Requirement: 卡片历史账单 API
`GET /api/cards/[cardId]/uploads` SHALL 返回该卡的历史账单列表（id、originalName、billingStart、billingEnd、dueDate、txCount、createdAt）。

#### Scenario: 拉取卡片账单列表
- **WHEN** 调用 `GET /api/cards/[cardId]/uploads`
- **THEN** 返回 `{ success: true, data: { uploads: [...] } }`，按账期排序

### Requirement: 上传失败前端提示
前端 SHALL 在上传返回 `code: "CARD_NOT_FOUND"` 时提示用户先添加卡片，并提供跳转 `/cards/new`（预填 cardLast4）的入口。

#### Scenario: 用户点击添加卡片
- **WHEN** 用户在失败提示中点击「返回首页添加卡片」
- **THEN** 跳转 `/cards/new` 并预填检测到的卡号
