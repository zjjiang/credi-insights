# Delta: ai-tools

## ADDED Requirements

### Requirement: 共享工具注册表
系统 SHALL 提供单一工具注册表 `src/lib/ai-tools.ts`，MCP server 与应用内 AI 助手均从注册表获取工具定义与执行逻辑，工具行为一致。

#### Scenario: 两侧工具集合一致
- **WHEN** 对比 MCP 工具列表与助手工具列表
- **THEN** 除 sync_card（MCP 独有）外，两侧工具名称与行为完全一致

#### Scenario: 工具实现只存在一份
- **WHEN** 查找 create_category 的执行逻辑
- **THEN** 仅在 ai-tools.ts 中存在一处实现

### Requirement: 助手分类管理闭环
应用内 AI 助手 SHALL 支持查询分类、创建分类、查询规则、创建规则，形成「查→建→验证」闭环。

#### Scenario: 助手创建分类
- **WHEN** 用户对助手说「加一个分类叫宠物」
- **THEN** 助手调用 create_category，返回新分类信息

#### Scenario: 创建重名分类被拒绝
- **WHEN** create_category 传入已存在的分类名
- **THEN** 返回明确错误「分类已存在」，不创建

#### Scenario: 创建规则后可查证
- **WHEN** 助手调用 create_rule 后用户询问当前规则
- **THEN** list_rules 返回包含新规则的完整列表

### Requirement: 助手 glm 兼容
chat 路由 SHALL 在 glm 系模型下禁用思考并提升输出预算，与 AI 分类一致的兼容策略。

#### Scenario: glm 模型请求
- **WHEN** AI_MODEL 为 glm-5.3 时发起对话
- **THEN** 请求携带 thinking:{type:'disabled'} 且 max_tokens 为 4096

### Requirement: 工具输入校验
所有工具 SHALL 在执行前校验必填字段，缺失时返回中文错误信息而不执行数据库操作。

#### Scenario: 创建规则缺分类
- **WHEN** create_rule 未传 categoryId
- **THEN** 返回错误信息，不写数据库
