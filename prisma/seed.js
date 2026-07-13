// 初期管理者アカウントを作成
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = "admin";
  const password = process.env.ADMIN_INITIAL_PASSWORD || "admin1234";
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log("[seed] admin already exists");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username,
      displayName: "管理者",
      passwordHash,
      isAdmin: true,
      bio: "システム管理者アカウント。パスワード復旧の対応を行います。",
    },
  });
  console.log(`[seed] admin created — username: ${username} / password: ${password}`);
  console.log("[seed] ⚠️ 初回ログイン後、必ず設定画面からパスワードを変更してください");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
