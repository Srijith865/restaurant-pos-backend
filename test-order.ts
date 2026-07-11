import { getOrCreateOpenOrder, addItemsToOrder } from "./src/services/orderService";

async function run() {
  try {
    const order = await getOrCreateOpenOrder("1", "1", "1");
    console.log("Order created:", order);

    const updated = await addItemsToOrder("1", order.id, [
      { menuItemId: "1", quantity: 2 }
    ]);
    console.log("Updated order:", updated);
  } catch (err) {
    console.error("Crash:", err);
  }
  process.exit(0);
}

run();
