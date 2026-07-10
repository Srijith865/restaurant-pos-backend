import { prisma } from "./src/config/prisma";

async function run() {
  const staff = await prisma.staff.findMany({
    select: {
      id: true,
      phone: true,
      name: true,
      restaurantId: true,
      restaurant: {
        select: { name: true }
      }
    }
  });
  console.log(JSON.stringify(staff, null, 2));

  const tables = await prisma.diningTable.findMany({
    select: { restaurantId: true, label: true }
  });
  console.log("TABLES:", JSON.stringify(tables, null, 2));
}
run();
