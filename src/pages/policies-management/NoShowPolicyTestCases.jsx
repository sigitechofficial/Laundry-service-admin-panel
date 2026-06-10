import { useState, useMemo, useEffect } from "react";
import { Box, Typography, Select, MenuItem, FormControl } from "@mui/material";
import { BsCardList } from "../../shared/icons/index";
import DataTable from "../../components/ui/DataTable";
import ButtonBlueLight from "../../components/ui/ButtonBlueLight";
import useToaster from "../../components/ui/Toaster";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useAddNoShowPolicyMutation,
  useLazyGetNoShowPoliciesQuery,
  useGetAllZonesQuery,
} from "../../store/services/api";
import {
  runNoShowPolicyApiTests,
  NO_SHOW_TEST_RESULTS_STORAGE_KEY,
} from "../../utilities/noShowPolicyDummyData";
import { mergedZonesList, currencyCodeFromZone, buildCurrencyUnitsList } from "../../utilities/zonesList";

const NO_SHOW_TEST_CASES = [
  { tcId: "NS-001", section: "Add Policy", scenario: "Add no-show policy with required fields and verify in list", policySetup: "Name; Description; EnableForPickup=ON; FeeType=absolute; PickupNoShowFee=10; Currency=USD", orderValue: "N/A", timing: "New policy", steps: "Fill form -> Submit -> Open list", expectedFee: "N/A", expectedResult: "Policy created; appears in list with correct name" },
  { tcId: "NS-002", section: "Verify Policy", scenario: "After add verify config is returned correctly", policySetup: "Add with PickupNoShowFee=25; Currency=EUR; GraceMinutesOnSite=15", orderValue: "N/A", timing: "After submit", steps: "Add policy -> GET list or view detail", expectedFee: "N/A", expectedResult: "Policy has same fee; currency; grace in response" },
  { tcId: "NS-003", section: "Pickup No-Show", scenario: "Pickup no-show charges absolute fee", policySetup: "EnableForPickup=ON; FeeType=absolute; PickupNoShowFee=15; Currency=USD", orderValue: "100", timing: "Customer does not show at pickup", steps: "Schedule pickup -> Mark no-show", expectedFee: "15", expectedResult: "No-show recorded; charge 15" },
  { tcId: "NS-004", section: "Delivery No-Show", scenario: "Delivery no-show charges absolute fee", policySetup: "EnableForDelivery=ON; FeeType=absolute; DeliveryNoShowFee=20; Currency=USD", orderValue: "150", timing: "Customer not available for delivery", steps: "Schedule delivery -> Mark no-show", expectedFee: "20", expectedResult: "No-show recorded; charge 20" },
  { tcId: "NS-005", section: "Fees", scenario: "Unified OFF => separate pickup and delivery fees", policySetup: "UseUnifiedFee=OFF; PickupNoShowFee=10; DeliveryNoShowFee=25", orderValue: "100", timing: "Pickup then delivery no-show", steps: "Pickup no-show -> 10; Delivery no-show -> 25", expectedFee: "10 then 25", expectedResult: "Pickup: 10; Delivery: 25" },
  { tcId: "NS-006", section: "Fees", scenario: "Absolute fee => fixed amount; percentage => % of order", policySetup: "FeeType=absolute; PickupNoShowFee=15 OR FeeType=percentage; PercentageFee=10", orderValue: "200", timing: "Pickup no-show", steps: "Absolute: charge 15; Percentage: charge 10% of 200 = 20", expectedFee: "15 or 20", expectedResult: "Correct fee per type" },
  { tcId: "NS-007", section: "Grace", scenario: "After grace window => no-show applied and fee charged", policySetup: "GraceMinutesOnSite=30; PickupNoShowFee=15", orderValue: "100", timing: "Customer does not show by end of 30 min", steps: "Wait grace -> Mark no-show", expectedFee: "15", expectedResult: "No-show after grace; charge 15" },
  { tcId: "NS-008", section: "Waiver", scenario: "Driver late beyond SLA => fee waived", policySetup: "WaiverType=absolute; AbsoluteWaiverAmount=15; DriverLateSLA=15; PickupNoShowFee=15", orderValue: "100", timing: "Driver 20 min late; customer left", steps: "Driver late -> No-show", expectedFee: "0", expectedResult: "Fee waived; charge 0" },
  { tcId: "NS-009", section: "Auto-Forgive", scenario: "First no-show forgiven; second charged", policySetup: "AutoForgiveFirstNoShow=ON; PickupNoShowFee=15", orderValue: "100", timing: "1st then 2nd no-show", steps: "First no-show -> 0; Second no-show -> 15", expectedFee: "0 then 15", expectedResult: "First waived; second charge 15" },
  { tcId: "NS-010", section: "Per-Customer Cap", scenario: "At cap => no further fee or block", policySetup: "PerCustomerCap=2; CapWindowDays=30; RequirePaymentAfterCap=ON; PickupNoShowFee=15", orderValue: "100", timing: "3rd no-show in 30 days", steps: "First two charged; third no-show", expectedFee: "0 or block", expectedResult: "Capped; no fee or block per config" },
  { tcId: "NS-011", section: "Storage", scenario: "Storage fee + no-show fee both applied", policySetup: "StorageFeePerDay=5; PickupNoShowFee=15", orderValue: "100", timing: "Bags stored 3 days after no-show", steps: "No-show -> Store 3 days", expectedFee: "15 + 15", expectedResult: "No-show 15 + storage 5*3 = 30 total" },
  { tcId: "NS-012", section: "Edge", scenario: "Both pickup and delivery OFF => no fee", policySetup: "EnableForPickup=OFF; EnableForDelivery=OFF; PickupNoShowFee=15", orderValue: "100", timing: "No-show event", steps: "No-show", expectedFee: "0", expectedResult: "Policy not applied; no fee" },
];

export default function NoShowPolicyTestCases() {
  const navigate = useNavigate();
  const { success, error: showError } = useToaster();
  const [addNoShowPolicy] = useAddNoShowPolicyMutation();
  const [fetchNoShowPolicies] = useLazyGetNoShowPoliciesQuery();
  const { data: zonesQueryData } = useGetAllZonesQuery();
  const zonesReduxNode = useSelector((state) => state?.apiData?.zones);
  const zonesList = useMemo(
    () => mergedZonesList(zonesQueryData, zonesReduxNode),
    [zonesQueryData, zonesReduxNode]
  );
  const [isRunningTests, setIsRunningTests] = useState(false);

  const [results, setResults] = useState(() =>
    Object.fromEntries(NO_SHOW_TEST_CASES.map((tc) => [tc.tcId, { status: "Pending", actualResult: "" }]))
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NO_SHOW_TEST_RESULTS_STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw);
      setResults((prev) => {
        const next = { ...prev };
        Object.entries(stored).forEach(([tcId, row]) => {
          if (next[tcId]) {
            next[tcId] = {
              status: row.status || "Pending",
              actualResult: row.actualResult || "",
            };
          }
        });
        return next;
      });
      sessionStorage.removeItem(NO_SHOW_TEST_RESULTS_STORAGE_KEY);
    } catch {
      // ignore invalid storage
    }
  }, []);

  const handleRunApiTests = async () => {
    const zoneId = zonesList[0]?.id;
    if (!zoneId) {
      showError("Add at least one zone before running API tests.");
      return;
    }
    const currency = currencyCodeFromZone(zonesList[0], buildCurrencyUnitsList()) || "USD";

    setIsRunningTests(true);
    try {
      const apiResults = await runNoShowPolicyApiTests({
        zoneId,
        currency,
        addNoShowPolicy: (body) => addNoShowPolicy(body),
        fetchNoShowPolicies: (params) => fetchNoShowPolicies(params),
      });
      setResults((prev) => {
        const next = { ...prev };
        Object.entries(apiResults).forEach(([tcId, row]) => {
          if (next[tcId]) {
            next[tcId] = {
              status: row.status || "Pending",
              actualResult: row.actualResult || "",
            };
          }
        });
        return next;
      });
      const passed = Object.values(apiResults).filter((r) => r.status === "Pass").length;
      success(`API tests complete: ${passed} passed.`);
    } catch (err) {
      console.error(err);
      showError("Failed to run API tests.");
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleStatusChange = (tcId, value) => {
    setResults((prev) => ({ ...prev, [tcId]: { ...prev[tcId], status: value } }));
  };

  const handleActualResultChange = (tcId, value) => {
    setResults((prev) => ({ ...prev, [tcId]: { ...prev[tcId], actualResult: value } }));
  };

  const tableData = useMemo(
    () =>
      NO_SHOW_TEST_CASES.map((tc) => ({
        id: tc.tcId,
        tcId: tc.tcId,
        section: tc.section,
        scenario: tc.scenario,
        policySetup: tc.policySetup,
        orderValue: tc.orderValue,
        timing: tc.timing,
        steps: tc.steps,
        expectedFee: tc.expectedFee,
        expectedResult: tc.expectedResult,
        status: results[tc.tcId]?.status ?? "Pending",
        actualResult: results[tc.tcId]?.actualResult ?? "",
      })),
    [results]
  );

  const columns = [
    { field: "tcId", headerName: "TC ID", flex: 0.06, minWidth: 80, sortable: true },
    { field: "section", headerName: "Section", flex: 0.1, minWidth: 100, sortable: true },
    { field: "scenario", headerName: "Scenario", flex: 0.18, minWidth: 180, sortable: true },
    { field: "policySetup", headerName: "Policy Setup", flex: 0.2, minWidth: 200, sortable: false },
    { field: "steps", headerName: "Steps", flex: 0.15, minWidth: 150, sortable: false },
    { field: "expectedResult", headerName: "Expected Result", flex: 0.15, minWidth: 150, sortable: false },
    {
      field: "status",
      headerName: "Status",
      flex: 0.1,
      minWidth: 110,
      sortable: true,
      renderCell: (row) => (
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select
            value={row.status}
            onChange={(e) => handleStatusChange(row.tcId, e.target.value)}
            displayEmpty
            sx={{ height: 36, fontSize: "13px" }}
          >
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Pass">Pass</MenuItem>
            <MenuItem value="Fail">Fail</MenuItem>
          </Select>
        </FormControl>
      ),
    },
    {
      field: "actualResult",
      headerName: "Actual Result",
      flex: 0.15,
      minWidth: 150,
      sortable: false,
      renderCell: (row) => (
        <Box
          component="input"
          type="text"
          value={row.actualResult}
          onChange={(e) => handleActualResultChange(row.tcId, e.target.value)}
          placeholder="Enter result..."
          sx={{
            width: "100%",
            maxWidth: 200,
            p: "6px 8px",
            fontSize: "13px",
            border: "1px solid #e0e0e0",
            borderRadius: 1,
            fontFamily: "Switzer",
            "&:focus": { outline: "none", borderColor: "primary.main" },
          }}
        />
      ),
    },
  ];

  return (
    <Box>
      <Box className="flex items-center gap-x-5 justify-between" sx={{ mb: "24px" }}>
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <BsCardList size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily="Switzer" color="grey.20">
            No Show Policy – Test Cases
          </Typography>
        </Box>
        <Box className="flex items-center gap-3">
          <ButtonBlueLight
            variant="contained"
            bgColor="#8B5CF6"
            color="white"
            radius="8px"
            onClick={handleRunApiTests}
            disabled={isRunningTests}
          >
            {isRunningTests ? "Running…" : "Run API Tests"}
          </ButtonBlueLight>
          <ButtonBlueLight
            variant="outlined"
            bgColor="blue.200"
            color="white"
            radius="8px"
            onClick={() => navigate("/policies-management/no-show-policy")}
          >
            Back to No Show Policy
          </ButtonBlueLight>
        </Box>
      </Box>

      <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer" }}>
        Major test cases for adding and verifying no-show policy. Update Status and Actual Result as you run tests.
      </Typography>

      <Box sx={{ width: "100%", overflow: "auto" }}>
        <DataTable
          data={tableData}
          columns={columns}
          height={600}
          showFilters={false}
          showDateRange={false}
          showDownload={false}
        />
      </Box>
    </Box>
  );
}
