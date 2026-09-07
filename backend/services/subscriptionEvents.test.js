const test = require("node:test");
const assert = require("node:assert/strict");
const { createSubscriptionEventProcessor, subscriptionAccess } = require("./subscriptionEvents");

test("subscription state preserves legacy contracts, cancellation timing and unknown-price denial", () => {
  const priceMap = (id) => ({ price_pro: "pro", price_teacher: "teacher" }[id] || "free");
  const subscription = { status: "active", cancel_at_period_end: true, items: { data: [{ price: { id: "price_pro" }, current_period_end: 2000000000 }] } };
  assert.equal(subscriptionAccess(subscription, priceMap).plan, "pro");
  assert.ok(subscriptionAccess(subscription, priceMap).currentPeriodEnd);
  for (const status of ["canceled", "unpaid", "past_due", "incomplete", "paused"]) assert.equal(subscriptionAccess({ ...subscription, status }, priceMap).plan, "free");
  assert.equal(subscriptionAccess({ ...subscription, items: { data: [{ price: { id: "price_teacher" } }] } }, priceMap).plan, "teacher");
  assert.equal(subscriptionAccess({ ...subscription, items: { data: [{ price: { id: "untrusted" } }] } }, priceMap).plan, "free");
});

test("duplicate/concurrent webhooks process once and failures can be retried", async () => {
  const seen = new Set();
  let calls = 0;
  let fail = false;
  const processor = createSubscriptionEventProcessor({ hasEvent: (id) => seen.has(id), recordEvent: (event) => seen.add(event.id), checkout: async () => {}, subscription: async () => { calls++; await new Promise((resolve) => setTimeout(resolve, 5)); if (fail) throw new Error("provider unavailable"); } });
  const event = { id: "evt_one", type: "customer.subscription.updated", data: { object: { id: "sub_test", customer: "cus_test" } } };
  const results = await Promise.all([processor(event), processor(event), processor(event)]);
  assert.equal(calls, 1);
  assert.equal(results.filter((result) => result.duplicate).length, 2);
  fail = true;
  await assert.rejects(processor({ ...event, id: "evt_retry" }));
  assert.equal(seen.has("evt_retry"), false);
  fail = false;
  await processor({ ...event, id: "evt_retry" });
  assert.equal(seen.has("evt_retry"), true);
});

test("out-of-order notifications reconcile latest state rather than trusting stale event data", async () => {
  const seen = new Set();
  const applied = [];
  let currentProviderStatus = "canceled";
  const processor = createSubscriptionEventProcessor({ hasEvent: (id) => seen.has(id), recordEvent: (event) => seen.add(event.id), checkout: async () => {}, subscription: async () => applied.push(currentProviderStatus) });
  const object = { id: "sub_fixture", customer: "cus_fixture", status: "active" };
  await processor({ id: "new", type: "customer.subscription.deleted", data: { object } });
  await processor({ id: "old", type: "customer.subscription.created", data: { object } });
  assert.deepEqual(applied, ["canceled", "canceled"]);
  currentProviderStatus = "active";
  await processor({ id: "invoice", type: "invoice.paid", data: { object: { customer: "cus_fixture", parent: { subscription_details: { subscription: "sub_fixture" } } } } });
  assert.equal(applied.at(-1), "active");
});
