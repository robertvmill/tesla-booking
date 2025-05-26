import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'jpboichuk@gmail.com';
  const name = 'JP Boichuk';
  const password = 'admin123'; // You should change this password after first login
  
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      // Update existing user to be admin
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          isAdmin: true,
          name: name,
        }
      });
      console.log(`✅ Updated existing user ${email} to admin status`);
      console.log(`User ID: ${updatedUser.id}`);
      return;
    }
    
    // Hash the password
    const hashedPassword = await hash(password, 12);
    
    // Create new admin user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        isAdmin: true,
      }
    });
    
    console.log(`✅ Created new admin user: ${email}`);
    console.log(`User ID: ${newUser.id}`);
    console.log(`Temporary password: ${password}`);
    console.log(`⚠️  Please change the password after first login!`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

createAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 