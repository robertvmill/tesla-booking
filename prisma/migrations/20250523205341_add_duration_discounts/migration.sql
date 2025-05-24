-- CreateTable
CREATE TABLE "DurationDiscount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationType" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "applyToAll" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DurationDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DurationDiscountToVehicle" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DurationDiscountToVehicle_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DurationDiscountToVehicle_B_index" ON "_DurationDiscountToVehicle"("B");

-- AddForeignKey
ALTER TABLE "_DurationDiscountToVehicle" ADD CONSTRAINT "_DurationDiscountToVehicle_A_fkey" FOREIGN KEY ("A") REFERENCES "DurationDiscount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DurationDiscountToVehicle" ADD CONSTRAINT "_DurationDiscountToVehicle_B_fkey" FOREIGN KEY ("B") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
