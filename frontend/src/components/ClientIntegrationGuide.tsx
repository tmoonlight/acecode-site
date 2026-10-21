import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppWindow,
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  KeyRound,
  Sparkles,
  Terminal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const API_ROOT_URL = 'https://acecode.cc/aceapi'
const API_BASE_URL = `${API_ROOT_URL}/v1`

type GuideTab = 'ccswitch' | 'acecode' | 'codex' | 'claude' | 'sdk' | 'clients'

type GuideCopy = {
  menu: string
  close: string
  eyebrow: string
  title: string
  description: string
  baseUrl: string
  apiKey: string
  apiKeyHint: string
  copy: string
  copied: string
  quickStart: string
  fullDocs: string
  acecodeDocs: string
  tabs: Record<GuideTab, string>
  acecodeTitle: string
  acecodeDescription: string
  acecodeSteps: string[]
  codexTitle: string
  codexDescription: string
  codexStep1: string
  codexStep2: string
  claudeTitle: string
  claudeDescription: string
  claudeStep1: string
  claudeStep2: string
  sdkTitle: string
  sdkDescription: string
  ccswitchTitle: string
  ccswitchDescription: string
  ccswitchSteps: string[]
  ccswitchFields: Array<[string, string]>
  ccswitchAuth: string
  ccswitchConfig: string
  ccswitchClaude: string
  ccswitchClaudeSteps: string[]
  ccswitchTrouble: string
  ccswitchDownload: string
  ccswitchDocs: string
  clientsTitle: string
  clientsDescription: string
  clientFields: Array<[string, string]>
  modelsTitle: string
  modelsDescription: string
  modelRows: Array<[string, string, string]>
  endpointTitle: string
  endpointDescription: string
  endpointRows: Array<[string, string]>
  noteTitle: string
  noteBody: string
}

const COPY: Record<'zh' | 'zh-TW' | 'en', GuideCopy> = {
  zh: {
    menu: '接入教程',
    close: '关闭接入教程',
    eyebrow: 'ACEModel / Client setup',
    title: 'ACEModel 大模型接入指南',
    description:
      '在 ACECode 中选择 ACEModel 服务商，或在兼容客户端中填写 API 地址与用户中心创建的 Key。',
    baseUrl: 'API 基础地址',
    apiKey: 'API Key',
    apiKeyHint: '使用用户中心创建的 API Key',
    copy: '复制',
    copied: '已复制',
    quickStart: '选择客户端',
    fullDocs: '查看 ACECode 完整文档',
    acecodeDocs: '查看 ACEModel 详细教程',
    tabs: {
      acecode: 'ACECode（推荐）',
      ccswitch: 'CC Switch',
      codex: 'Codex CLI',
      claude: 'Claude Code',
      sdk: 'OpenAI SDK',
      clients: '其他客户端',
    },
    acecodeTitle: '在 ACECode 中使用 ACEModel',
    acecodeDescription:
      'ACECode 已原生内置 ACEModel 服务商，接口地址和模型目录都已准备好，只需粘贴本站 API Key。',
    acecodeSteps: [
      '打开 ACECode，进入“设置 → 模型 → 新增模型”。',
      '在服务商列表中选择“ACEModel”。',
      '粘贴在 ACEProxy 用户中心创建的 API Key。',
      '选择 moonlight / starrylight / aurora，保存后设为默认模型。',
    ],
    codexTitle: 'Codex CLI 配置',
    codexDescription:
      '将配置写入 ~/.codex/config.toml，再通过环境变量提供密钥。aurora 默认使用高推理强度。',
    codexStep1: '1. 写入 ~/.codex/config.toml',
    codexStep2: '2. 设置密钥并启动',
    claudeTitle: 'Claude Code 配置',
    claudeDescription:
      '本站客户 Key 开放 Responses / Chat 文本与工具调用。使用 Claude Code 时，通过 CC Switch 的本地路由转换协议，不直接请求 /messages。',
    claudeStep1: 'macOS / Linux',
    claudeStep2: 'Windows PowerShell',
    sdkTitle: 'OpenAI SDK / curl',
    sdkDescription:
      '接口同时兼容 Responses API 与 Chat Completions。新项目建议优先使用 Responses API。',
    ccswitchTitle: '通过 CC Switch 接入 ACEModel',
    ccswitchDescription: '先在用户中心复制 API Key。推荐在 CC Switch 的 Codex 页面添加 ACEModel，使用 Responses 原生直连。',
    ccswitchSteps: [
      '安装并打开 CC Switch，选择 Codex，点击“添加供应商”，选择“自定义配置”。',
      '名称填 ACEModel，填入下表的 API 地址和模型，将本站 Key 粘贴到 API Key / auth.json 编辑区。',
      '上游格式选择 Responses（原生）。下方提供 auth.json 和 config.toml 编辑区的参考内容；认证项由 CC Switch 管理。',
      '点击“添加”后，在供应商卡片上点击“启用”或“使用”。退出并重新启动 Codex，再发起一个简短任务。',
    ],
    ccswitchFields: [['应用', 'Codex'], ['供应商名称', 'ACEModel'], ['API 地址', API_BASE_URL], ['模型', 'aurora / moonlight / starrylight'], ['上游格式', 'Responses（原生）']],
    ccswitchAuth: 'CC Switch 的 auth.json 编辑区',
    ccswitchConfig: 'CC Switch 的 config.toml 编辑区',
    ccswitchClaude: '在 CC Switch 中配置 Claude Code',
    ccswitchClaudeSteps: [
      '选择 Claude → 添加供应商 → 自定义，填入同一个本站 Key，模型填 aurora。',
      '请求地址填 https://acecode.cc/aceapi/v1/responses，开启“完整 URL”，上游格式选“OpenAI Responses API”。',
      '保存供应商后进入“路由”，点击“开始路由”并选择 ACEModel；使用期间保持 CC Switch 运行。旧版界面可能称为“本地代理 / 接管”。',
    ],
    ccswitchTrouble: '401/403：检查 Key 与账户状态；404：检查 /aceapi 和 /v1 是否重复或缺失。模型列表获取失败时可手动填写 aurora。仍使用旧配置时重新启用供应商并重启客户端；通过 Key 的使用详情查看是否产生请求。',
    ccswitchDownload: '下载 CC Switch',
    ccswitchDocs: 'CC Switch 官方配置文档',
    clientsTitle: 'Cherry Studio、Cline、OpenCode 等',
    clientsDescription:
      '在客户端中新建“OpenAI 兼容”或“自定义 OpenAI”提供方，然后填写以下字段。若客户端会自动补 /v1，请将地址末尾的 /v1 去掉。',
    clientFields: [
      ['提供方类型', 'OpenAI Compatible'],
      ['API 地址', API_BASE_URL],
      ['API Key', '你的 sk-... 密钥'],
      ['推荐模型', 'aurora / moonlight / starrylight'],
    ],
    modelsTitle: '公开模型别名',
    modelsDescription: '客户端只需要填写下列稳定别名，无需关心上游模型名称。',
    modelRows: [
      ['aurora', '旗舰编码 / 复杂 Agent', '高推理强度 · 1M 上下文'],
      ['moonlight', '日常开发 / 速度平衡', '中等推理强度 · 1M 上下文'],
      ['starrylight', '轻量任务 / 快速响应', '高推理强度 · 128K 上下文'],
      ['acemodel-image', '标准生图', 'gpt-image-2'],
      ['acemodel-image-2k', '2K 生图', 'gpt-image-2 · 2K'],
      ['acemodel-image-4k', '4K 生图', 'gpt-image-2 · 4K'],
    ],
    endpointTitle: '兼容端点',
    endpointDescription: '客户 Key 已开放 Responses / Chat 文本与工具调用；其他协议和图片取决于密钥权限。',
    endpointRows: [
      ['POST /responses', 'Codex CLI、OpenAI Responses SDK'],
      ['POST /chat/completions', 'OpenAI 兼容客户端与旧版 SDK'],
      ['POST /messages', 'Claude Code 与 Anthropic SDK'],
      ['GET /models', '获取公开模型列表'],
    ],
    noteTitle: '连接不上？',
    noteBody:
      '先确认地址中包含 /aceapi/v1，密钥没有多余空格，并在客户端选择 OpenAI 兼容模式。Claude Code 请按 CC Switch 小节启用本地路由。',
  },
  'zh-TW': {
    menu: '接入教程',
    close: '關閉接入教程',
    eyebrow: 'ACEModel / Client setup',
    title: 'ACEModel 大模型接入指南',
    description:
      '在 ACECode 中選擇 ACEModel 服務商，或在相容客戶端中填寫 API 地址與使用者中心建立的 Key。',
    baseUrl: 'API 基礎地址',
    apiKey: 'API Key',
    apiKeyHint: '使用使用者中心建立的 API Key',
    copy: '複製',
    copied: '已複製',
    quickStart: '選擇客戶端',
    fullDocs: '檢視 ACECode 完整文件',
    acecodeDocs: '檢視 ACEModel 詳細教程',
    tabs: {
      acecode: 'ACECode（推薦）',
      ccswitch: 'CC Switch',
      codex: 'Codex CLI',
      claude: 'Claude Code',
      sdk: 'OpenAI SDK',
      clients: '其他客戶端',
    },
    acecodeTitle: '在 ACECode 中使用 ACEModel',
    acecodeDescription:
      'ACECode 已原生內建 ACEModel 服務商，介面地址和模型目錄都已準備好，只需貼上本站 API Key。',
    acecodeSteps: [
      '開啟 ACECode，進入“設定 → 模型 → 新增模型”。',
      '在服務商列表中選擇“ACEModel”。',
      '貼上在 ACEProxy 使用者中心建立的 API Key。',
      '選擇 moonlight / starrylight / aurora，儲存後設為預設模型。',
    ],
    codexTitle: 'Codex CLI 配置',
    codexDescription:
      '將配置寫入 ~/.codex/config.toml，再透過環境變數提供金鑰。aurora 預設使用高推理強度。',
    codexStep1: '1. 寫入 ~/.codex/config.toml',
    codexStep2: '2. 設定金鑰並啟動',
    claudeTitle: 'Claude Code 配置',
    claudeDescription:
      '本站客戶 Key 開放 Responses / Chat 文字與工具呼叫。使用 Claude Code 時，透過 CC Switch 的本地路由轉換協議，不直接請求 /messages。',
    claudeStep1: 'macOS / Linux',
    claudeStep2: 'Windows PowerShell',
    sdkTitle: 'OpenAI SDK / curl',
    sdkDescription:
      '介面同時相容 Responses API 與 Chat Completions。新專案建議優先使用 Responses API。',
    ccswitchTitle: '透過 CC Switch 接入 ACEModel',
    ccswitchDescription: '先在使用者中心複製 API Key。推薦在 CC Switch 的 Codex 頁面新增 ACEModel，使用 Responses 原生直連。',
    ccswitchSteps: [
      '安裝並開啟 CC Switch，選擇 Codex，點選“新增供應商”，選擇“自定義配置”。',
      '名稱填 ACEModel，填入下表的 API 地址和模型，將本站 Key 貼上到 API Key / auth.json 編輯區。',
      '上游格式選擇 Responses（原生）。下方提供 auth.json 和 config.toml 編輯區的參考內容；認證項由 CC Switch 管理。',
      '點選“新增”後，在供應商卡片上點選“啟用”或“使用”。退出並重新啟動 Codex，再發起一個簡短任務。',
    ],
    ccswitchFields: [['應用', 'Codex'], ['供應商名稱', 'ACEModel'], ['API 地址', API_BASE_URL], ['模型', 'aurora / moonlight / starrylight'], ['上游格式', 'Responses（原生）']],
    ccswitchAuth: 'CC Switch 的 auth.json 編輯區',
    ccswitchConfig: 'CC Switch 的 config.toml 編輯區',
    ccswitchClaude: '在 CC Switch 中配置 Claude Code',
    ccswitchClaudeSteps: [
      '選擇 Claude → 新增供應商 → 自定義，填入同一個本站 Key，模型填 aurora。',
      '請求地址填 https://acecode.cc/aceapi/v1/responses，開啟“完整 URL”，上游格式選“OpenAI Responses API”。',
      '儲存供應商後進入“路由”，點選“開始路由”並選擇 ACEModel；使用期間保持 CC Switch 執行。舊版介面可能稱為“本地代理 / 接管”。',
    ],
    ccswitchTrouble: '401/403：檢查 Key 與賬戶狀態；404：檢查 /aceapi 和 /v1 是否重複或缺失。模型列表獲取失敗時可手動填寫 aurora。仍使用舊配置時重新啟用供應商並重啟客戶端；透過 Key 的使用詳情檢視是否產生請求。',
    ccswitchDownload: '下載 CC Switch',
    ccswitchDocs: 'CC Switch 官方配置文件',
    clientsTitle: 'Cherry Studio、Cline、OpenCode 等',
    clientsDescription:
      '在客戶端中新建“OpenAI 相容”或“自定義 OpenAI”提供方，然後填寫以下欄位。若客戶端會自動補 /v1，請將地址末尾的 /v1 去掉。',
    clientFields: [
      ['提供方型別', 'OpenAI Compatible'],
      ['API 地址', API_BASE_URL],
      ['API Key', '你的 sk-... 金鑰'],
      ['推薦模型', 'aurora / moonlight / starrylight'],
    ],
    modelsTitle: '公開模型別名',
    modelsDescription: '客戶端只需要填寫下列穩定別名，無需關心上游模型名稱。',
    modelRows: [
      ['aurora', '旗艦編碼 / 複雜 Agent', '高推理強度 · 1M 上下文'],
      ['moonlight', '日常開發 / 速度平衡', '中等推理強度 · 1M 上下文'],
      ['starrylight', '輕量任務 / 快速響應', '高推理強度 · 128K 上下文'],
      ['acemodel-image', '標準生圖', 'gpt-image-2'],
      ['acemodel-image-2k', '2K 生圖', 'gpt-image-2 · 2K'],
      ['acemodel-image-4k', '4K 生圖', 'gpt-image-2 · 4K'],
    ],
    endpointTitle: '相容端點',
    endpointDescription: '客戶 Key 已開放 Responses / Chat 文字與工具呼叫；其他協議和圖片取決於金鑰許可權。',
    endpointRows: [
      ['POST /responses', 'Codex CLI、OpenAI Responses SDK'],
      ['POST /chat/completions', 'OpenAI 相容客戶端與舊版 SDK'],
      ['POST /messages', 'Claude Code 與 Anthropic SDK'],
      ['GET /models', '獲取公開模型列表'],
    ],
    noteTitle: '連線不上？',
    noteBody:
      '先確認地址中包含 /aceapi/v1，金鑰沒有多餘空格，並在客戶端選擇 OpenAI 相容模式。Claude Code 請按 CC Switch 小節啟用本地路由。',
  },
  en: {
    menu: 'Integration Guide',
    close: 'Close integration guide',
    eyebrow: 'ACEModel / Client setup',
    title: 'ACEModel integration guide',
    description:
      'Select the ACEModel provider in ACECode, or enter the API address and your customer key in a compatible client.',
    baseUrl: 'API base URL',
    apiKey: 'API key',
    apiKeyHint: 'Copy your API key from the customer portal',
    copy: 'Copy',
    copied: 'Copied',
    quickStart: 'Choose a client',
    fullDocs: 'Open the complete ACECode documentation',
    acecodeDocs: 'Open the detailed ACEModel guide',
    tabs: {
      acecode: 'ACECode (Recommended)',
      ccswitch: 'CC Switch',
      codex: 'Codex CLI',
      claude: 'Claude Code',
      sdk: 'OpenAI SDK',
      clients: 'Other clients',
    },
    acecodeTitle: 'Use ACEModel in ACECode',
    acecodeDescription:
      'ACECode includes the ACEModel provider, endpoint, and model catalog out of the box. Just paste this site\'s API key.',
    acecodeSteps: [
      'Open ACECode and go to Settings → Models → Add model.',
      'Select ACEModel from the provider list.',
      'Paste the API key created in the customer portal.',
      'Choose moonlight / starrylight / aurora, save it, and set it as the default.',
    ],
    codexTitle: 'Codex CLI setup',
    codexDescription:
      'Save the provider in ~/.codex/config.toml, then supply your key through an environment variable. aurora uses high reasoning by default.',
    codexStep1: '1. Create ~/.codex/config.toml',
    codexStep2: '2. Export your key and start',
    claudeTitle: 'Claude Code setup',
    claudeDescription:
      'Customer keys support Responses / Chat text and tool calls. Use CC Switch routing to translate Claude Code requests instead of calling /messages directly.',
    claudeStep1: 'macOS / Linux',
    claudeStep2: 'Windows PowerShell',
    sdkTitle: 'OpenAI SDK / curl',
    sdkDescription:
      'Both Responses API and Chat Completions are supported. Prefer Responses API for new projects.',
    ccswitchTitle: 'Connect ACEModel with CC Switch',
    ccswitchDescription: 'Copy your key from the customer portal. Add ACEModel under Codex in CC Switch and use native Responses.',
    ccswitchSteps: [
      'Install CC Switch, select Codex, choose Add Provider, then Custom Configuration.',
      'Name the provider ACEModel. Enter the URL and model below, then paste your customer key into the API Key / auth.json editor.',
      'Choose native Responses as the upstream format. The examples below belong in the two CC Switch editors; let CC Switch manage authentication.',
      'Add the provider and activate its card. Restart Codex, then try a short task.',
    ],
    ccswitchFields: [['App', 'Codex'], ['Provider', 'ACEModel'], ['API URL', API_BASE_URL], ['Model', 'aurora / moonlight / starrylight'], ['Upstream format', 'Responses (native)']],
    ccswitchAuth: 'CC Switch auth.json editor',
    ccswitchConfig: 'CC Switch config.toml editor',
    ccswitchClaude: 'Claude Code through CC Switch',
    ccswitchClaudeSteps: [
      'Under Claude, add a custom provider with your customer key and model aurora.',
      'Set the URL to https://acecode.cc/aceapi/v1/responses, enable Full URL, and choose OpenAI Responses API as the upstream format.',
      'Save the provider, start Routing, and select ACEModel. Keep CC Switch running. Older versions may call this Local Proxy or Takeover.',
    ],
    ccswitchTrouble: '401/403: check the key and account. 404: check for a missing or repeated /aceapi or /v1. Enter aurora manually if model discovery fails. Re-activate the provider and restart the client if it still uses old settings. Check request logs from the key details page.',
    ccswitchDownload: 'Download CC Switch',
    ccswitchDocs: 'Official CC Switch setup guide',
    clientsTitle: 'Cherry Studio, Cline, OpenCode, and more',
    clientsDescription:
      'Create an “OpenAI Compatible” or “Custom OpenAI” provider and use the values below. If your client appends /v1 automatically, remove /v1 from the URL.',
    clientFields: [
      ['Provider type', 'OpenAI Compatible'],
      ['API URL', API_BASE_URL],
      ['API key', 'Your sk-... key'],
      ['Recommended models', 'aurora / moonlight / starrylight'],
    ],
    modelsTitle: 'Public model aliases',
    modelsDescription: 'Use these stable aliases in clients; upstream model names can change independently.',
    modelRows: [
      ['aurora', 'Flagship coding / complex agents', 'High reasoning · 1M context'],
      ['moonlight', 'Daily development / balanced speed', 'Medium reasoning · 1M context'],
      ['starrylight', 'Light tasks / fast responses', 'High reasoning · 128K context'],
      ['acemodel-image', 'Standard image generation', 'gpt-image-2'],
      ['acemodel-image-2k', '2K image generation', 'gpt-image-2 · 2K'],
      ['acemodel-image-4k', '4K image generation', 'gpt-image-2 · 4K'],
    ],
    endpointTitle: 'Compatible endpoints',
    endpointDescription: 'Customer keys support Responses / Chat text and tool calls. Other protocols and image endpoints require separate access.',
    endpointRows: [
      ['POST /responses', 'Codex CLI and OpenAI Responses SDK'],
      ['POST /chat/completions', 'OpenAI-compatible clients and legacy SDKs'],
      ['POST /messages', 'Claude Code and Anthropic SDK'],
      ['GET /models', 'List public models'],
    ],
    noteTitle: 'Connection trouble?',
    noteBody:
      'Check that the URL contains /aceapi/v1, remove whitespace around the key, and select OpenAI-compatible mode in your client. For Claude Code, follow the CC Switch routing instructions.',
  },
}

const CODEX_CONFIG = `model = "aurora"
model_provider = "acemodel"
model_reasoning_effort = "high"

[model_providers.acemodel]
name = "ACEModel"
base_url = "${API_BASE_URL}"
env_key = "ACEMODEL_API_KEY"
wire_api = "responses"`

const CODEX_SHELL = `export ACEMODEL_API_KEY="sk-your-api-key"
codex`

const CCSWITCH_AUTH = JSON.stringify({ OPENAI_API_KEY: 'sk-your-api-key' }, null, 2)
const CCSWITCH_CONFIG = `model_provider = "acemodel"
model = "aurora"
model_reasoning_effort = "high"
disable_response_storage = true

[model_providers.acemodel]
name = "ACEModel"
base_url = "${API_BASE_URL}"
wire_api = "responses"`
const CCSWITCH_DOCS = 'https://github.com/farion1231/cc-switch/blob/main/docs/user-manual/zh/2-providers/2.1-add.md'

const SDK_EXAMPLE = `from openai import OpenAI

client = OpenAI(
    api_key="sk-your-api-key",
    base_url="${API_BASE_URL}",
)

response = client.responses.create(
    model="aurora",
    input="Explain this repository and propose the next change.",
)
print(response.output_text)`

const CURL_EXAMPLE = `curl ${API_BASE_URL}/responses \\
  -H "Authorization: Bearer sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"aurora","input":"Hello ACEModel"}'`

export function ClientIntegrationGuide({ embedded = false }: { embedded?: boolean } = {}) {
  const { i18n } = useTranslation()
  const copy = COPY[i18n.language === 'zh-TW' ? 'zh-TW' : i18n.language.startsWith('zh') ? 'zh' : 'en']
  const [activeTab, setActiveTab] = useState<GuideTab>('acecode')
  useEffect(() => {
    const selectHash = () => {
      const tab = window.location.hash.slice(1)
      if (Object.prototype.hasOwnProperty.call(copy.tabs, tab)) setActiveTab(tab as GuideTab)
    }
    selectHash(); window.addEventListener('hashchange', selectHash)
    return () => window.removeEventListener('hashchange', selectHash)
  }, [copy])

  const tabContent = useMemo(() => {
    if (activeTab === 'acecode') {
      return (
        <GuidePanel title={copy.acecodeTitle} description={copy.acecodeDescription}>
          <ol className="grid gap-3 sm:grid-cols-2">
            {copy.acecodeSteps.map((step, index) => (
              <li key={step} className="flex gap-3 border border-black/15 p-4 dark:border-white/20">
                <span className="flex size-7 shrink-0 items-center justify-center bg-black font-mono text-xs font-bold text-white dark:bg-white dark:text-black">
                  {index + 1}
                </span>
                <span className="text-sm leading-6">{step}</span>
              </li>
            ))}
          </ol>
          <a href="https://acecode.cc/acecode/acemodel.html" target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 border-b border-black pb-1 text-sm font-bold hover:opacity-60 dark:border-white">
            {copy.acecodeDocs}<ExternalLink className="size-3.5" />
          </a>
        </GuidePanel>
      )
    }
    if (activeTab === 'ccswitch') {
      return <GuidePanel title={copy.ccswitchTitle} description={copy.ccswitchDescription}>
        <a href="https://github.com/farion1231/cc-switch/releases/latest" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline">{copy.ccswitchDownload}<ExternalLink className="size-4" /></a>
        <GuideSteps steps={copy.ccswitchSteps} />
        <GuideFields fields={copy.ccswitchFields} />
        <CodeBlock label={copy.ccswitchAuth} code={CCSWITCH_AUTH} copy={copy} />
        <CodeBlock label={copy.ccswitchConfig} code={CCSWITCH_CONFIG} copy={copy} />
        <h3 className="text-xl">{copy.ccswitchClaude}</h3>
        <p className="text-sm leading-6">{copy.claudeDescription}</p>
        <GuideSteps steps={copy.ccswitchClaudeSteps} />
        <h3 className="text-xl">{copy.noteTitle}</h3>
        <p className="text-sm leading-6">{copy.ccswitchTrouble}</p>
        <a href={CCSWITCH_DOCS} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline">{copy.ccswitchDocs}<ExternalLink className="size-4" /></a>
      </GuidePanel>
    }
    if (activeTab === 'codex') {
      return (
        <GuidePanel title={copy.codexTitle} description={copy.codexDescription}>
          <CodeBlock label={copy.codexStep1} code={CODEX_CONFIG} copy={copy} />
          <CodeBlock label={copy.codexStep2} code={CODEX_SHELL} copy={copy} />
        </GuidePanel>
      )
    }
    if (activeTab === 'claude') {
      return (
        <GuidePanel title={copy.claudeTitle} description={copy.claudeDescription}>
          <GuideSteps steps={copy.ccswitchClaudeSteps} />
          <a href="#ccswitch" className="underline">{copy.ccswitchTitle}</a>
          <a href={CCSWITCH_DOCS} target="_blank" rel="noopener noreferrer" className="underline">{copy.ccswitchDocs}</a>
        </GuidePanel>
      )
    }
    if (activeTab === 'sdk') {
      return (
        <GuidePanel title={copy.sdkTitle} description={copy.sdkDescription}>
          <CodeBlock label="Python / OpenAI SDK" code={SDK_EXAMPLE} copy={copy} />
          <CodeBlock label="curl / Responses API" code={CURL_EXAMPLE} copy={copy} />
        </GuidePanel>
      )
    }
    return (
      <GuidePanel title={copy.clientsTitle} description={copy.clientsDescription}>
        <div className="divide-y divide-black/10 border border-black/15 dark:divide-white/15 dark:border-white/20">
          {copy.clientFields.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:items-center">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-black/50 dark:text-white/50">{label}</span>
              <code className="break-all font-mono text-sm text-black dark:text-white">{value}</code>
            </div>
          ))}
        </div>
      </GuidePanel>
    )
  }, [activeTab, copy])

  if (embedded)
    return (
      <div className="customer-console-guide space-y-5">
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <div className="rounded-xl border border-border bg-card p-5">
          <CopyRow label={copy.baseUrl} value={API_BASE_URL} copy={copy} />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <nav
            className="flex flex-wrap gap-2 border-b border-border p-3"
            aria-label={copy.quickStart}
          >
            {(Object.keys(copy.tabs) as GuideTab[]).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "secondary" : "ghost"}
                onClick={() => {
                  setActiveTab(tab);
                  window.history.replaceState(
                    window.history.state,
                    "",
                    `#${tab}`,
                  );
                }}
                aria-pressed={activeTab === tab}
              >
                {copy.tabs[tab]}
              </Button>
            ))}
          </nav>
          <div className="p-5 sm:p-6">{tabContent}</div>
        </div>
      </div>
    );
  return (
    <div className="min-h-dvh bg-white text-black dark:bg-black dark:text-white">
      <div className="ace-page-tools"><Button asChild variant="outline"><a href="https://customers.acecode.cc/customerv2/usage">{i18n.language === 'zh-TW' ? '返回用量查詢' : i18n.language.startsWith('zh') ? '返回用量查询' : 'Back to usage'}</a></Button></div>
      <main className="mx-auto max-w-[1180px] px-5 py-12 sm:py-16">
        <section className="grid gap-10 border-b border-black/15 pb-12 dark:border-white/20 lg:grid-cols-[1.45fr_0.75fr] lg:items-end">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">{copy.eyebrow}</div>
            <h1 id="integration-guide-title" className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-black/60 dark:text-white/60">{copy.description}</p>
            <a href="https://acecode.cc/acecode/" target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 bg-black px-5 py-3 text-sm font-bold text-white shadow-[4px_4px_0_0_var(--ace-ink)] transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-black">
              <BookOpen className="size-4" />
              {copy.fullDocs}
              <ExternalLink className="size-4" />
            </a>
          </div>
          <div className="border border-black/20 dark:border-white/25">
            <CopyRow label={copy.baseUrl} value={API_BASE_URL} copy={copy} />
            <div className="border-t border-black/15 px-4 py-3 dark:border-white/20">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/45 dark:text-white/45">{copy.apiKey}</div>
              <div className="mt-1 flex items-center gap-2 font-mono text-sm"><KeyRound className="size-3.5" /> sk-••••••••••••</div>
              <div className="mt-1 text-xs text-black/45 dark:text-white/45">{copy.apiKeyHint}</div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mb-5 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
            <Sparkles className="size-3.5" /> {copy.quickStart}
          </div>
          <div className="grid gap-0 border border-black/20 dark:border-white/25 lg:grid-cols-[240px_1fr]">
            <nav className="border-b border-black/15 p-2 dark:border-white/20 lg:border-r lg:border-b-0" aria-label={copy.quickStart}>
              {(Object.keys(copy.tabs) as GuideTab[]).map((tab) => {
                const Icon = tab === 'acecode' ? BookOpen : tab === 'codex' ? Terminal : tab === 'claude' ? Sparkles : tab === 'sdk' ? Braces : AppWindow
                return (
                  <button key={tab} type="button" onClick={() => { setActiveTab(tab); window.history.replaceState(window.history.state, '', `#${tab}`) }} aria-pressed={activeTab === tab} className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}>
                    <span className="flex items-center gap-2.5"><Icon className="size-4" />{copy.tabs[tab]}</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                )
              })}
            </nav>
            <div className="min-w-0 p-5 sm:p-8">{tabContent}</div>
          </div>
        </section>

        <section className="grid gap-8 border-t border-black/15 py-12 dark:border-white/20 lg:grid-cols-2">
          <InfoSection index="01" title={copy.modelsTitle} description={copy.modelsDescription}>
            <div className="divide-y divide-black/10 border-y border-black/15 dark:divide-white/15 dark:border-white/20">
              {copy.modelRows.map(([model, useCase, detail]) => (
                <div key={model} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr]">
                  <code className="font-mono text-sm font-bold">{model}</code>
                  <div><div className="text-sm font-medium">{useCase}</div><div className="mt-0.5 text-xs text-black/45 dark:text-white/45">{detail}</div></div>
                </div>
              ))}
            </div>
          </InfoSection>
          <InfoSection index="02" title={copy.endpointTitle} description={copy.endpointDescription}>
            <div className="divide-y divide-black/10 border-y border-black/15 dark:divide-white/15 dark:border-white/20">
              {copy.endpointRows.map(([endpoint, useCase]) => (
                <div key={endpoint} className="py-3">
                  <code className="font-mono text-sm font-bold">{endpoint}</code>
                  <div className="mt-1 text-xs text-black/50 dark:text-white/50">{useCase}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 border-l-2 border-black pl-4 dark:border-white">
              <div className="text-sm font-semibold">{copy.noteTitle}</div>
              <p className="mt-1 text-sm leading-6 text-black/55 dark:text-white/55">{copy.noteBody}</p>
            </div>
          </InfoSection>
        </section>
      </main>
    </div>
  )
}

function GuideSteps({ steps }: { steps: string[] }) {
  return <ol className="list-decimal space-y-3 pl-5 text-sm leading-6">{steps.map(step => <li key={step}>{step}</li>)}</ol>
}

function GuideFields({ fields }: { fields: Array<[string, string]> }) {
  return <dl className="divide-y divide-black/10 border border-black/15 dark:divide-white/15 dark:border-white/20">{fields.map(([label, value]) => <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr]"><dt className="text-sm">{label}</dt><dd className="break-all font-mono text-sm">{value}</dd></div>)}</dl>
}

function GuidePanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h2 className="text-2xl font-semibold tracking-[-0.025em]">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55 dark:text-white/55">{description}</p>
      <div className="mt-7 grid min-w-0 grid-cols-1 gap-5">{children}</div>
    </div>
  )
}

function InfoSection({ index, title, description, children }: { index: string; title: string; description: string; children: ReactNode }) {
  return (
    <article>
      <div className="font-mono text-[10px] font-bold tracking-[0.16em] text-black/40 dark:text-white/40">{index}</div>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em]">{title}</h2>
      <p className="mt-2 mb-6 text-sm leading-6 text-black/55 dark:text-white/55">{description}</p>
      {children}
    </article>
  )
}

function CodeBlock({ label, code, copy }: { label: string; code: string; copy: GuideCopy }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold">{label}</span>
        <button type="button" onClick={() => void copyText(code).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1600) })} className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}{copied ? copy.copied : copy.copy}
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto border border-black bg-black p-4 text-[12px] leading-6 text-white dark:border-white/25 dark:bg-white dark:text-black"><code>{code}</code></pre>
    </div>
  )
}

function CopyRow({ label, value, copy }: { label: string; value: string; copy: GuideCopy }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/45 dark:text-white/45">{label}</div>
        <code className="mt-1 block truncate font-mono text-sm">{value}</code>
      </div>
      <button type="button" onClick={() => void copyText(value).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1600) })} className="flex size-8 shrink-0 items-center justify-center border border-black/20 hover:bg-black hover:text-white dark:border-white/25 dark:hover:bg-white dark:hover:text-black" aria-label={copied ? copy.copied : copy.copy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.style.cssText = 'position:fixed;left:-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
}

export default ClientIntegrationGuide
