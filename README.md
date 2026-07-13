# 🚀 SocialHub — Discord × X 風リアルタイムSNS

アカウント名とパスワードだけで始められる、モダンなソーシャルプラットフォーム。
Next.js 14 + PostgreSQL + Socket.IO で構築された、リアルタイム対応の本格SNSです。

## ✨ 主な機能

### 🔐 認証・アカウント
- メールアドレス不要のシンプルな新規登録(ユーザー名 + パスワードのみ)
- パスワードは bcrypt でハッシュ化して安全に保管
- JWTベースのセッション管理(NextAuth.js)
- 管理者経由のパスワード復旧フロー

### 📝 SNS機能 (X風)
- 500文字以内の投稿
- いいね / リツイート / 返信
- フォロー / フォロワー
- タイムライン (すべて / フォロー中で切替)
- ユーザー検索

### 💬 コミュニケーション (Discord風)
- ダイレクトメッセージ(1対1)
- サーバー(グループ)作成
- サーバー内チャンネル(#general / #random 自動生成 + 追加可)
- サーバーメンバー一覧
- Socket.IOによるリアルタイム配信

### 🔔 リアルタイム通知
- いいね / リツイート / フォロー / DM の即時通知
- ブラウザ通知連携(許可時)
- 未読バッジ表示

### 🎨 6種類のテーマ + カスタムアクセントカラー
- ダーク / ライト / ミッドナイト / オーシャン / フォレスト / ローズ
- 任意のアクセントカラーを設定可能

### 🛡 プロキシ対応
- `Content-Security-Policy: frame-ancestors *` により iframe 埋め込みOK
- CORS フルオープン設定
- どのプロキシサイトから開いても動作します

## 🏗 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | Next.js 14 (App Router) / React 18 / TypeScript |
| スタイル | Tailwind CSS + CSS変数によるテーマ |
| バックエンド | Next.js API Routes + Prisma ORM |
| データベース | PostgreSQL |
| 認証 | NextAuth.js (Credentials) |
| リアルタイム | Socket.IO (別プロセス, port 3001) |
| デプロイ | Render (Web Service + PostgreSQL) |

## 📦 セットアップ (ローカル)

```bash
# 1. 依存インストール
npm install

# 2. 環境変数を設定
cp .env.example .env
# .env を開いて DATABASE_URL などを設定

# 3. DBスキーマを反映 + 管理者を作成
npx prisma db push
npm run db:seed

# 4. 開発サーバー起動 (Next.js + Socket.IO を同時起動)
npm run dev
```

http://localhost:3000 でアクセスできます。
初期管理者: `admin` / `admin1234` (必ず変更してください)

## 🚢 Renderへのデプロイ手順

### Aルート: ブループリントで一括作成 (推奨)

1. このプロジェクトをGitHubリポジトリにpush
2. [Render Dashboard](https://dashboard.render.com/) → **New +** → **Blueprint**
3. リポジトリを選択、`render.yaml` が自動検出される
4. **Apply** をクリックすると、Web Service と PostgreSQL が同時作成される
5. デプロイ完了後、Web Serviceの **Environment** タブで以下を設定:
   - `NEXTAUTH_URL` → 自分のRenderドメイン (例: `https://socialhub-web.onrender.com`)
   - `NEXT_PUBLIC_SOCKET_URL` → 同上
6. **Manual Deploy** → **Clear build cache & deploy** で再デプロイ

### Bルート: 手動で個別作成

**PostgreSQL 作成:**
1. New + → PostgreSQL → 名前 `socialhub-db`、プラン Free
2. 作成後、**Internal Database URL** をコピー

**Web Service 作成:**
1. New + → Web Service → GitHubリポジトリを接続
2. 設定:
   - Environment: `Node`
   - Build Command: `npm ci && npm run build && npx prisma db push --accept-data-loss && node prisma/seed.js`
   - Start Command: `npm run start`
3. Environment Variables に以下を追加:
   ```
   DATABASE_URL       = (上でコピーしたInternal URL)
   NEXTAUTH_SECRET    = (openssl rand -base64 32 で生成)
   NEXTAUTH_URL       = https://<自分のサービス>.onrender.com
   NEXT_PUBLIC_SOCKET_URL = https://<自分のサービス>.onrender.com
   SOCKET_PORT        = 3001
   ADMIN_INITIAL_PASSWORD = admin1234
   NODE_VERSION       = 20
   ```
4. デプロイ

⚠️ **注意**: Render Freeプランでは、15分間アクセスが無いとスリープします。初回アクセスで起動に30秒程度かかります。

## 🌐 プロキシサイトから開く

`next.config.js` で以下のヘッダーを設定済みなので、iframe埋め込み可能です:
```
Content-Security-Policy: frame-ancestors *;
Access-Control-Allow-Origin: *
```

学校の校内プロキシなど、多くのプロキシサイト(mathsspot, interstellar, holy-unblocker 等)からそのまま開けます。

## 📁 ディレクトリ構造

```
social-app/
├─ prisma/
│  ├─ schema.prisma       # DBスキーマ定義
│  └─ seed.js             # 管理者初期作成
├─ server/
│  └─ socket.js           # Socket.IOサーバー
├─ src/
│  ├─ app/
│  │  ├─ (auth)/          # ログイン/新規登録
│  │  ├─ (main)/          # メインアプリ(認証必須)
│  │  │  ├─ home/         # タイムライン
│  │  │  ├─ dm/           # ダイレクトメッセージ
│  │  │  ├─ servers/[id]/channels/[channelId]/  # Discord風チャット
│  │  │  ├─ notifications/
│  │  │  ├─ profile/[username]/
│  │  │  ├─ settings/     # 6種テーマ + パスワード変更
│  │  │  └─ admin/        # 復旧チケット処理
│  │  ├─ support/         # パスワード復旧申請フォーム
│  │  └─ api/             # REST API
│  ├─ components/         # UI部品
│  ├─ lib/                # prisma / auth / socket
│  └─ types/
├─ render.yaml            # Renderブループリント
└─ package.json
```

## 🔑 パスワード復旧の運用フロー

1. ユーザーが `/support` から復旧申請を送信
2. 管理者(初期は `admin` アカウント)が `/admin` にアクセス
3. チケットの内容を確認、本人性が確認できたら「一時パスワード」を設定
4. 管理者が返信手段(申請時に記入された連絡先など)で一時PWをユーザーに伝達
5. ユーザーはログイン後、`設定 → パスワード` から新しいものに変更

## ⌨ ショートカット

- 投稿画面で **Ctrl+Enter (Mac: ⌘+Enter)** → 投稿
- DM/チャンネルで **Enter** → 送信、**Shift+Enter** → 改行

## 🧑‍💻 開発Tips

```bash
# DBスキーマを変更したあと
npx prisma db push

# DB内容をブラウザで確認
npx prisma studio
```

## 📄 ライセンス

MIT — 自由に改変・利用してください。
