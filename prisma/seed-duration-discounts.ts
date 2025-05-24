import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDurationDiscounts() {
  console.log('Seeding duration discounts...');

  // Get all vehicles first
  const vehicles = await prisma.vehicle.findMany();
  
  if (vehicles.length === 0) {
    console.log('No vehicles found. Please seed vehicles first.');
    return;
  }

  // Create sample duration discounts
  const discounts = [
    {
      name: '3-Day Weekend Special',
      durationType: '3_days',
      discountType: 'percentage',
      discountValue: 10,
      applyToAll: true,
      isActive: true,
    },
    {
      name: 'Weekly Adventure Discount',
      durationType: 'week',
      discountType: 'percentage',
      discountValue: 15,
      applyToAll: true,
      isActive: true,
    },
    {
      name: 'Two-Week Explorer Deal',
      durationType: '2_weeks',
      discountType: 'percentage',
      discountValue: 25,
      applyToAll: true,
      isActive: true,
    },
    {
      name: 'Monthly Tesla Experience',
      durationType: 'month',
      discountType: 'percentage',
      discountValue: 35,
      applyToAll: true,
      isActive: true,
    },
    {
      name: 'Model S Premium Week',
      durationType: 'week',
      discountType: 'fixed_amount',
      discountValue: 200,
      applyToAll: false,
      isActive: true,
      vehicleIds: vehicles.filter(v => v.model.includes('Model S')).map(v => v.id),
    }
  ];

  for (const discount of discounts) {
    try {
      const { vehicleIds, ...discountData } = discount;
      
      const createData: any = {
        ...discountData,
      };

      // If specific vehicles are selected, connect them
      if (!discount.applyToAll && vehicleIds && vehicleIds.length > 0) {
        createData.vehicles = {
          connect: vehicleIds.map(id => ({ id }))
        };
      }

      const created = await prisma.durationDiscount.create({
        data: createData,
        include: {
          vehicles: {
            select: {
              id: true,
              model: true
            }
          }
        }
      });

      console.log(`✓ Created discount: ${created.name}`);
    } catch (error) {
      console.error(`✗ Failed to create discount: ${discount.name}`, error);
    }
  }

  console.log('Duration discounts seeding completed!');
}

seedDurationDiscounts()
  .catch((e) => {
    console.error('Error seeding duration discounts:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 