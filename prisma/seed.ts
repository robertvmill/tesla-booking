import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.booking.deleteMany();
  await prisma.vehicle.deleteMany();

  // Seed vehicles
  const vehicles = [
    {
      model: 'Model X Long Range',
      image: '/tesla-model-x.jpg',
      description: 'Spacious SUV with 348mi range, falcon wing doors, and 0-60 in 3.8s.',
      pricePerDay: 5,
      seats: 7,
      range: '348 miles',
      acceleration: '0-60 in 3.8s',
      features: ['Autopilot', 'Falcon Wing Doors', 'Premium Sound', 'Wireless Charging']
    },
    {
      model: 'Model S Plaid',
      image: '/tesla-model-s.jpg',
      description: 'Luxury sedan with 390mi range, 200mph top speed, and 0-60 in 1.99s.',
      pricePerDay: 5,
      seats: 5,
      range: '390 miles',
      acceleration: '0-60 in 1.99s',
      features: ['Autopilot', 'Premium Interior', 'Tri-Motor AWD', '1,020 hp']
    },
    {
      model: 'Model 3 Performance',
      image: '/tesla-model-3.jpg',
      description: 'Sporty sedan with 315mi range, 162mph top speed, and 0-60 in 3.1s.',
      pricePerDay: 5,
      seats: 5,
      range: '315 miles',
      acceleration: '0-60 in 3.1s',
      features: ['Autopilot', 'Glass Roof', 'Dual Motor AWD', 'Performance Brakes']
    },
    {
      model: 'Model Y Performance',
      image: '/tesla-model-y.jpg',
      description: 'Compact SUV with 303mi range, versatile seating, and 0-60 in 3.5s.',
      pricePerDay: 5,
      seats: 5,
      range: '303 miles',
      acceleration: '0-60 in 3.5s',
      features: ['Autopilot', 'Panoramic Glass Roof', 'Performance Upgrade', 'Premium Interior']
    },
    {
      model: 'Cybertruck',
      image: '/tesla-cybertruck.jpg',
      description: 'Futuristic pickup with 500+ mile range, bulletproof exterior, and 0-60 in 2.9s.',
      pricePerDay: 7,
      seats: 6,
      range: '500+ miles',
      acceleration: '0-60 in 2.9s',
      features: ['Autopilot', 'Stainless Steel Exoskeleton', 'Adaptive Air Suspension', 'Vault-like Storage']
    }
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.create({
      data: vehicle
    });
  }

  console.log('Database has been seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
