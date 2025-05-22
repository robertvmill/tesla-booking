const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.vehicle.createMany({
    data: [
      {
        model: "Model S Plaid",
        image: "/tesla-model-s.jpg",
        description: "Luxury sedan with 390mi range, 200mph top speed, and 0-60 in 1.99s.",
        pricePerDay: 180,
        seats: 5,
        range: "390 miles",
        acceleration: "1.99 seconds 0-60 mph",
        features: [
          "Autopilot",
          "Full Self-Driving",
          "Premium Interior",
          "All-Wheel Drive"
        ]
      },
      {
        model: "Model 3 Performance",
        image: "/tesla-model-3.jpg",
        description: "Sporty sedan with 315mi range, 162mph top speed, and 0-60 in 3.1s.",
        pricePerDay: 140,
        seats: 5,
        range: "315 miles",
        acceleration: "3.1 seconds 0-60 mph",
        features: [
          "Autopilot",
          "Performance Package",
          "Glass Roof",
          "Heated Seats"
        ]
      },
      {
        model: "Model X Long Range",
        image: "/tesla-model-x.jpg",
        description: "Spacious SUV with 348mi range, falcon wing doors, and 0-60 in 3.8s.",
        pricePerDay: 200,
        seats: 7,
        range: "348 miles",
        acceleration: "3.8 seconds 0-60 mph",
        features: [
          "Autopilot",
          "Falcon Wing Doors",
          "Premium Sound",
          "All-Wheel Drive"
        ]
      }
    ]
  });
  console.log('Seeded vehicles!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });