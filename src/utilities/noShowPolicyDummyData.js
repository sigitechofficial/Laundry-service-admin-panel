const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(2));

/**
 * Random API payload for POST /admin/addNoShowPolicy
 */
export function buildRandomNoShowPolicyPayload({
  zoneId,
  currency = "USD",
  index = 0,
  isActive = false,
} = {}) {
  const useUnifiedFee = Math.random() > 0.4;
  const feeType = pick(["absolute", "percentage"]);
  const pickupFee = randFloat(8, 45);
  const deliveryFee = useUnifiedFee ? pickupFee : randFloat(12, 55);
  const suffix = `${Date.now()}-${index}`;

  return {
    name: `Dummy No-Show ${suffix}`,
    description: `Auto-generated dummy no-show policy for QA (#${index + 1})`,
    zoneId: Number(zoneId),
    effectiveFrom: new Date().toISOString(),
    effectiveTo: null,
    isActive,
    isDefault: false,
    enableForPickup: Math.random() > 0.15,
    enableForDelivery: Math.random() > 0.15,
    useUnifiedFee,
    feeType,
    currency,
    pickupNoShowFee: feeType === "absolute" ? pickupFee : 0,
    deliveryNoShowFee: feeType === "absolute" ? deliveryFee : 0,
    storageFeePerDay: randFloat(0, 8),
    percentageFee: feeType === "percentage" ? randFloat(5, 18) : 0,
    graceMinutesOnSite: randInt(5, 45),
    driverLateSLA: randInt(10, 40),
    callsMinutes: randInt(3, 15),
    smsMinutes: randInt(3, 15),
    waiverType: pick(["absolute", "percentage"]),
    absoluteWaiverAmount: randFloat(5, 25),
    percentageWaiverAmount: randFloat(5, 15),
    autoForgiveFirstNoShow: Math.random() > 0.3,
    autoForgiveCount: randInt(1, 3),
    autoForgivePeriod: randInt(14, 60),
    requirePaymentAfterCap: Math.random() > 0.2,
    perCustomerCap: randInt(2, 5),
    capWindowDays: randInt(14, 90),
  };
}

/** Batch of random policies for seeding the backend */
export function buildNoShowDummyPolicyBatch(zoneId, currency = "USD", count = 5) {
  return Array.from({ length: count }, (_, index) =>
    buildRandomNoShowPolicyPayload({
      zoneId,
      currency,
      index,
      isActive: index === 0,
    })
  );
}

/** Form values for react-hook-form reset (string fields) */
export function buildRandomNoShowFormValues({
  zoneId,
  currency = "USD",
  versionName = "Dummy Version",
} = {}) {
  const payload = buildRandomNoShowPolicyPayload({
    zoneId,
    currency,
    index: 0,
    isActive: true,
  });

  return {
    name: versionName || payload.name,
    description: payload.description,
    zoneId: zoneId != null ? String(zoneId) : "",
    effectiveFrom: new Date(),
    effectiveTo: null,
    isActive: payload.isActive,
    isDefault: false,
    enableForPickup: payload.enableForPickup,
    enableForDelivery: payload.enableForDelivery,
    useUnifiedFee: payload.useUnifiedFee,
    feeType: payload.feeType,
    currency: payload.currency,
    pickupNoShowFee: String(payload.pickupNoShowFee || ""),
    deliveryNoShowFee: String(payload.deliveryNoShowFee || ""),
    storageFeePerDay: String(payload.storageFeePerDay || ""),
    percentageFee: String(payload.percentageFee || ""),
    graceMinutesOnSite: String(payload.graceMinutesOnSite || ""),
    driverLateSLA: String(payload.driverLateSLA || ""),
    callsMinutes: String(payload.callsMinutes || ""),
    smsMinutes: String(payload.smsMinutes || ""),
    waiverType: payload.waiverType,
    absoluteWaiverAmount: String(payload.absoluteWaiverAmount || ""),
    percentageWaiverAmount: String(payload.percentageWaiverAmount || ""),
    autoForgiveFirstNoShow: payload.autoForgiveFirstNoShow,
    autoForgiveCount: String(payload.autoForgiveCount || ""),
    autoForgivePeriod: String(payload.autoForgivePeriod || ""),
    requirePaymentAfterCap: payload.requirePaymentAfterCap,
    perCustomerCap: String(payload.perCustomerCap || ""),
    capWindowDays: String(payload.capWindowDays || ""),
  };
}

/** Preset payloads aligned with NO_SHOW_TEST_CASES scenarios */
export function buildNoShowTestCasePayloads(zoneId, currency = "USD") {
  const z = Number(zoneId);
  const base = (name, extra) => ({
    name,
    description: `API test policy: ${name}`,
    zoneId: z,
    effectiveFrom: new Date().toISOString(),
    effectiveTo: null,
    isActive: false,
    isDefault: false,
    currency,
    storageFeePerDay: 0,
    graceMinutesOnSite: 15,
    driverLateSLA: 30,
    callsMinutes: 5,
    smsMinutes: 5,
    waiverType: "absolute",
    absoluteWaiverAmount: 0,
    percentageWaiverAmount: 0,
    autoForgiveCount: 1,
    autoForgivePeriod: 30,
    requirePaymentAfterCap: true,
    perCustomerCap: 3,
    capWindowDays: 30,
    ...extra,
  });

  return {
    "NS-001": base("TC NS-001 Standard", {
      enableForPickup: true,
      enableForDelivery: false,
      useUnifiedFee: true,
      feeType: "absolute",
      pickupNoShowFee: 10,
      deliveryNoShowFee: 10,
      percentageFee: 0,
      autoForgiveFirstNoShow: true,
    }),
    "NS-002": base("TC NS-002 Verify EUR", {
      currency: "EUR",
      enableForPickup: true,
      useUnifiedFee: true,
      feeType: "absolute",
      pickupNoShowFee: 25,
      deliveryNoShowFee: 25,
      graceMinutesOnSite: 15,
    }),
    "NS-005": base("TC NS-005 Split Fees", {
      enableForPickup: true,
      enableForDelivery: true,
      useUnifiedFee: false,
      feeType: "absolute",
      pickupNoShowFee: 10,
      deliveryNoShowFee: 25,
    }),
    "NS-006": base("TC NS-006 Percentage", {
      enableForPickup: true,
      useUnifiedFee: true,
      feeType: "percentage",
      pickupNoShowFee: 0,
      deliveryNoShowFee: 0,
      percentageFee: 10,
    }),
    "NS-012": base("TC NS-012 Both Off", {
      enableForPickup: false,
      enableForDelivery: false,
      useUnifiedFee: true,
      feeType: "absolute",
      pickupNoShowFee: 15,
      deliveryNoShowFee: 15,
    }),
  };
}

export const NO_SHOW_TEST_RESULTS_STORAGE_KEY = "noShowPolicyTestResults";

/**
 * Run API-level tests (create + verify). Returns map tcId -> { status, actualResult }
 */
export async function runNoShowPolicyApiTests({
  zoneId,
  currency = "USD",
  addNoShowPolicy,
  fetchNoShowPolicies,
}) {
  const payloads = buildNoShowTestCasePayloads(zoneId, currency);
  const results = {};

  const run = async (tcId, fn) => {
    try {
      const { status, actualResult } = await fn();
      results[tcId] = { status, actualResult };
    } catch (err) {
      results[tcId] = {
        status: "Fail",
        actualResult: err?.data?.message || err?.message || "Request failed",
      };
    }
  };

  await run("NS-001", async () => {
    const payload = payloads["NS-001"];
    const res = await addNoShowPolicy(payload).unwrap();
    const ok = String(res?.status) === "1";
    return {
      status: ok ? "Pass" : "Fail",
      actualResult: ok
        ? `Created policy id ${res?.data?.id ?? "ok"}`
        : res?.message || "Create failed",
    };
  });

  await run("NS-002", async () => {
    const payload = payloads["NS-002"];
    const createRes = await addNoShowPolicy(payload).unwrap();
    const listRes = await fetchNoShowPolicies({
      zoneId: String(zoneId),
      limit: 50,
      page: 1,
    }).unwrap();
    const policies = listRes?.data?.policies || [];
    const found = policies.find((p) => p.name === payload.name);
    const cfg = found?.noShowPolicyConfig || found?.noShowConfig || {};
    const feeOk =
      Number(cfg.pickupNoShowFee) === 25 || Number(cfg.pickupNoShowFee) === 25.0;
    return {
      status: found && feeOk ? "Pass" : "Fail",
      actualResult: found
        ? `Listed; pickup fee=${cfg.pickupNoShowFee}, currency=${cfg.currency}`
        : "Policy not found in list after create",
    };
  });

  await run("NS-005", async () => {
    const payload = payloads["NS-005"];
    const res = await addNoShowPolicy(payload).unwrap();
    const cfg =
      res?.data?.noShowPolicyConfig || res?.data?.noShowConfig || {};
    const ok =
      cfg.useUnifiedFee === false &&
      Number(cfg.pickupNoShowFee) === 10 &&
      Number(cfg.deliveryNoShowFee) === 25;
    return {
      status: ok ? "Pass" : "Fail",
      actualResult: `useUnifiedFee=${cfg.useUnifiedFee}, pickup=${cfg.pickupNoShowFee}, delivery=${cfg.deliveryNoShowFee}`,
    };
  });

  await run("NS-006", async () => {
    const payload = payloads["NS-006"];
    const res = await addNoShowPolicy(payload).unwrap();
    const cfg =
      res?.data?.noShowPolicyConfig || res?.data?.noShowConfig || {};
    const ok = cfg.feeType === "percentage" && Number(cfg.percentageFee) === 10;
    return {
      status: ok ? "Pass" : "Fail",
      actualResult: `feeType=${cfg.feeType}, percentageFee=${cfg.percentageFee}`,
    };
  });

  await run("NS-012", async () => {
    const payload = payloads["NS-012"];
    const res = await addNoShowPolicy(payload).unwrap();
    const cfg =
      res?.data?.noShowPolicyConfig || res?.data?.noShowConfig || {};
    const ok = cfg.enableForPickup === false && cfg.enableForDelivery === false;
    return {
      status: ok ? "Pass" : "Fail",
      actualResult: `pickup=${cfg.enableForPickup}, delivery=${cfg.enableForDelivery}`,
    };
  });

  ["NS-003", "NS-004", "NS-007", "NS-008", "NS-009", "NS-010", "NS-011"].forEach(
    (tcId) => {
      results[tcId] = {
        status: "Pending",
        actualResult: "Manual / order-flow test — run in app with live booking",
      };
    }
  );

  return results;
}
