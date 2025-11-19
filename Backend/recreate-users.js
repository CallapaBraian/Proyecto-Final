const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkAndCreateUsers() {
  try {
    console.log('🔍 Verificando usuarios...\n');

    // Ver usuarios actuales
    const existingUsers = await prisma.user.findMany({
      select: { id: true, email: true, role: true, name: true }
    });

    console.log('Usuarios actuales:');
    if (existingUsers.length === 0) {
      console.log('  ❌ No hay usuarios');
    } else {
      existingUsers.forEach(u => {
        console.log(`  ${u.email} - ${u.role}`);
      });
    }

    console.log('\n🔄 Recreando usuarios de prueba...\n');

    // Eliminar usuarios existentes
    await prisma.user.deleteMany();
    console.log('✅ Usuarios eliminados');

    // Crear usuarios
    const users = [
      {
        email: 'user@hotel.ar',
        password: 'User1234',
        name: 'Usuario Prueba',
        role: 'GUEST'
      },
      {
        email: 'operador@hotel.ar',
        password: 'Operador1234',
        name: 'Operador Prueba',
        role: 'OPERATOR'
      },
      {
        email: 'admin@hotel.ar',
        password: 'Admin1234',
        name: 'Admin Prueba',
        role: 'ADMIN'
      }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const created = await prisma.user.create({
        data: {
          email: user.email,
          passwordHash: hashedPassword,
          name: user.name,
          role: user.role
        }
      });
      console.log(`✅ ${user.email} (${user.role})`);
    }

    console.log('\n📋 Usuarios creados exitosamente:\n');
    console.log('HUÉSPED:');
    console.log('  Email: user@hotel.ar');
    console.log('  Password: User1234\n');
    console.log('OPERADOR:');
    console.log('  Email: operador@hotel.ar');
    console.log('  Password: Operador1234\n');
    console.log('ADMIN:');
    console.log('  Email: admin@hotel.ar');
    console.log('  Password: Admin1234\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateUsers();
