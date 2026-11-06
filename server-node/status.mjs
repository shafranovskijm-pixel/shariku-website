import { openSalesDatabase, SalesStore } from "../lib/server/sales-store.mjs";
if (!process.env.SHARIKU_SQLITE_PATH) throw new Error("Private database setting required");
const db = openSalesDatabase(process.env.SHARIKU_SQLITE_PATH);
const store = new SalesStore(db);
const result = {
 managerBound: !!store.manager(),
 totalOrders: db.prepare("SELECT COUNT(*) AS n FROM sales_orders").get().n,
 deliveredOrders: db.prepare("SELECT COUNT(*) AS n FROM sales_orders WHERE delivery_status='delivered'").get().n,
 paidOrders: db.prepare("SELECT COUNT(*) AS n FROM sales_orders WHERE paid_at IS NOT NULL").get().n,
 testOrders: db.prepare("SELECT COUNT(*) AS n FROM sales_orders WHERE is_test=1").get().n,
 feedOrders: store.ordersForExport(Math.floor(Date.now() / 1000)).length,
};
if (process.env.SHARIKU_TEST_REQUEST_ID) {
 const order = store.order(process.env.SHARIKU_TEST_REQUEST_ID);
 result.testReceipt = order ? { exists: true, isTest: !!order.is_test, delivered: order.delivery_status === "delivered", paid: !!order.paid_at, inFeed: store.ordersForExport(Math.floor(Date.now() / 1000)).some(row => row.request_id === order.request_id) } : { exists: false };
}
console.log(JSON.stringify(result));
db.close();
