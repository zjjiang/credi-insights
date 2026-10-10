# Delta: ai-classification

## ADDED Requirements

### Requirement: 推理模型兼容
AI 分类 SHALL 在调用推理模型（`glm-*`）时禁用思考模式，确保 `max_tokens` 预算全部用于正文 JSON 输出。

#### Scenario: GLM 模型请求携带思考关闭参数
- **WHEN** AI_MODEL 为 `glm-5.3` 且执行分类批次
- **THEN** chat.completions 请求包含 `thinking: { type: "disabled" }`

#### Scenario: 非 GLM 模型不受影响
- **WHEN** AI_MODEL 为 `qwen-plus` 且执行分类批次
- **THEN** 请求不包含 `thinking` 参数

### Requirement: 输出预算充足
分类请求的 `max_tokens` SHALL 为 4096，容纳单批 20 笔交易的 JSON 数组输出。

#### Scenario: 单批满额交易
- **WHEN** 一批包含 20 笔交易且全部能匹配
- **THEN** 请求 max_tokens 为 4096

### Requirement: 截断可观测
响应 `finish_reason` 为 `length` 或正文 JSON 解析失败时，系统 SHALL 输出包含模型名与 token 用量的告警日志，并按空结果降级。

#### Scenario: 思考占用导致截断
- **WHEN** 响应 finish_reason 为 length
- **THEN** 打印 warn 日志（含 model、completion_tokens）且该批次返回空数组
