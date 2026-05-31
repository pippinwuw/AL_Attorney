# 成步堂的选择

> Ace Attorney MVP — 以《逆转裁判》为灵感的 LLM 驱动 Web 推理庭审游戏。

玩家扮演辩护律师**成步堂龙一**，在 AI 助手**仓院真宵**的协助下调查取证、交叉询问证人，并在庭审中通过「异议 + 证物 + 逻辑还原」争取无罪判决。

📄 完整项目介绍见 [docs/项目介绍.md](./docs/项目介绍.md)

---

## 功能亮点

- **完整案件闭环** — 前情 → 庭前调查 → 庭审 → 宣判（首案《逆转的电梯》）
- **双阶段庭审** — JSON 脚本推进节奏 + LLM 法官评价玩家辩护与犯罪现场还原
- **真宵 AI 助手** — 证物分析、庭审提示、时间线梳理、卷宗协作编辑
- **法庭记录** — 证物栏 + 案情卷宗（玩家指导真宵整理）
- **视听呈现** — 法庭背景、角色立绘、BGM、异议成功特效

---

## 技术栈

| 包 | 说明 |
|----|------|
| `apps/web` | React + Vite + Zustand + Framer Motion |
| `apps/server` | Hono + Pi Agent Core + DeepSeek（OpenAI 兼容） |
| `packages/shared` | 共享类型与 DTO |
| `packages/context-engine` | 会话上下文与案件状态 |
| `material/` | 音乐、立绘、背景图等静态资源 |

**环境要求：** Node.js ≥ 22.19.0，pnpm

---

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制根目录环境变量模板并填写 API Key：

```bash
cp .env.example .env
```

关键配置（详见 `.env.example`）：

```env
DEEPSEEK_API_KEY=your_key_here
PI_PROVIDER=deepseek
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:3001
```

> 未配置 Key 或设为 `VITE_USE_MOCK=true` 时，前端使用 Mock 客户端（无需后端 LLM）。

### 3. 启动开发环境

```bash
# 同时启动前端 (5173) 与后端 (3001)
pnpm dev:all
```

或分别启动：

```bash
pnpm dev:server   # http://localhost:3001
pnpm dev          # http://localhost:5173（仅 web）
```

浏览器打开 **http://localhost:5173**，选择「成步堂龙一」→「新游戏」。

### 4. 构建

```bash
pnpm build
```

---

## 项目结构

```
ace-attorney/
├── apps/
│   ├── web/                 # 前端 React 应用
│   └── server/              # 后端 API + LLM Agent
├── packages/
│   ├── shared/              # 共享类型
│   └── context-engine/      # 游戏上下文存储
├── material/                # 静态资源（BGM、立绘、背景）
├── docs/
│   └── 项目介绍.md          # 竞赛 / 展示用介绍文档
├── .env.example
└── pnpm-workspace.yaml
```

---

## 玩法速览（case01）

1. **庭前调查** — 在「案发地」「事务所」等地收集 **凶器** 与 **现场照片**（必需）
2. **庭审** — 对证人矛盾证词点击「异议！」，出示现场照片并说明矛盾
3. **还原** — 按提示输入推理（关键词含「三楼」「照片」「矛盾」等）
4. **通关** — 完成全部异议 → 结案陈词 → 无罪宣判

---

## 主要脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev:all` | 并行启动 web + server |
| `pnpm dev` | 仅前端 |
| `pnpm dev:server` | 仅后端 |
| `pnpm build` | 构建全部包 |
| `pnpm preview` | 预览前端构建产物 |

---

## API 概览

| 路径 | 说明 |
|------|------|
| `POST /api/session/create` | 创建游戏会话 |
| `POST /api/maya/chat` | 真宵对话 |
| `GET /api/dossier/:sessionId` | 法庭记录 / 卷宗状态 |
| `GET /api/trial/:sessionId/state` | 庭审状态 |
| `POST /api/trial/objection` | 提交异议 |
| `POST /api/trial/reconstruct` | 犯罪现场还原 |

---

## 声明

本项目为**粉丝向 / 学习向 MVP Demo**，致敬《逆转裁判》玩法范式，不用于商业用途。角色与世界观版权归原权利方所有。

---

## License

Private / 未指定开源协议 — push 前请按团队要求补充。
