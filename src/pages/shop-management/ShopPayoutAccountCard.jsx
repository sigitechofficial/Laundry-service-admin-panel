import { Button } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import {
  useCreateShopPayoutOnboardingLinkMutation,
  useEnsureShopPayoutAccountMutation,
  useGetShopPayoutAccountQuery,
} from "../../store/services/api";
import { DirectoryDotPill } from "../directory-table/directoryTable";

const CARD = {
  padding: 20,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
  marginBottom: 16,
};

/**
 * Enterprise payout destination: Stripe Connect Express (default).
 * Bank details are added in Stripe onboarding — not stored in Laundry admin.
 */
export default function ShopPayoutAccountCard({ shopId }) {
  const { success, error: toastError } = useToaster();
  const { data, isLoading, isError, refetch } = useGetShopPayoutAccountQuery(shopId, {
    skip: !shopId,
  });
  const [ensureAccount, { isLoading: ensuring }] = useEnsureShopPayoutAccountMutation();
  const [createLink, { isLoading: linking }] = useCreateShopPayoutOnboardingLinkMutation();

  const account = data?.data || {};
  const busy = ensuring || linking;

  const handleEnsure = async () => {
    try {
      const res = await ensureAccount(shopId).unwrap();
      success(res?.message || "Payout account ready");
      refetch();
    } catch (err) {
      toastError(err?.data?.message || err?.message || "Could not ensure Connect account");
    }
  };

  const handleOnboarding = async () => {
    try {
      const res = await createLink(shopId).unwrap();
      const url = res?.data?.onboardingUrl;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        success("Opened Stripe onboarding — add bank details there");
      } else {
        toastError("No onboarding URL returned");
      }
      refetch();
    } catch (err) {
      toastError(err?.data?.message || err?.message || "Could not create onboarding link");
    }
  };

  if (!shopId) return null;

  return (
    <div style={CARD}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Agent payout account
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#4b5563", maxWidth: 520, lineHeight: 1.5 }}>
            Stripe Connect is the default payout method (created at shop signup). Bank accounts are
            added in Stripe onboarding — admin does not store raw bank details.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
          <Button size="sm" variant="secondary" disabled={busy || isLoading} onClick={handleEnsure}>
            {ensuring ? "Ensuring…" : "Ensure Stripe Connect"}
          </Button>
          <Button size="sm" disabled={busy || isLoading} onClick={handleOnboarding}>
            {linking ? "Opening…" : "Add / update bank (Stripe)"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="jd-lead" style={{ margin: "12px 0 0" }}>
          Loading payout account…
        </p>
      ) : isError ? (
        <p className="jd-lead" style={{ margin: "12px 0 0" }}>
          Could not load payout account.{" "}
          <button type="button" onClick={() => refetch()} style={{ color: "#1d4ed8", background: "none", border: 0, cursor: "pointer" }}>
            Retry
          </button>
        </p>
      ) : (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Status</div>
            <DirectoryDotPill tone={account.canReceiveTransfers ? "success" : "warning"}>
              {account.canReceiveTransfers
                ? "Ready for withdrawals"
                : account.connectAccountId
                  ? "Onboarding incomplete"
                  : "Not created"}
            </DirectoryDotPill>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Connect account</div>
            <div style={{ fontWeight: 600, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
              {account.connectAccountId || "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Transfers</div>
            <div style={{ fontWeight: 600 }}>
              {account.transfersEnabled ? "Enabled" : "Disabled"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Payouts</div>
            <div style={{ fontWeight: 600 }}>
              {account.payoutsEnabled ? "Enabled" : "Disabled"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
