import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const defaultCategories = [
  { name: "餐饮", icon: "🍜", color: "#FF6B6B", isDefault: true, sortOrder: 1 },
  { name: "交通", icon: "🚇", color: "#4ECDC4", isDefault: true, sortOrder: 2 },
  { name: "购物", icon: "🛍️", color: "#45B7D1", isDefault: true, sortOrder: 3 },
  { name: "娱乐", icon: "🎬", color: "#96CEB4", isDefault: true, sortOrder: 4 },
  { name: "医疗", icon: "💊", color: "#FFEAA7", isDefault: true, sortOrder: 5 },
  { name: "居家", icon: "🏠", color: "#DDA0DD", isDefault: true, sortOrder: 6 },
  { name: "其他", icon: "📦", color: "#B0C4DE", isDefault: true, sortOrder: 7 },
];

async function main() {
  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log("Seeded default categories.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
