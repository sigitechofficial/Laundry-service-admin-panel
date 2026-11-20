import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INITIAL_FORM, buildPayload, formFromPromotion, validateStep,
} from "../src/pages/promotion/promotionForm.js";
import { INITIAL, quickOfferToPreset, toPayload, validate } from "../src/pages/promotion/quickOfferRules.js";

// Prices the catalog would give: T-shirt (118) £4.50, Trousers (1) £7.50.
const PRICES = { 118: 4.5, 1: 7.5, 41: 12 };
const priceOf = (id) => PRICES[Number(id)] ?? NaN;

/** Create promotion answers → "More options" → the full form, as the page does it. */
const moreOptions = (answers) => ({ ...INITIAL_FORM(), ...quickOfferToPreset({ ...INITIAL(), ...answers }) });
/** First error over every step before Review, as Save does it. */
const firstError = (form) => {
  for (let s = 0; s < 5; s += 1) {
    const err = validateStep(s, form, priceOf);
    if (err) return err;
  }
  return null;
};
const form = (patch) => ({ ...INITIAL_FORM(), name: "Test", ...patch });

describe("More options keeps what Create promotion had", () => {
  it("whole order % off with cap and minimum", () => {
    const f = moreOptions({ name: "10% off", on: "order", what: "percent", value: "10", maxOff: "5", minOrder: "30" });
    assert.equal(firstError(f), null);
    const p = buildPayload(f);
    assert.equal(p.benefitType, "basket_discount");
    assert.equal(p.discountMode, "percent");
    assert.equal(p.discountValue, 10);
    assert.equal(p.maxDiscountCap, 5);
    assert.equal(p.minSubtotal, 30);
    assert.equal(p.targetType, "basket");
    assert.equal(p.targetIds, null);
  });

  it("whole order £ off has no cap", () => {
    const p = buildPayload(moreOptions({ name: "£5 off", on: "order", what: "amount", value: "5", maxOff: "9" }));
    assert.equal(p.discountMode, "amount");
    assert.equal(p.discountValue, 5);
    assert.equal(p.maxDiscountCap, null);
  });

  it("specific services", () => {
    const p = buildPayload(moreOptions({ name: "Dry clean", on: "service", what: "percent", value: "20", targetIds: ["3"] }));
    assert.equal(p.benefitType, "service_discount");
    assert.equal(p.targetType, "service");
    assert.deepEqual(p.targetIds, [3]);
  });

  it("specific items, £ off each", () => {
    const p = buildPayload(moreOptions({ name: "£1 each", on: "item", what: "amount", value: "1", targetIds: ["118"] }));
    assert.equal(p.benefitType, "item_discount");
    assert.equal(p.targetType, "subCategory");
    assert.deepEqual(p.targetIds, [118]);
    assert.equal(p.discountMode, "amount");
  });

  it("bulk deal keeps its service, items, pieces and price", () => {
    const f = moreOptions({
      name: "10 T-shirts", on: "item", what: "bulk",
      deals: [{ serviceIds: ["3"], itemIds: ["118"], qty: "10", price: "30" }],
    });
    assert.equal(firstError(f), null);
    const p = buildPayload(f);
    assert.equal(p.benefitType, "bundle");
    assert.deepEqual(p.benefitConfig.deals, [{ itemIds: [118], serviceIds: [3], quantity: 10, price: 30 }]);
    assert.deepEqual(p.targetIds, [118]);
    assert.equal(p.discountValue, 30);
    assert.equal(p.benefitConfig.bundleQuantity, 10);
  });

  it("several bulk deals", () => {
    const f = moreOptions({
      name: "Two deals", on: "item", what: "bulk",
      deals: [
        { serviceIds: ["3"], itemIds: ["118"], qty: "10", price: "30" },
        { serviceIds: ["3"], itemIds: ["1"], qty: "5", price: "25" },
      ],
    });
    assert.equal(firstError(f), null);
    const p = buildPayload(f);
    assert.equal(p.benefitConfig.deals.length, 2);
    assert.deepEqual(p.targetIds, [118, 1]);
  });

  it("a code", () => {
    const p = buildPayload(moreOptions({ name: "Code", what: "amount", value: "5", who: "code", code: "save5" }));
    assert.equal(p.activationType, "coupon_required");
    assert.equal(p.visibility, "private_code");
    assert.deepEqual(p.couponCodes, [{ code: "SAVE5", codeType: "shared" }]);
  });

  it("first order", () => {
    const p = buildPayload(moreOptions({ name: "New", what: "percent", value: "15", who: "first" }));
    assert.deepEqual(p.conditions, [{ conditionType: "FIRST_ORDER", operator: "equals", value: true, logicGroup: "ALL" }]);
  });

  it("only if the order includes an item", () => {
    const p = buildPayload(moreOptions({
      name: "Jacket", what: "percent", value: "10", needs: true, needServiceIds: ["3"], needItemIds: ["41"],
    }));
    assert.deepEqual(p.conditions, [{ conditionType: "PRODUCT", operator: "in", value: [41], logicGroup: "ALL" }]);
  });

  it("only if the order includes a service", () => {
    const p = buildPayload(moreOptions({ name: "DC", what: "percent", value: "10", needs: true, needServiceIds: ["3"] }));
    assert.deepEqual(p.conditions, [{ conditionType: "SERVICE", operator: "in", value: [3], logicGroup: "ALL" }]);
  });

  it("dates with 24-hour times, limits and budget", () => {
    const p = buildPayload(moreOptions({
      name: "Timed", what: "percent", value: "10", startDate: "2026-11-21", startTime: "09:30", endDate: "2026-11-22", endTime: "18:00",
      perCustomer: "2", totalUses: "50", budget: "100",
    }));
    assert.equal(p.startDate, "2026-11-21T09:30");
    assert.equal(p.endDate, "2026-11-22T18:00");
    assert.equal(p.perCustomerLimit, 2);
    assert.equal(p.globalUsageLimit, 50);
    assert.equal(p.budget, 100);
  });

  it("whole days without times", () => {
    const p = buildPayload(moreOptions({ name: "Day", what: "percent", value: "10", startDate: "2026-11-21", endDate: "2026-11-21" }));
    assert.equal(p.startDate, "2026-11-21");
    assert.equal(p.endDate, "2026-11-21");
  });

  it("Create promotion and More options save the same thing", () => {
    const answers = { ...INITIAL(), name: "Same", on: "service", what: "percent", value: "20", targetIds: ["3"], maxOff: "4", minOrder: "20", budget: "50" };
    const quick = toPayload(answers);
    const full = buildPayload({ ...INITIAL_FORM(), ...quickOfferToPreset(answers) });
    for (const k of ["benefitType", "discountMode", "discountValue", "maxDiscountCap", "minSubtotal", "targetType", "activationType", "visibility", "perCustomerLimit", "budget", "startDate", "endDate"]) {
      assert.deepEqual(full[k], quick[k], k);
    }
    assert.deepEqual(full.targetIds, quick.targetIds);
  });
});

describe("Edit loads and saves a promotion unchanged", () => {
  it("bulk deals round-trip", () => {
    const saved = {
      id: 45, name: "Bulk", benefitType: "bundle", discountMode: "amount", discountValue: "28.00", targetType: "subCategory", targetIds: [118],
      benefitConfig: { bundleQuantity: 10, deals: [{ price: 28, itemIds: [118], quantity: 10, serviceIds: [3] }] },
      zoneScopeMode: "all", activationType: "automatic", visibility: "public", priority: 50, perCustomerLimit: null,
    };
    const p = buildPayload(formFromPromotion(saved));
    assert.deepEqual(p.benefitConfig.deals, saved.benefitConfig.deals);
    assert.equal(p.discountValue, 28);
    assert.equal(p.perCustomerLimit, null);
  });

  it("an older bulk offer (no deals list) becomes one deal", () => {
    const saved = {
      id: 9, name: "Old bulk", benefitType: "bundle", discountValue: "30", targetType: "subCategory", targetIds: [118],
      benefitConfig: { bundleQuantity: 10 },
    };
    const f = formFromPromotion(saved);
    assert.deepEqual(f.deals, [{ itemIds: ["118"], serviceIds: [], qty: "10", price: "30" }]);
  });

  it("whole order with a time window round-trips", () => {
    const saved = {
      id: 7, name: "Win", benefitType: "basket_discount", discountMode: "percent", discountValue: "10", maxDiscountCap: "2",
      targetType: "basket", startDay: "2026-11-21", startTime: "09:30", endDay: "2026-11-22", endTime: "23:59",
      recurringDays: [2, 4], recurringStartTime: "09:00:00", recurringEndTime: "12:00:00",
    };
    const p = buildPayload(formFromPromotion(saved));
    assert.equal(p.startDate, "2026-11-21T09:30");
    assert.equal(p.endDate, "2026-11-22");
    assert.deepEqual(p.recurringDays, [2, 4]);
    assert.equal(p.recurringStartTime, "09:00");
    assert.equal(p.recurringEndTime, "12:00");
  });
});

describe("Every type saves the right fields", () => {
  it("cashback %", () => {
    const p = buildPayload(form({ benefitType: "cashback", discountMode: "percent", discountValue: "10", maxDiscountCap: "3" }));
    assert.equal(p.discountMode, "percent");
    assert.equal(p.maxDiscountCap, 3);
    assert.equal(p.targetType, "basket");
  });
  it("fixed price needs its ceiling", () => {
    assert.match(firstError(form({ benefitType: "fixed_price", discountValue: "20" })), /laundry totals up to/);
    const f = form({ benefitType: "fixed_price", discountValue: "20", maxSubtotal: "40" });
    assert.equal(firstError(f), null);
    const p = buildPayload(f);
    assert.equal(p.discountMode, null);
    assert.equal(p.maxSubtotal, 40);
  });
  it("free delivery has no value", () => {
    const p = buildPayload(form({ benefitType: "free_delivery", discountValue: "5" }));
    assert.equal(p.discountValue, null);
    assert.equal(p.targetType, "delivery");
  });
  it("first N orders", () => {
    const p = buildPayload(form({ benefitType: "first_x_orders_discount", discountValue: "10", firstOrders: "3" }));
    assert.deepEqual(p.benefitConfig, { firstOrders: 3 });
    assert.equal(p.discountMode, "percent");
  });
  it("category discount", () => {
    const p = buildPayload(form({ benefitType: "category_discount", targetType: "category", discountValue: "10", targetIds: ["10"] }));
    assert.equal(p.targetType, "category");
    assert.deepEqual(p.targetIds, [10]);
  });
  it("a campaign takes the place of the promotion's own budget", () => {
    const p = buildPayload(form({ discountValue: "10", campaignId: "4", budget: "100" }));
    assert.equal(p.campaignId, 4);
    assert.equal(p.budget, null);
  });
  it("zones: only chosen zones and their overrides are saved; bulk deals have no zone price", () => {
    const p = buildPayload(form({
      benefitType: "bundle", deals: [{ serviceIds: ["3"], itemIds: ["118"], qty: "10", price: "30" }],
      zoneScopeMode: "selected", zoneIds: ["1"],
      zoneOverrides: [{ zoneId: "1", discountValue: "25", maxDiscountCap: "", minSubtotal: "" }, { zoneId: "2", discountValue: "20", maxDiscountCap: "", minSubtotal: "" }],
    }));
    assert.deepEqual(p.zoneIds, [1]);
    assert.equal(p.zoneOverrides.length, 1);
    assert.equal(p.zoneOverrides[0].discountValue, null);
  });
});

describe("The form stops what would go wrong", () => {
  it("no name", () => assert.match(firstError(form({ name: "", discountValue: "10" })), /name/));
  it("more than 100%", () => assert.match(firstError(form({ discountValue: "120" })), /100%/));
  it("a code is needed", () => assert.match(firstError(form({ discountValue: "5", activationType: "coupon_required" })), /at least one code/));
  it("bulk deal with no service", () => {
    assert.match(firstError(form({ benefitType: "bundle", deals: [{ serviceIds: [], itemIds: ["118"], qty: "10", price: "30" }] })), /service/);
  });
  it("bulk deal dearer than normal", () => {
    assert.match(firstError(form({ benefitType: "bundle", deals: [{ serviceIds: ["3"], itemIds: ["118"], qty: "10", price: "45" }] })), /less than the normal £45/);
  });
  it("selected zones but none chosen", () => assert.match(firstError(form({ discountValue: "10", zoneScopeMode: "selected" })), /zone/));
  it("end before start", () => assert.match(firstError(form({ discountValue: "10", startDate: "2026-11-22", endDate: "2026-11-21" })), /End date/));
  it("same day, end time before start time", () => {
    assert.match(firstError(form({ discountValue: "10", startDate: "2026-11-21", startTime: "18:00", endDate: "2026-11-21", endTime: "09:00" })), /end time/);
  });
  it("repeat window needs both times", () => assert.match(firstError(form({ discountValue: "10", recurringStartTime: "09:00" })), /both From and To/));
  it("repeat window From = To", () => {
    assert.match(firstError(form({ discountValue: "10", recurringStartTime: "09:00", recurringEndTime: "09:00" })), /same time/);
  });
  it("laundry total up to below over", () => {
    assert.match(firstError(form({ discountValue: "10", minSubtotal: "50", maxSubtotal: "20" })), /Laundry total up to/);
  });
  it("Create promotion: bulk deal dearer than normal", () => {
    const err = validate({ ...INITIAL(), name: "X", on: "item", what: "bulk", deals: [{ serviceIds: ["3"], itemIds: ["118"], qty: "10", price: "50" }] }, priceOf);
    assert.match(err, /less than the normal/);
  });
});
