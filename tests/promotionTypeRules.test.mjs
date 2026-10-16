import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  basketScopeWarning, conditionHidden, firstOrderLimitNote, firstOrderRule, isTypeLocked, lockedPerCustomerLimit,
  showsPeriodLimits, visibilityOffered,
} from "../src/pages/promotion/promotionTypeRules.js";

describe("what the promotion type already decides", () => {
  it("first order: used once, no daily / weekly limits", () => {
    assert.equal(lockedPerCustomerLimit({ benefitType: "first_order_discount" }).value, "1");
    assert.equal(showsPeriodLimits("first_order_discount"), false);
  });

  it("first N orders: the limit follows N", () => {
    assert.equal(lockedPerCustomerLimit({ benefitType: "first_x_orders_discount", firstOrders: "3" }).value, "3");
    assert.equal(lockedPerCustomerLimit({ benefitType: "first_x_orders_discount", firstOrders: "" }).value, "");
    assert.equal(showsPeriodLimits("first_x_orders_discount"), true);
  });

  it("other types leave the limit to the admin", () => {
    assert.equal(lockedPerCustomerLimit({ benefitType: "basket_discount" }), null);
    assert.equal(showsPeriodLimits("basket_discount"), true);
  });
});

describe("conditions offered in Audience", () => {
  it("order-history conditions are refused on first-order types only", () => {
    for (const type of ["FIRST_ORDER", "CUSTOMER_TYPE", "ORDER_COUNT"]) {
      assert.equal(conditionHidden(type, "first_order_discount").mustRemove, true);
      assert.equal(conditionHidden(type, "first_x_orders_discount").mustRemove, true);
      assert.equal(conditionHidden(type, "basket_discount"), null);
    }
  });

  it("rules with their own step are not offered again, but an existing one may stay", () => {
    for (const type of ["ZONE", "MINIMUM_SUBTOTAL", "MAXIMUM_SUBTOTAL", "MINIMUM_QUANTITY", "SCHEDULE", "BOOKING_TIME", "COUPON"]) {
      const covered = conditionHidden(type, "basket_discount");
      assert.equal(covered.mustRemove, false);
      assert.match(covered.reason, /→/);
    }
  });

  it("rules with no other home stay", () => {
    for (const type of ["PAYMENT_METHOD", "COLLECTION_DAY", "DELIVERY_DAY", "SERVICE", "CATEGORY", "PRODUCT", "ADDON", "MAXIMUM_QUANTITY"]) {
      assert.equal(conditionHidden(type, "first_order_discount"), null);
    }
  });
});

describe("visibility choices", () => {
  it("private (code only) needs a coupon code", () => {
    assert.equal(visibilityOffered("private_code", { activationType: "automatic", benefitType: "basket_discount" }), false);
    assert.equal(visibilityOffered("private_code", { activationType: "coupon_required", benefitType: "basket_discount" }), true);
  });

  it("targeted adds nothing to a first-order type", () => {
    assert.equal(visibilityOffered("targeted", { activationType: "automatic", benefitType: "first_order_discount" }), false);
    assert.equal(visibilityOffered("targeted", { activationType: "automatic", benefitType: "basket_discount" }), true);
    assert.equal(visibilityOffered("public", { activationType: "automatic", benefitType: "first_order_discount" }), true);
  });
});

describe("type lock", () => {
  it("locks once the promotion has been published", () => {
    assert.equal(isTypeLocked({ currentVersionId: 12 }), true);
    assert.equal(isTypeLocked({ currentVersionId: null }), false);
    assert.equal(isTypeLocked(null), false);
  });
});

describe("basket-wide promotions with a \"Basket contains\" condition", () => {
  it("warns that the discount still covers the whole basket", () => {
    const w = basketScopeWarning("basket_discount", [{ conditionType: "SERVICE" }]);
    assert.match(w, /whole basket/);
    assert.match(w, /Service, Category or Item Discount/);
    assert.match(basketScopeWarning("cashback", [{ conditionType: "CATEGORY" }]), /cashback is still worked out on the whole basket/);
  });

  it("stays quiet when the discount is already limited to items, or there is no such condition", () => {
    assert.equal(basketScopeWarning("service_discount", [{ conditionType: "SERVICE" }]), null);
    assert.equal(basketScopeWarning("basket_discount", [{ conditionType: "PAYMENT_METHOD" }]), null);
    assert.equal(basketScopeWarning("basket_discount", []), null);
  });
});

describe('"First order" condition on other types', () => {
  const first = (value, logicGroup = "ALL") => [{ conditionType: "FIRST_ORDER", operator: "equals", value, logicGroup }];

  it("reads only / never, and ignores an Any-of rule", () => {
    assert.equal(firstOrderRule(first(true)), "only");
    assert.equal(firstOrderRule(first("true")), "only");
    assert.equal(firstOrderRule(first(false)), "never");
    assert.equal(firstOrderRule(first(true, "ANY")), null);
    assert.equal(firstOrderRule([]), null);
  });

  it("warns when limits above 1 can never be reached", () => {
    const note = firstOrderLimitNote({ conditions: first(true), perCustomerLimit: "4", perDayLimit: "4", perWeekLimit: "" });
    assert.match(note, /once, on their first order/);
    assert.equal(firstOrderLimitNote({ conditions: first(true), perCustomerLimit: "1" }), null);
    assert.equal(firstOrderLimitNote({ conditions: first(false), perCustomerLimit: "4" }), null);
    assert.equal(firstOrderLimitNote({ conditions: [], perCustomerLimit: "4" }), null);
  });
});
