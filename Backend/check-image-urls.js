const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUrls() {
  try {
    const rooms = await prisma.room.findMany({
      select: { name: true, imageUrl: true }
    });

    console.log('Verificando URLs de imágenes:\n');
    
    rooms.forEach(r => {
      if (r.imageUrl) {
        const isGithub = r.imageUrl.includes('github');
        const isBase64 = r.imageUrl.includes('data:');
        const size = (r.imageUrl.length / 1024).toFixed(2);
        
        console.log(`${r.name}:`);
        if (isGithub) {
          console.log(`  ✅ GitHub URL (${size} KB - solo texto)`);
          console.log(`  URL: ${r.imageUrl.substring(0, 80)}...`);
        } else if (isBase64) {
          console.log(`  ⚠️  Base64 (${size} KB - pesado)`);
        } else {
          console.log(`  ❓ Desconocido`);
        }
      } else {
        console.log(`${r.name}: ❌ SIN IMAGEN`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUrls();
