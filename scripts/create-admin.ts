/** Usage: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='...' npm run admin:create  (or pass as args). The first staff account becomes OWNER;
 * later ones ADMIN unless --role=OWNER. Server-side only — there is no API that can grant these roles without the owner. */
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { setupNewUser } from "../src/lib/game/setup";

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const flag = process.argv.find((a) => a.startsWith("--role="))?.split("=")[1]?.toUpperCase();
  const email = (args[0] ?? process.env.ADMIN_EMAIL ?? "").toLowerCase();
  const password = args[1] ?? process.env.ADMIN_PASSWORD ?? "";
  if (!email || password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw new Error("Provide ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters with letters and numbers.");
  const role = flag === "OWNER" || flag === "ADMIN" ? flag : (await db.user.count({ where: { role: "OWNER" } })) === 0 ? "OWNER" : "ADMIN";
  const hash = await bcrypt.hash(password, 12);
  const user = await db.user.upsert({
    where: { email },
    create: { email, name: "Admin", passwordHash: hash, role, emailVerified: new Date() },
    update: { role, passwordHash: hash },
  });
  await db.session.deleteMany({ where: { userId: user.id } }); // new password → old sessions end
  await db.$transaction((tx) => setupNewUser(tx, user.id));
  console.log(`✔ ${email} is an ${role}`);
}
main().finally(() => db.$disconnect());
