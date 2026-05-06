# Claude Desktop 翻译策略

## 翻译原则

### 1. 产品名称 - 保留英文
这些是产品名称/品牌，应保留原样：
- **Cowork** - 保留（产品名）
- **Operon** - 保留（产品名）
- **Artifact / Artifacts** - 保留（产品功能名，翻译为"神器"/"工件"均不恰当）
- **Claude Code** - 保留
- **MCP** - 保留（技术缩写）
- **3P** - 保留或翻译为"第三方集成"

### 2. 通用 UI 词汇 - 翻译为中文
- Chat → 聊天
- Code → 代码
- Projects → 项目
- Tasks → 任务
- Settings → 设置
- Documents → 文档
- Files → 文件
- Connected → 已连接
- Disconnected → 已断开
- Loading → 加载中

### 3. 技术术语 - 根据上下文
- Gateway → 根据场景：
  - 设置项 "Gateway base URL" → "自定义端点 Base URL"
  - 泛指 "gateway" → "网关"
- Sandbox → 沙盒
- VM → 虚拟机
- Workspace → 工作区

### 4. 动词/操作 - 翻译
- Create → 创建
- Delete → 删除
- Edit → 编辑
- Save → 保存
- Cancel → 取消
- Confirm → 确认
- Close → 关闭
- Search → 搜索
- Filter → 筛选

## 禁止翻译
- 占位符: `{name}`, `{count}`, `{date}`
- 品牌名称: Claude, Anthropic
- 域名: github.com, claude.ai
- 技术标准: API, JSON, URL, SSH, HTTP

## 翻译质量标准
1. 通顺自然，符合中文表达习惯
2. 不直译，保持语义一致
3. 保持一致性（同一个词始终翻译为同一个中文）
4. 长度适中，不超过原文太多
