"use strict";

// Single-instance per-customer ordering prevents concurrent webhook handlers
// from applying older retrieved state after a newer event has completed.
function createSubscriptionEventProcessor({ hasEvent, recordEvent, checkout, subscription }) {
  const queues = new Map();
  return function processEvent(event) {
    const object = event.data.object;
    const customer = typeof object.customer === "string" ? object.customer : object.customer?.id;
    const key = customer || object.id;
    const previous = queues.get(key) || Promise.resolve();
    const current = previous.catch(() => {}).then(async () => {
      if (hasEvent(event.id)) return { received: true, duplicate: true };
      if (event.type === "checkout.session.completed") await checkout(object);
      else if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) await subscription(object);
      else if (["invoice.paid", "invoice.payment_failed"].includes(event.type)) {
        const subscriptionId = object.parent?.subscription_details?.subscription || object.subscription;
        if (subscriptionId) await subscription({ id: typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id });
      }
      recordEvent(event);
      return { received: true };
    });
    queues.set(key, current);
    current.finally(() => { if (queues.get(key) === current) queues.delete(key); }).catch(() => {});
    return current;
  };
}

function subscriptionAccess(subscription, planFromPrice) {
  const plans = (subscription?.items?.data || []).map((item) => planFromPrice(item.price?.id));
  const contractedPlan = ["institution", "teacher", "pro"].find((plan) => plans.includes(plan)) || "free";
  const status = subscription?.status || "inactive";
  const periodEnd = subscription?.current_period_end || subscription?.items?.data?.[0]?.current_period_end;
  return {
    plan: ["active", "trialing"].includes(status) ? contractedPlan : "free",
    status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };
}
module.exports = { createSubscriptionEventProcessor, subscriptionAccess };
