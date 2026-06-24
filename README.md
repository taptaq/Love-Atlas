# Love Atlas

Love Atlas 是一个关系探索应用，用一组持续生成的问题、AB 回答、镜像事件和关系地图，帮助两个人把一次次对话沉淀成可回看的探索记录。

项目基于 React + Vite + TypeScript 构建，使用 Zustand 管理前端状态，Supabase/Prisma/PostgreSQL 支持登录、关系空间、历史探索和长期沉淀数据。

## 主要功能

- 关系阶段与探索目标选择
- 基于路线和此刻信息的问题生成
- AB 回答与相似度揭晓
- 开放式探索：用户可持续探索，也可在任意已揭晓题目后结束
- 镜像事件、关系世界、发现图鉴
- 临时空间与专属关系空间
- 历史探索详情、长期发现和总结沉淀

## 技术栈

- React 18
- Vite 5
- TypeScript
- Zustand
- Framer Motion
- Supabase
- Prisma + PostgreSQL

## 本地启动

安装依赖：

```bash
npm install
```

复制环境变量文件：

```bash
cp .env.example .env
```

填写 `.env`：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

DEEPSEEK_API_KEY="sk-..."

# 可选：MiniCPM-V / 云端托管视觉模型，需兼容 OpenAI chat/completions。
# 未配置时，图片理解会降级为本地 OCR + 关键词标签。
MINICPM_V_API_URL="https://your-provider.example.com/v1/chat/completions"
MINICPM_V_API_KEY="sk-..."
MINICPM_V_MODEL="openbmb/MiniCPM-V-4_5"
```

启动前端开发服务：

```bash
npm run dev
```

默认访问 Vite 输出的本地地址，通常是：

```text
http://localhost:5173
```

## 数据库

生成 Prisma Client：

```bash
npm run prisma:generate
```

同步数据库结构：

```bash
npm run prisma:push
```

打开 Prisma Studio：

```bash
npm run prisma:studio
```

Supabase 相关 SQL 文件在：

- `supabase/schema.sql`
- `supabase/rls.sql`
- `supabase/storage.sql`：创建 `present-moment` Storage bucket 与上传/读取策略。

## 构建与预览

构建生产包：

```bash
npm run build
```

预览静态构建：

```bash
npm run preview
```

启动带 API 的本地服务：

```bash
npm run serve
```

默认端口为 `4173`，也可以通过 `PORT` 指定：

```bash
PORT=4000 npm run serve
```

## 常用脚本

```bash
npm run dev              # 启动前端开发服务
npm run build            # TypeScript 检查并构建
npm run preview          # 预览构建产物
npm run serve            # 启动静态文件 + API 服务
npm run spaces:cleanup   # 清理过期空间
npm run spaces:smoke     # 空间流程 smoke test
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:push      # 同步数据库结构
npm run prisma:studio    # 打开 Prisma Studio
```

## 项目结构

```text
src/
  app/                  # 应用入口与页面切换
  components/           # 通用 UI 组件
  features/             # 业务功能模块
  pages/                # 页面
  server/               # 本地 API 与静态服务
  services/             # 问题、事件、发现、世界状态等服务
  store/                # Zustand 状态
  styles/               # 全局样式
  types/                # 类型定义
prisma/                 # Prisma schema
supabase/               # Supabase SQL
scripts/                # 维护与测试脚本
```

## 注意事项

- `.env` 不应提交到仓库，已由 `.gitignore` 忽略。
- 前端基础体验可以在未配置 Supabase 时运行，但登录、空间、历史探索等能力需要配置 Supabase 和数据库。
- 生产服务需要先执行 `npm run build`，再执行 `npm run serve`。
