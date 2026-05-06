/**
 * 第三方供应商弹窗描述/提示/出口标签补丁
 *
 * c71860c77-BhZmb39A.js 中的 description/hint/egressRequirementsLabel
 * 字段为硬编码英文，此脚本直接替换为中文。
 *
 * 用法: node patch-3p-descriptions.js
 */
const fs = require('fs');
const path = require('path');
const claude = require('./find-claude');

const cliAssets = process.argv[2] || process.env.CLAUDE_ZH_ASSETS;
let assetsDir;
if (cliAssets) {
  assetsDir = path.resolve(cliAssets);
} else {
  const claudeDir = claude.findClaudePackage();
  if (!claudeDir) { console.error('✗ 未找到 Claude Desktop 安装'); process.exit(1); }
  assetsDir = claude.getAssetsDir(claude.getResourcesDir(claude.getAppDir(claudeDir)));
}

function findTargetFile(dir) {
  const preferred = path.join(dir, 'c71860c77-BhZmb39A.js');
  if (fs.existsSync(preferred)) return preferred;

  const needle = 'Permit users to install local desktop extensions';
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const fullPath = path.join(dir, file);
    try {
      if (fs.readFileSync(fullPath, 'utf-8').includes(needle)) return fullPath;
    } catch (_) {}
  }
  return preferred;
}

const FILE = findTargetFile(assetsDir);

// ── 翻译映射 ──
// Key = 英文原文, Value = 中文翻译
const TRANSLATIONS = {
  // ── description ──
  'Permit users to install local desktop extensions (.dxt/.mcpb).':
    '允许用户安装本地桌面扩展（.dxt/.mcpb）。',
  'Show the Anthropic extension directory in the connectors UI.':
    '在连接器界面中显示 Anthropic 扩展目录。',
  'Reject desktop extensions that are not signed by a trusted publisher.':
    '拒绝未经受信任发布者签名的桌面扩展。',
  'Permit users to add their own local (stdio) MCP servers via Developer settings. HTTP/SSE servers are managed separately. When false, only servers from the Managed MCP servers list and org-provisioned plugins are available.':
    '允许用户通过开发者设置添加本地（stdio）MCP 服务器。HTTP/SSE 服务器单独管理。关闭时仅提供托管 MCP 服务器列表和组织配置插件中的服务器。',
  'Show the Code tab (terminal-based coding sessions). Sessions run on the host, not inside the VM.':
    '显示 Code 标签页（基于终端的编码会话）。会话在主机上运行，而非虚拟机内部。',
  'Forces the agent loop, file/web tools, and plugin-bundled MCPs to run inside the VM, disabling host-loop mode.':
    '强制代理循环、文件/网络工具和插件绑定的 MCP 在虚拟机内运行，禁用主机循环模式。',
  'Base URL of an OpenTelemetry collector. When set, Cowork sessions export logs and metrics (prompts, tool calls, token counts) to this endpoint via OTLP. The endpoint host is automatically added to the session network allowlist.':
    'OpenTelemetry 收集器的基本 URL。设置后 Cowork 会话通过 OTLP 将日志和指标（提示、工具调用、令牌数）导出到此端点。端点主机自动加入会话网络允许列表。',
  'OTLP wire protocol used to reach the collector. Defaults to http/protobuf when otlpEndpoint is set.':
    '用于连接收集器的 OTLP 传输协议。设置 otlpEndpoint 时默认为 http/protobuf。',
  'Headers sent with every OTLP request, as comma-separated key=value pairs (the standard OTEL_EXPORTER_OTLP_HEADERS format).':
    '每次 OTLP 请求发送的标头，以逗号分隔的 key=value 对形式（标准 OTEL_EXPORTER_OTLP_HEADERS 格式）。',
  "Extra OTEL resource attributes as comma-separated key=value pairs (the standard OTEL_RESOURCE_ATTRIBUTES format). Appended to the app's built-in attributes; keys that collide with built-ins (e.g. service.name) are dropped. Scoped for bootstrap so per-user values can be returned at sign-in.":
    '额外的 OTEL 资源属性，以逗号分隔的 key=value 对形式（标准 OTEL_RESOURCE_ATTRIBUTES 格式）。附加到应用内置属性后；与内置属性冲突的键（如 service.name）会被丢弃。作用域为启动配置以便登录时返回每个用户的值。',
  'When set, forces a pending update to install after this many hours regardless of user activity. When unset, the app uses a 72-hour window but defers installation while the user is active.':
    '设置后强制待更新在此小时后安装，无论用户是否活跃。未设置时应用使用 72 小时间隔，但用户活跃时会推迟安装。',
  "Blocks the app from checking for and downloading updates from Anthropic. The app will stay on its installed version until updated by other means.":
    '阻止应用检查和下载 Anthropic 的更新。应用将保持当前版本，直到通过其他方式更新。',
  "Skips the first-launch screen that asks the user to choose between Anthropic sign-in and the organization-managed provider. The app goes straight to the mode implied by this configuration (third-party when inferenceProvider is set), overriding any earlier user choice.":
    '跳过首次启动时选择 Anthropic 登录或组织管理提供商的屏幕。应用直接进入配置指定的模式（设置 inferenceProvider 时为第三方模式），覆盖任何先前的选择。',
  'Restricts login to specific org UUID(s). Single UUID string or JSON array.':
    '限制登录到特定组织 UUID。单个 UUID 字符串或 JSON 数组。',
  'Selects the inference backend. Setting this key activates third-party mode.':
    '选择推理后端。设置此键激活第三方模式。',
  'Full URL of the inference gateway endpoint.':
    '推理网关端点的完整 URL。',
  "How to send the gateway credential. 'bearer' (default) sends Authorization: Bearer. Set 'x-api-key' only if your gateway requires the x-api-key header instead (e.g. api.anthropic.com). Set 'sso' to obtain the credential via the gateway's own browser-based sign-in (RFC 8414 discovery at `<inferenceGatewayBaseUrl>/.well-known/oauth-authorization-server` + RFC 8628 device-code grant); inferenceGatewayApiKey and inferenceCredentialHelper are not required.":
    "设置网关凭据的发送方式。'bearer'（默认）发送 Authorization: Bearer 标头。仅当网关要求 x-api-key 标头时（如 api.anthropic.com）才设'x-api-key'。设'sso'通过网关的浏览器登录获取凭据（在 <inferenceGatewayBaseUrl>/.well-known/oauth-authorization-server 进行 RFC 8414 发现 + RFC 8628 设备码授权）；无需设置 inferenceGatewayApiKey 和 inferenceCredentialHelper。",
  "Extra HTTP headers sent on every inference request. JSON array of 'Name: Value' strings.":
    "每次推理请求发送的额外 HTTP 标头。'Name: Value' 字符串的 JSON 数组。",
  'GCP region for the Vertex AI endpoint.':
    'Vertex AI 端点的 GCP 区域。',
  'Absolute path to a service-account JSON or ADC file. No tilde or environment-variable expansion.':
    '服务账号 JSON 或 ADC 文件的绝对路径。不支持波浪号或环境变量展开。',
  'Client ID of a Desktop-app OAuth client created in your GCP project (APIs & Services → Credentials). When set together with the client secret, the app runs Sign in with Google and stores the resulting refresh token encrypted; `inferenceVertexCredentialsFile` is not needed.':
    'GCP 项目中创建的桌面应用 OAuth 客户端 ID（API 和服务 → 凭据）。与客户端密钥一同设置时应用运行 Google 登录并加密存储刷新令牌；无需设置 `inferenceVertexCredentialsFile`。',
  "Client secret for the Desktop-app OAuth client. Not confidential for installed apps per Google's docs — PKCE protects the flow.":
    '桌面应用 OAuth 客户端的客户端密钥。根据 Google 文档安装应用无需保密 — PKCE 保护流程安全。',
  "Space-separated OAuth scopes for the Google sign-in flow. Defaults to `openid email https://www.googleapis.com/auth/cloud-platform`. Narrow this if your Workspace's Context-Aware Access or reauth policy restricts `cloud-platform`.":
    'Google 登录流程的 OAuth 范围（空格分隔）。默认为 `openid email https://www.googleapis.com/auth/cloud-platform`。如工作区的上下文感知访问或重新认证策略限制了 `cloud-platform` 请缩小此范围。',
  'Override the Vertex inference endpoint (e.g. a Private Service Connect address). Leave unset to use the public regional endpoint.':
    '覆盖 Vertex 推理端点（如 Private Service Connect 地址）。留空以使用公共区域端点。',
  'AWS region for the Bedrock runtime endpoint.':
    'Bedrock 运行时端点的 AWS 区域。',
  'Override the Bedrock inference endpoint (e.g. a VPC interface endpoint or LLM gateway). Leave unset to use the public regional endpoint.':
    '覆盖 Bedrock 推理端点（如 VPC 接口端点或 LLM 网关）。留空以使用公共区域端点。',
  'AWS named profile to use (from the AWS config/credentials files). Ignored when inferenceBedrockBearerToken is set.':
    '要使用的 AWS 命名配置文件（来自 AWS config/credentials 文件）。设置 inferenceBedrockBearerToken 时忽略。',
  "Absolute path to the directory containing AWS config and credentials files. Optional — defaults to the user's ~/.aws when inferenceBedrockBearerToken is not set. Copied into the sandbox at session start so the named profile can be resolved.":
    '包含 AWS 配置和凭据文件的目录绝对路径。可选 — 未设置 inferenceBedrockBearerToken 时默认为 ~/.aws。会话启动时复制到沙盒以便解析命名配置文件。',
  'Bedrock service tier, sent as the X-Amzn-Bedrock-Service-Tier header. Leave unset for on-demand. Tier availability varies by model and region. Reserved capacity uses a provisioned throughput ARN as the model ID instead of this setting. Older bundled Claude Code CLI versions ignore this key.':
    'Bedrock 服务层级作为 X-Amzn-Bedrock-Service-Tier 标头发送。留空使用按需模式。层级可用性因模型和区域而异。预留容量使用预置吞吐量 ARN 作为模型 ID。较旧的捆绑 Claude Code CLI 版本忽略此键。',
  'Azure AI Foundry resource name used to construct the endpoint URL.':
    '用于构建端点 URL 的 Azure AI Foundry 资源名称。',
  'Stable identifier for this deployment, used to scope local storage and telemetry. Must be a UUID.':
    '此部署的稳定标识符，用于限定本地存储和遥测范围。必须是 UUID。',
  'Blocks crash and error reports (stack traces, app state at failure, device/OS info) and performance timing data sent to Anthropic. Used to investigate bugs and monitor responsiveness.':
    '阻止向 Anthropic 发送崩溃和错误报告（堆栈跟踪、故障时应用状态、设备/OS 信息）及性能计时数据。用于调查错误和监控响应能力。',
  'Blocks product-usage analytics sent to Anthropic — feature usage, navigation patterns, UI actions.':
    '阻止向 Anthropic 发送产品使用分析 — 功能使用情况、导航模式、UI 操作。',
  'Blocks connector favicons (fetched from a third-party favicon service — leaks MCP hostnames) and the artifact-preview sandbox iframe. Connectors fall back to letter icons; artifacts do not render.':
    '阻止连接器图标（从第三方图标服务获取 — 泄露 MCP 主机名）和 artifact 预览沙盒 iframe。连接器回退到字母图标；artifact 无法渲染。',
  'JSON array of absolute paths the user may attach as workspace folders. A leading ~ expands to the per-user home directory. Unset means unrestricted.':
    '用户可作为工作区文件夹附加的绝对路径 JSON 数组。开头的 ~ 展开为用户主目录。未设置表示无限制。',
  'Absolute path to an executable that prints the inference credential to stdout. When set, the static inferenceGatewayApiKey / inferenceFoundryApiKey is optional.':
    '将推理凭据输出到 stdout 的可执行文件绝对路径。设置后静态的 inferenceGatewayApiKey / inferenceFoundryApiKey 变为可选。',
  'Helper output is cached for this many seconds. Default 3600. Re-runs at the next session start after expiry.':
    '辅助脚本输出缓存此秒数。默认 3600。过期后下次会话启动时重新运行。',
  'When unset or true, the app fetches `bootstrapUrl` at launch and applies the response as a config overlay. Set false to keep the URL saved but skip the fetch.':
    '未设置或为 true 时应用启动时获取 `bootstrapUrl` 并将响应作为配置覆盖应用。设为 false 可保留 URL 但跳过获取。',
  "HTTPS endpoint fetched at app launch. The JSON response body overrides per-user provider config (project ID, region, base URL, model list, credential, OTLP endpoint) for the current user. When `bootstrapOidc` is unset, the app signs in via RFC 8628 device-code: discovery hits `<bootstrapUrl-minus-trailing-/bootstrap>/.well-known/oauth-authorization-server` (the path-scoped issuer base, not the bare origin); when the response's `inferenceGatewayBaseUrl` shares this origin, the same session authorizes inference.":
    '应用启动时获取的 HTTPS 端点。JSON 响应体覆盖当前用户的供应商配置（项目 ID、区域、基础 URL、模型列表、凭据、OTLP 端点）。未设置 `bootstrapOidc` 时应用通过 RFC 8628 设备码登录：发现路径为 `<bootstrapUrl-minus-trailing-/bootstrap>/.well-known/oauth-authorization-server`；当响应的 `inferenceGatewayBaseUrl` 共享此域名时同一会话授权推理。',
  'JSON object: `clientId` (required), and either `issuer` (https URL — endpoints discovered via /.well-known/openid-configuration) or both `authorizationUrl` and `tokenUrl`. Optional: `scopes` (space-separated string), `redirectPort` (pin the loopback callback port for IdPs that require an exact redirect URI). When set, the app runs an authorization-code-with-PKCE flow in the system browser and sends the resulting access token as a Bearer header on the bootstrap request. When unset, the app instead runs an RFC 8628 device-code flow; discovery hits `<bootstrapUrl-minus-trailing-/bootstrap>/.well-known/oauth-authorization-server` (the path-scoped issuer base, not the bare origin).':
    'JSON 对象：`clientId`（必需），以及 `issuer`（HTTPS URL — 通过 /.well-known/openid-configuration 发现端点）或同时提供 `authorizationUrl` 和 `tokenUrl`。可选：`scopes`（空格分隔字符串）、`redirectPort`（为需要精确重定向 URI 的 IdP 固定回调端口）。设置后在系统浏览器中运行 authorization-code-with-PKCE 流程并将访问令牌作为 Bearer 标头发送。未设置时改为运行 RFC 8628 设备码流程。',
  'Total input+output tokens permitted per window before further messages are refused. Unset = no cap.':
    '每窗口允许的输入+输出令牌总数，超出后拒绝后续消息。未设置 = 无上限。',
  'Tumbling window length for the token cap. Max 720 hours (30 days). The counter resets at the end of each window.':
    '令牌上限的滚动窗口长度。最长 720 小时（30 天）。计数器在每个窗口结束时重置。',
  'Choose where Claude Desktop sends inference requests.':
    '选择 Claude Desktop 发送推理请求的位置。',
  "Hosts your network firewall must allow, derived from your current settings. This list is read-only and updates as you make changes. Traffic is HTTPS on port 443 unless a custom port is specified (OTLP, gateway, or MCP server URLs).":
    '您的网络防火墙必须允许的主机，根据当前设置自动生成。此列表只读并随更改更新。除非指定了自定义端口（OTLP、网关或 MCP 服务器 URL），否则流量使用 HTTPS 端口 443。',

  // ── hint ──
  "First entry is the picker default. Aliases like sonnet, opus accepted. Optional for gateway — when set, the picker shows exactly this list instead of /v1/models discovery. Turn on 1M context only for models your provider actually serves with the extended window.":
    '首个条目为选择器默认值。接受 sonnet、opus 等别名。网关可选 — 设置后选择器仅显示此列表而非 /v1/models 发现。仅为供应商实际提供扩展窗口的模型开启 1M 上下文。',
  'Tags telemetry events with your org so support can find them. Not used for auth.':
    '用您的组织标记遥测事件以便支持团队查找。不用于认证。',
  "Go straight to this provider at launch — users won't see the option to sign in to Anthropic instead.":
    '启动时直接进入此供应商 — 用户将看不到登录 Anthropic 的选项。',
  'HTTPS endpoint that returns a per-user JSON config overlay. Values from the response override local settings and become read-only.':
    '返回每用户 JSON 配置覆盖的 HTTPS 端点。响应值覆盖本地设置并变为只读。',
  'When set, the bootstrap request sends a Bearer token from a browser sign-in (authorization-code-with-PKCE).':
    '设置后启动请求发送来自浏览器登录的 Bearer 令牌（authorization-code-with-PKCE）。',
  'Fetch and apply the URL above at launch. Turn off to keep the URL saved but skip the fetch.':
    '启动时获取并应用上述 URL。关闭可保留 URL 但跳过获取。',
  'Bearer (default) sends Authorization: Bearer. x-api-key is for the Anthropic API directly — auto-selected when the URL is *.anthropic.com.':
    'Bearer（默认）发送 Authorization: Bearer 标头。x-api-key 直接用于 Anthropic API — URL 为 *.anthropic.com 时自动选择。',
  "Extra headers sent to the gateway, one 'Name: Value' per entry. For tenant routing, org IDs, etc.":
    "发送到网关的额外标头，每项一个 'Name: Value'。用于租户路由、组织 ID 等。",
  'GCP region where your Vertex AI Claude models are deployed.':
    '您的 Vertex AI Claude 模型部署所在的 GCP 区域。',
  'Absolute path to service-account JSON. Leave blank to fall back to ADC.':
    '服务账号 JSON 的绝对路径。留空以回退到 ADC。',
  'Desktop-app OAuth client ID — enables Sign in with Google instead of a credentials file.':
    '桌面应用 OAuth 客户端 ID — 启用 Google 登录以替代凭据文件。',
  'Secret for the Desktop-app OAuth client above.':
    '上述桌面应用 OAuth 客户端的密钥。',
  'Override the Google OAuth scopes (space-separated). Leave blank for the default.':
    '覆盖 Google OAuth 范围（空格分隔）。留空使用默认值。',
  'PSC endpoint, if using one.':
    'PSC 端点（如使用）。',
  'Overrides profile when both are set.':
    '同时设置时覆盖配置文件。',
  'For VPC endpoints or gateway proxies.':
    '用于 VPC 端点或网关代理。',
  'Ignored if a bearer token is set.':
    '如设置了 bearer 令牌则忽略。',
  "Folder with AWS config/credentials. Defaults to ~/.aws when no bearer token is set.":
    '包含 AWS 配置/凭据的文件夹。未设置 bearer 令牌时默认为 ~/.aws。',
  'Absolute path to an executable that prints the credential.':
    '输出凭据的可执行文件的绝对路径。',
  'Runs tools inside an isolated VM instead of the host. Stronger isolation; slower file access and no host-process tools.':
    '在隔离虚拟机中运行工具而非主机。更强隔离性；文件访问较慢且无主机进程工具。',
  "Domains Cowork's tools may reach during a turn. Also surfaced under Egress Requirements.":
    'Cowork 工具在一次交互中可访问的域名。也会在出口要求中显示。',
  'Folders users may attach as a workspace. Leave unset for unrestricted access.':
    '用户可作为工作区附加的文件夹。留空表示无限制访问。',
  'Built-in tools removed from Cowork.':
    '从 Cowork 中移除的内置工具。',
  'The in-app catalogue of installable extensions. Hide to allow sideload only.':
    '应用内可安装扩展目录。隐藏以仅允许侧载。',
  "Local stdio servers added via the Developer settings. Remote servers come from the managed list above, or plugins mounted to a user's computer by an organization admin.":
    '通过开发者设置添加的本地 stdio 服务器。远程服务器来自上述托管列表或由组织管理员挂载的插件。',
  'Org-pushed remote MCP servers. May embed bearer tokens.':
    '组织推送的远程 MCP 服务器。可能嵌入 bearer 令牌。',
  'Crash and performance reports to Anthropic.':
    '向 Anthropic 发送的崩溃和性能报告。',
  'Product-usage analytics and diagnostic-report uploads. No message content.':
    '产品使用分析和诊断报告上传。不含消息内容。',
  'Favicon fetch and the artifact-preview iframe origin. Artifacts will not render.':
    '图标获取和 artifact 预览 iframe 来源。Artifact 将无法渲染。',
  "Stop Cowork from fetching updates. You'll need to push new versions yourself.":
    '阻止 Cowork 获取更新。您需要自行推送新版本。',
  'Hours before a downloaded update force-installs. Blank = 72-hour default.':
    '已下载更新强制安装前的小时数。留空 = 72 小时默认值。',
  'Where Cowork sends OpenTelemetry logs and metrics. Leave blank to disable.':
    'Cowork 发送 OpenTelemetry 日志和指标的位置。留空以禁用。',
  'grpc or http/protobuf.':
    'grpc 或 http/protobuf。',
  'Optional auth headers for the collector.':
    '收集器的可选认证标头。',
  'Extra resource attributes to attach to every span/metric, e.g. enduser.id=alice@example.com.':
    '附加到每个 span/指标的额外资源属性，例如 enduser.id=alice@example.com。',
  'Per-user soft cap, counted client-side over the duration below. Not a server-enforced quota.':
    '每用户软上限，在客户端按以下时长计数。非服务器强制配额。',

  // ── egressRequirementsLabel ──
  'Desktop extensions (Python runtime)':
    '桌面扩展（Python 运行时）',
  'User-added MCP (Python runtime)':
    '用户添加的 MCP（Python 运行时）',
  'Tool egress (VM sandbox)':
    '工具出口（VM 沙盒）',
  'Bootstrap config server':
    '启动配置服务器',
  'Bootstrap sign-in (OIDC)':
    '启动登录（OIDC）',
};

function backupFile(filePath) {
  const backupDir = path.join(
    process.env.LOCALAPPDATA || process.env.USERPROFILE,
    'Claude-zh-CN-backup', 'patches'
  );
  const dst = path.join(backupDir, path.basename(filePath));
  if (fs.existsSync(dst)) return;
  fs.mkdirSync(backupDir, { recursive: true });
  try {
    const content = fs.readFileSync(filePath);
    fs.writeFileSync(dst, content);
    console.log('  ✓ 已备份: ' + path.basename(filePath));
  } catch (e) {
    console.log('  · 备份跳过（不影响补丁）: ' + path.basename(filePath));
  }
}

function main() {
  console.log('');
  console.log('  第三方供应商弹窗 描述/提示/出口标签补丁');
  console.log('  ' + '='.repeat(40));
  console.log('');

  if (!fs.existsSync(FILE)) {
    console.log('  · 未找到第三方供应商描述目标文件，跳过');
    console.log('');
    return;
  }

  let content = fs.readFileSync(FILE, 'utf-8');
  let total = 0;
  const keys = Object.keys(TRANSLATIONS);

  for (const eng of keys) {
    const chn = TRANSLATIONS[eng];
    // Try to match as description/hint/egressRequirementsLabel + the English string
    const patterns = [
      'description:"' + eng + '"',
      'hint:"' + eng + '"',
      'egressRequirementsLabel:"' + eng + '"',
    ];
    let matched = false;
    for (const p of patterns) {
      if (content.includes(p)) {
        const replacement = p.replace(eng, chn);
        // Use replace (not replaceAll) to avoid conflicts
        content = content.replace(p, replacement);
        console.log('  ✓ ' + p.substring(0, 60) + '...');
        matched = true;
        total++;
        break;
      }
    }
    if (!matched) {
      // Try case-insensitive / different encoding
      console.log('  ? 未匹配: ' + eng.substring(0, 60) + '...');
    }
  }

  if (total > 0) {
    backupFile(FILE);
    fs.writeFileSync(FILE, content, 'utf-8');
    console.log('');
    console.log('  共 ' + total + ' 处翻译已应用');
  } else {
    console.log('  无变化');
  }
  console.log('');
}

main();
