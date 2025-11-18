const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.room.createMany({
    data: [
      { name: "Suite 101", capacity: 2 },
      { name: "Depto Centro A", capacity: 4 },
      { name: "Familiar Planta Baja", capacity: 5 },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Seed OK");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => prisma.$disconnect());
