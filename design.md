# 設計：FocusPill

## 1. プロジェクト構成

```
focus-pill/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.ts          # Tailwind CSS設定
├── postcss.config.js           # PostCSS設定
├── components.json             # shadcn/ui 設定
├── vite.pill.config.ts         # Viteビルド設定（ピルウィンドウ）
├── vite.panel.config.ts        # Viteビルド設定（パネルウィンドウ）
├── electron-builder.yml        # Portable版ビルド設定
├── src/
│   ├── main/
│   │   ├── index.ts            # エントリーポイント（Main Process）
│   │   ├── windowManager.ts    # ウィンドウ生成・管理
│   │   ├── taskStore.ts        # electron-store ラッパー
│   │   ├── ipcHandlers.ts      # IPC ハンドラー登録
│   │   └── startup.ts          # スタートアップ設定
│   ├── preload/
│   │   └── preload.ts          # contextBridge によるAPI公開
│   ├── renderer/
│   │   ├── shared/
│   │   │   ├── globals.css     # Tailwind @import / shadcn/ui CSS変数（テーマ）
│   │   │   └── components/
│   │   │       └── ui/         # shadcn/ui 生成コンポーネント
│   │   │           ├── button.tsx
│   │   │           ├── input.tsx
│   │   │           └── scroll-area.tsx
│   │   ├── pill/
│   │   │   ├── index.html
│   │   │   ├── main.tsx        # Reactエントリーポイント
│   │   │   └── Pill.tsx        # ルートコンポーネント
│   │   └── panel/
│   │       ├── index.html
│   │       ├── main.tsx        # Reactエントリーポイント
│   │       ├── Panel.tsx       # ルートコンポーネント
│   │       └── components/
│   │           ├── TaskList.tsx
│   │           ├── TaskItem.tsx
│   │           ├── CompletedSection.tsx
│   │           └── AddTaskForm.tsx
│   └── types/
│       └── task.ts             # 共通型定義（Task, StoreSchema等）
├── assets/
│   └── icon.ico
└── dist/                       # ビルド成果物（git管理外）
```

---

## 2. アーキテクチャ

### 2.1 プロセス構成

```
┌──────────────────────────────────────────────────────┐
│                   Main Process                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │windowManager│  │  taskStore   │  │  startup   │  │
│  │  (pill/     │  │(electron-    │  │(LoginItem  │  │
│  │   panel)    │  │  store)      │  │ Settings)  │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────┘  │
│         │    ipcMain      │                          │
└─────────┼─────────────────┼──────────────────────────┘
          │ IPC             │ IPC
┌─────────┼─────────────────┼──────────────────────────┐
│         │  Renderer       │                          │
│  ┌──────┴──────┐   ┌──────┴───────┐                  │
│  │  pill.html  │   │  panel.html  │                  │
│  │ (React App) │   │ (React App)  │                  │
│  └─────────────┘   └──────────────┘                  │
└──────────────────────────────────────────────────────┘
```

> **Renderer は React（Vite バンドル）を使用する。** Main Process・preload は TypeScript のまま。ピルとパネルはそれぞれ独立した Vite エントリーポイントでビルドし、個別の `BrowserWindow` にロードする。

### 2.2 IPC チャンネル一覧

| チャンネル名 | 方向 | 説明 |
|---|---|---|
| `tasks:getAll` | Renderer → Main | 全タスク取得 |
| `tasks:add` | Renderer → Main | タスク追加 |
| `tasks:update` | Renderer → Main | タスク更新（タスク名・ステータス） |
| `tasks:delete` | Renderer → Main | タスク削除 |
| `tasks:reorder` | Renderer → Main | タスク並び替え |
| `tasks:changed` | Main → Renderer | タスク変更通知（全Rendererに broadcast） |
| `panel:open` | Renderer(pill) → Main | パネルウィンドウを開く |
| `panel:close` | Renderer(panel) → Main | パネルウィンドウを閉じる |

---

## 3. ウィンドウ設計

### 3.1 ピルウィンドウ

```typescript
// windowManager.ts
const pillWindow = new BrowserWindow({
  width: 280,
  height: 64,
  x: screenWidth - 296,   // 右端から16px余白
  y: 16,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
  },
});
```

### 3.2 パネルウィンドウ

```typescript
const panelWindow = new BrowserWindow({
  width: 320,
  height: 480,
  x: screenWidth - 336,   // ピルと右端を揃える
  y: 80,                  // ピル下端に接続
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  show: false,            // 初期非表示
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
  },
});
```

### 3.3 マルチモニタ・DPI対応

```typescript
import { screen } from 'electron';

function getPrimaryDisplayWorkArea() {
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.workArea; // taskbar を除いた有効領域
}
```

ウィンドウ生成時および `screen.on('display-metrics-changed')` イベント発火時に座標を再計算して `setPosition()` で更新する。

---

## 4. データ設計

### 4.1 タスクデータ型

```typescript
type TaskStatus = 'now' | 'next' | 'standby' | 'completed';

interface Task {
  id: string;        // crypto.randomUUID()
  title: string;
  status: TaskStatus;
  order: number;     // 全タスク共通の並び順
  createdAt: string; // ISO 8601
}

interface StoreSchema {
  tasks: Task[];
}
```

### 4.2 electron-store の設定

```typescript
import Store from 'electron-store';

const store = new Store<StoreSchema>({
  defaults: { tasks: [] },
  schema: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id:        { type: 'string' },
          title:     { type: 'string' },
          status:    { type: 'string', enum: ['now', 'next', 'standby', 'completed'] },
          order:     { type: 'number' },
          createdAt: { type: 'string' },
        },
        required: ['id', 'title', 'status', 'order', 'createdAt'],
      },
    },
  },
});
```

### 4.3 タスク操作ロジック

**追加**
- `id`: `crypto.randomUUID()`
- `status`: `'standby'`
- `order`: `standby` タスクの最大 `order + 1`

**「今」「次」の取得**
- 今: `tasks.find(t => t.status === 'now')`
- 次: `tasks.find(t => t.status === 'next')`
- `order` によるソート不要、O(n) で定数時間検索可能

**並び替え（ドラッグ&ドロップ）**

ドロップ先の位置に応じてステータスを再計算する：

| ドロップ先 | 対象タスクの新status | 他タスクへの影響 |
|---|---|---|
| 先頭（今） | `'now'` | 旧 `now` → `'next'`、旧 `next` → `'standby'`（order最小） |
| 2番目（次） | `'next'` | 旧 `next` → `'standby'`（order最小） |
| 3番目以降 | `'standby'` | 旧 `now` → `'next'`、旧 `next` → `'standby'`（order再採番） |

- `standby` タスクどうしの並び替えは `order` を再採番して保存する

**完了**
- 対象タスクの `status` を `'completed'` に更新する
- 対象が `now` だった場合: `next` → `'now'`、最小 order の `standby` → `'next'`
- 対象が `next` だった場合: 最小 order の `standby` → `'next'`

**復帰**
- `'completed'` から復帰先に応じてステータスを設定する
  - 今にする: task→`'now'`、旧 `now`→`'next'`、旧 `next`→`'standby'`（order最小）
  - 次にする: task→`'next'`、旧 `next`→`'standby'`（order最小）
  - スタンバイ: task→`'standby'`、`order` = standby最大 + 1

**削除後の再採番**
- 削除対象が `now` または `next` の場合、完了時と同様のプロモーション処理を行う
- 削除後、残りの `standby` タスクを `order` 昇順でソートし、0から連番を振り直す

---

## 5. UI設計

### 5.1 ピルUI レイアウト

```
┌──────────────────────────────────────┐
│ 🟢 今  ○○機能のバグ修正             │
│    次  PRレビュー（田中さん）         │
└──────────────────────────────────────┘
  ↑ 角丸ピル型、背景半透明、ドロップシャドウ
```

- フォント: システムフォント（`-apple-system, "Segoe UI"` 等）
- 「今」ラベル: 強調色（アクセントカラー）
- 「次」ラベル: グレー
- タスクなし時: `— タスクなし —` をグレーで表示
- テキストオーバーフロー: `text-overflow: ellipsis`

### 5.2 パネルUI レイアウト

**完了済みセクション 折りたたみ時（パネルを開いた直後）**

```
┌────────────────────────────────────┐
│  タスクリスト              [×閉じる] │
├────────────────────────────────────┤
│ ≡ 🟢 ○○機能のバグ修正  [✓][✏][🗑]│  ← 先頭＝「今」
│ ≡    PRレビュー（田中さん)[✓][✏][🗑]│  ← 2番目＝「次」
│ ≡    リリースノート作成  [✓][✏][🗑]│
│                                    │
│ ▶ 完了済み (2)                     │  ← クリックで展開
├────────────────────────────────────┤
│ [新しいタスクを入力...  ] [追加]    │
└────────────────────────────────────┘
```

**完了済みセクション 展開時**

```
│ ▼ 完了済み (2)                     │
│    ✅ 環境構築      [↩][🗑]         │
│    ✅ 仕様確認      [↩][🗑]         │
```

`[↩]` クリック時の復帰先ポップアップ（ポップオーバーで表示）：

```
┌─────────────┐
│ 今にする     │  ← 先頭（「今」）に挿入
│ 次にする     │  ← 2番目（「次」）に挿入
│ スタンバイ   │  ← 末尾に追加
└─────────────┘
```

- `≡` はドラッグハンドル（未着手・保留タスクのみ）
- ドラッグ中はドロップ先にハイライト表示
- ドラッグライブラリ: [@dnd-kit/core](https://dndkit.com/) を採用（React向け・アクセシビリティ対応）
- `[✓]` チェックボタンクリックで `tasks:update` を呼び出し `status: 'completed'` に更新
- 完了済みセクションの開閉状態は React state で管理し、`panelWindow.show()` のたびに閉じた状態にリセット
- `[↩]` 復帰ボタンクリックでポップアップを表示し、「今にする」「次にする」「スタンバイ」の3拡から復帰先を選択する
- 復帰時は `tasks:update`（`status: 'active'`）を送信し、Main 側で既存タスクの `order` を再採番して保存
- 完了済みタスクは並び替え不可。復帰・削除のみ可能

### 5.3 インタラクションフロー

```
[ピルをクリック]
    → Main: panel:open を受信
    → panelWindow.show()
    → Renderer(panel): tasks:getAll でデータ取得 → 一覧描画

[ドラッグ&ドロップ完了]
    → Renderer(panel): tasks:reorder を送信
    → Main: ストアを更新
    → Main: tasks:changed を全Rendererに送信
    → Renderer(pill): ピル表示を更新

[パネル外クリック]
    → panelWindow の blur イベント
    → Main: panelWindow.hide()

[↩ をクリック]
    → 復帰先ポップアップを表示（今にする / 次にする / スタンバイ）
    → 選択後: tasks:update を送信（status: 'active'、復帰先指定）
    → Main: ストアを更新（既存タスクの order を復帰先に応じて再採番）
    → Main: tasks:changed を全Rendererに送信
    → Renderer(pill): ピル表示を更新
```

### 5.4 コンポーネントライブラリ

UIは **shadcn/ui** + **Tailwind CSS** を使用する。

| コンポーネント | shadcn/ui スロット名 | 用途 |
|---|---|---|
| `Button` | `button` | 追加・削除・閉じるボタン |
| `Input` | `input` | タスク追加フォーム |
| `ScrollArea` | `scroll-area` | タスクリストのスクロール領域 |

**Tailwind CSS の適用方針**
- ピル・パネルの両 Renderer の `main.tsx` から `@shared/globals.css` を import する
- `globals.css` に Tailwind の `@import "tailwindcss"` と shadcn/ui の CSS 変数（テーマカラー等）を定義する
- shadcn/ui コンポーネントは `src/renderer/shared/components/ui/` に配置し、`@shared/components/ui/...` のエイリアスで参照する
- `components.json` の `aliases.components` を `@shared/components` に設定し、`npx shadcn add` で共有 `ui/` に生成されるようにする

---

## 6. セキュリティ設計

### 6.1 contextIsolation / preload

- `contextIsolation: true` + `nodeIntegration: false` を必須とする
- Renderer からの Node.js 直接呼び出しは禁止
- `preload.ts` で `contextBridge.exposeInMainWorld` を通じ、必要な IPC のみを公開する

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import type { Task } from '../types/task';

contextBridge.exposeInMainWorld('taskAPI', {
  getAll:  ()              => ipcRenderer.invoke('tasks:getAll'),
  add:     (title: string) => ipcRenderer.invoke('tasks:add', title),
  update:  (id: string, patch: Partial<Pick<Task, 'title' | 'status'>>) => ipcRenderer.invoke('tasks:update', id, patch),
  delete:  (id: string)    => ipcRenderer.invoke('tasks:delete', id),
  reorder: (ids: string[]) => ipcRenderer.invoke('tasks:reorder', ids),
  onChanged: (cb: (tasks: Task[]) => void) =>
    ipcRenderer.on('tasks:changed', (_e, tasks) => cb(tasks)),
});

// Reactコンポーネントから参照できるよう window 型を拡張する
// src/types/window.d.ts に以下を定義する
// declare global {
//   interface Window { taskAPI: typeof taskAPI; }
// }
```

### 6.2 入力バリデーション

| 項目 | ルール |
|---|---|
| タスク名 | 空文字・空白のみは追加不可。最大 200 文字 |
| id（並び替え・削除） | Main 側でストア内に存在するIDか検証する |

---

## 7. ビルド・配布設計

### 7.1 Vite 設定（ピル・パネル共通パターン）

```typescript
// vite.pill.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/renderer/pill',
  base: './',
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'src/renderer/shared') },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer/pill'),
    emptyOutDir: true,
  },
});
// vite.panel.config.ts も同様（root を panel に変更）
```

### 7.2 electron-builder 設定（抜粋）

```yaml
# electron-builder.yml
appId: com.focuspill.app
productName: FocusPill
directories:
  output: dist/installer
files:
  - dist/main/**
  - dist/preload/**
  - dist/renderer/**
win:
  target:
    - target: portable
      arch: [x64]
  icon: assets/icon.ico
portable:
  artifactName: FocusPill-${version}-portable.exe
```

### 7.3 ビルドコマンド

```bash
# 開発起動（Vite dev server + Electron）
npm run dev

# Rendererのみビルド（Vite）
npm run build:renderer

# Main/preloadのみビルド（tsc）
npm run build:main

# Portable exe ビルド（全体）
npm run build
```

### 7.4 package.json スクリプト例

```json
"scripts": {
  "dev": "concurrently \"vite --config vite.pill.config.ts\" \"vite --config vite.panel.config.ts\" \"wait-on tcp:5173 tcp:5174 && electron .\"",
  "build:renderer": "vite build --config vite.pill.config.ts && vite build --config vite.panel.config.ts",
  "build:main": "tsc -p tsconfig.node.json",
  "build": "npm run build:renderer && npm run build:main && electron-builder"
}
```

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 |
|---|---|---|
| 0.1 | 2026-07-18 | 初版作成 |
| 0.2 | 2026-07-18 | アプリ名を FocusPill に変更。RendererをReact（Vite）ベースに変更 |
| 0.3 | 2026-07-18 | 完了機能・完了済みセクション（折りたたみ）を追加 |
| 0.4 | 2026-07-18 | UIライブラリを shadcn/ui + Tailwind CSS に変更 |
| 0.5 | 2026-07-18 | 完了済みタスクの復帰機能（今にする / 次にする / スタンバイ）を追加 |
| 0.6 | 2026-07-18 | TaskStatus を now / next / standby / completed に変更。「今」「次」を status で直接識別する方式に変更 |
