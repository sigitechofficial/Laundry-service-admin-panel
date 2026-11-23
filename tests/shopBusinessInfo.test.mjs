import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminShopBusinessInfoPath,
  machinesFromBusinessInfo,
} from "../src/pages/shop-management/shopBusinessInfo.js";

describe("adminShopBusinessInfoPath", () => {
  it("uses the admin endpoint, never the agent app's own-shop route", () => {
    assert.equal(adminShopBusinessInfoPath(42), "admin/agents/42/business-information");
    assert.ok(!adminShopBusinessInfoPath(42).startsWith("agent/"));
  });

  it("keeps the id a single path segment", () => {
    assert.equal(
      adminShopBusinessInfoPath("4/../x"),
      "admin/agents/4%2F..%2Fx/business-information"
    );
  });
});

describe("machinesFromBusinessInfo", () => {
  it("reads data.allMachineInformation from the API envelope", () => {
    const machines = [{ id: 1, name: "Washer" }, { id: 2, name: "Dryer" }];
    const response = {
      status: "1",
      message: "Information fetched",
      data: { allMachineInformation: machines, agentServices: [] },
    };
    assert.deepEqual(machinesFromBusinessInfo(response), machines);
  });

  it("is empty while loading or on an unexpected shape", () => {
    assert.deepEqual(machinesFromBusinessInfo(undefined), []);
    assert.deepEqual(machinesFromBusinessInfo({ data: {} }), []);
    assert.deepEqual(machinesFromBusinessInfo({ data: { allMachineInformation: "x" } }), []);
  });
});
