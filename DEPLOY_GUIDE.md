# 📘 デプロイ手順書 (詳細版)

## ステップ0: GitHubへ push

```bash
cd social-app
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<あなた>/social-app.git
git push -u origin main
```

## ステップ1: Render アカウント準備

1. [render.com](https://render.com) にアクセスし GitHub連携でサインアップ
2. 支払い情報は不要 (Free プランで作れます)

## ステップ2: PostgreSQL を作成

1. Dashboard で **New +** → **PostgreSQL**
2. 設定:
   - Name: `socialhub-db`
   - Database: `socialhub`
   - User: `socialhub`
   - Region: Singapore (日本から近い)
   - Plan: **Free**
3. **Create Database** をクリック
4. 作成完了まで数分待つ
5. 作成後、**Info** タブに移動
6. **Internal Database URL** をコピー(後で使う)
   例: `postgresql://socialhub:xxxxx@dpg-xxxxx-a/socialhub`

## ステップ3: Web Service を作成

1. Dashboard で **New +** → **Web Service**
2. **Build and deploy from a Git repository** → **Next**
3. さっき push した `social-app` リポジトリを選択
4. 設定:
   - Name: `socialhub-web`
   - Region: Singapore (DBと同じ)
   - Branch: `main`
   - Runtime: `Node`
   - Build Command:
     ```
     npm ci && npm run build && npx prisma db push --accept-data-loss && node prisma/seed.js
     ```
   - Start Command: `npm run start`
   - Instance Type: **Free**
5. **Advanced** を展開
6. **Environment Variables** で以下を追加:

| Key | Value |
|---|---|
| `DATABASE_URL` | ステップ2でコピーしたInternal URL |
| `NEXTAUTH_SECRET` | (Generate をクリックしてランダム生成) |
| `NEXTAUTH_URL` | `https://socialhub-web.onrender.com` ※あとで実際のURLに書き換え |
| `NEXT_PUBLIC_SOCKET_URL` | `https://socialhub-web.onrender.com` |
| `SOCKET_PORT` | `3001` |
| `ADMIN_INITIAL_PASSWORD` | `admin1234` (任意の初期PW) |
| `NODE_VERSION` | `20` |

7. **Create Web Service** をクリック
8. 初回ビルドが始まる(5〜10分)

## ステップ4: 実際のURLを確認 & 環境変数を修正

1. デプロイ完了後、Service TOPの右上に自分のURLが表示される (例: `https://socialhub-web-abcd.onrender.com`)
2. **Environment** タブに戻り:
   - `NEXTAUTH_URL` → その実URLに書き換え
   - `NEXT_PUBLIC_SOCKET_URL` → 同じ実URLに書き換え
3. **Save Changes** → 自動再デプロイが走る

## ステップ5: 動作確認

1. 実URL を開く → `/login` にリダイレクト
2. `/register` から新しいアカウントを作ってみる
3. 投稿 / いいね / DM がリアルタイムで動くか確認
4. 別ブラウザで 2つ目のアカウントを作り、DMやフォローを確認

## ステップ6: 管理者ログイン

1. `admin` / `admin1234` (ステップ3で設定した値) でログイン
2. サイドバーに「管理画面」が表示される
3. **必ず** 設定 → パスワード から変更

## ステップ7: プロキシサイトから開く

学校/職場のフィルタリングをすり抜けたい場合は、下記のような公開プロキシに実URLを入れます:

- https://holy-unblocker.net
- https://mathsspot.com
- https://interstellar.duckdns.org

`next.config.js` で `frame-ancestors *` を設定済みなので iframe 表示OK。

## トラブルシューティング

### デプロイエラー: "prisma db push failed"
- `DATABASE_URL` が正しくない可能性。**Internal** URLになっているか確認。

### 500エラー
- Environment Variables の `NEXTAUTH_SECRET` が空の可能性。
- ログを **Logs** タブで確認。

### DBに繋がらない
- PostgreSQLとWeb ServiceのRegionが同じか確認。

### Socket.IOが動かない
- `NEXT_PUBLIC_SOCKET_URL` を実URLに設定したか確認。
- Renderの無料枠は WebSocket が同一サービスで動く。

### スリープ問題
- Free プランは15分アイドルでスリープする。
- 起動アクセスで30秒ほどかかる。
- 常時起動が欲しければ有料プラン ($7/月) にアップグレード。
