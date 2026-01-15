import { db } from "../pg"; 
import { users, products, orders, orderItems } from "../schema";
import { faker } from "@faker-js/faker";

async function main() {
  console.log("🌱 Seeding started...");

  // 1. 清除舊資料 (選用，順序需注意外鍵約束)
  // await db.delete(orderItems);
  // await db.delete(orders);
  // await db.delete(products);
  // await db.delete(users);

  // 2. 建立使用者 (20筆)
  console.log("  Creating users...");
  const userData = Array.from({ length: 1000 }).map(() => ({
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
  }));
  const insertedUsers = await db.insert(users).values(userData).returning();

  // 3. 建立商品 (20筆)
  console.log("  Creating products...");

  const productData = Array.from({ length: 1000 }).map(() => ({
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: faker.commerce.price({ min: 10, max: 1000 }),
    stock: faker.number.int({ min: 10, max: 100 }),
  }));
  const insertedProducts = await db.insert(products).values(productData).returning();

  // 4. 建立訂單與明細
  console.log("  Creating orders and items...");
  for (const user of insertedUsers) {
    const itemCount = faker.number.int({ min: 1, max: 3 });
    const selectedProducts = faker.helpers.arrayElements(insertedProducts, itemCount);
    
    let totalAmount = 0;

    // 先建立訂單主表 (先給 0 元，之後更新，或先計算好)
    const [order] = await db.insert(orders).values({
      userId: user.id,
      status: faker.helpers.arrayElement(['pending', 'paid', 'shipped', 'completed']),
      totalAmount: "0", // 暫時預設
    }).returning();

    // 建立明細並計算總額
    const itemsToInsert = selectedProducts.map((p) => {
      const quantity = faker.number.int({ min: 1, max: 5 });
      const unitPrice = parseFloat(p.price);
      totalAmount += unitPrice * quantity;

      return {
        orderId: order.id,
        productId: p.id,
        quantity: quantity,
        unitPrice: p.price,
      };
    });

    await db.insert(orderItems).values(itemsToInsert);

    // 更新訂單總金額
    // @ts-ignore - 處理 numeric 轉串改寫
    await db.update(orders)
      .set({ totalAmount: totalAmount.toFixed(2) })
      .where({ id: order.id });
  }

  console.log("✅ Seeding finished successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed!");
  console.error(err);
  process.exit(1);
});