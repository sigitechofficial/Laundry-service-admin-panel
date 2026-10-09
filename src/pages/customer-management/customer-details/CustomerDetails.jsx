import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Input,
  PhoneInput,
  Modal,
  PageHeader,
  PasswordInput,
  Select,
  Table,
} from "../../../design-system";
import { useNavigate, useParams } from "react-router-dom";
import { useEditCustomerMutation, useGetCustomerByIdQuery, useExcludeCustomerFromShopMutation, useIncludeCustomerForShopMutation, useGetCustomerRecurringPlansQuery, useUpdateCustomerRecurringPlanMutation, useGetCustomerRoutingEventsQuery, useAssignCustomerToShopMutation } from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import ZoiperCallButton from "../../../components/shared/ZoiperCallButton";
import useToaster from "../../../components/ui/Toaster";
import { openOrdersNotice } from "../openOrdersNotice";
import { getApiErrorMessage } from "../../../store/services/apiErrors";
import { customerPhoneError } from "../../../utilities/customerPhone";
import DeleteOrderModal from "../../order-management/order-modals/DeleteOrderModal";
import AssignOrderModal from "../../order-management/order-modals/AssignOrderModal";
import { useOrderListColumns } from "../../order-management/useOrderListColumns";
import { mapBookingToOrderListRow, resolveShopName } from "../../order-management/orderListUtils";
import { formatDate, formatMoney, resolveCurrencySymbol } from "../../../utilities/formatters";
import { formatUserPhone, openTel, openWhatsApp } from "../../../utilities/contactLinks";
import {
  DirectoryMetrics,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../../directory-table/directoryTable";
import { BlockUserButton, AnonymizeDeleteModal } from "../../user-management/UserBlockActions";
import { isAccountBlocked } from "../../../utilities/accountBlocked";
import CustomerShopHistoryPanel from "./CustomerShopHistoryPanel";
import AssignCustomerShopModal from "../AssignCustomerShopModal";
import UnlinkCustomerShopModal from "../UnlinkCustomerShopModal";
import ExcludeCustomerShopModal from "../ExcludeCustomerShopModal";
import ConfirmAssignShopModal from "../ConfirmAssignShopModal";
import CustomerRoutingEventsPanel from "../CustomerRoutingEventsPanel";

const PANEL = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

export default function CustomerDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { success, error: showError, warning } = useToaster();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchOrders, setSearchOrders] = useState("");
  const [shopFilterId, setShopFilterId] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, orderId: null });
  const [assignModal, setAssignModal] = useState({
    open: false,
    orderId: null,
    booking: null,
  });
  const [contactModal, setContactModal] = useState(false);
  const [anonymizeModal, setAnonymizeModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNum: "",
    streetAddress: "",
    province: "",
    password: "",
    confirmPassword: "",
  });
  const [settingsErrors, setSettingsErrors] = useState({});

  const { data, isLoading, isError, refetch } = useGetCustomerByIdQuery(id, { skip: !id });
  const {
    data: recurringPlansResponse,
    isLoading: isLoadingRecurringPlans,
    refetch: refetchRecurringPlans,
  } = useGetCustomerRecurringPlansQuery(id, {
    skip: !id || (activeTab !== "recurring" && activeTab !== "overview"),
  });
  const [updateCustomerRecurringPlan, { isLoading: isUpdatingRecurring }] =
    useUpdateCustomerRecurringPlanMutation();
  const [editCustomer, { isLoading: isSavingCustomer }] = useEditCustomerMutation();
  const [excludeCustomerFromShop] = useExcludeCustomerFromShopMutation();
  const [includeCustomerForShop] = useIncludeCustomerForShopMutation();
  const [exclusionBusyShopId, setExclusionBusyShopId] = useState(null);
  const [assignShopModalOpen, setAssignShopModalOpen] = useState(false);
  const [unlinkShopModalOpen, setUnlinkShopModalOpen] = useState(false);
  const [excludeModalShop, setExcludeModalShop] = useState(null);
  const [confirmAssignShop, setConfirmAssignShop] = useState(null);
  const [shopListFilter, setShopListFilter] = useState("all");
  const [assignCustomerToShop, { isLoading: isAssigningShop }] =
    useAssignCustomerToShopMutation();
  const { data: routingEventsRes, refetch: refetchRoutingEvents } =
    useGetCustomerRoutingEventsQuery(
      { customerId: id, limit: 40 },
      { skip: !id || (activeTab !== "shops" && activeTab !== "overview") }
    );
  const routingEvents = useMemo(() => {
    const list =
      routingEventsRes?.data?.events ??
      routingEventsRes?.events ??
      [];
    return Array.isArray(list) ? list : [];
  }, [routingEventsRes]);
  const userDetails = data?.data?.userDetails;
  const bookingDetails = useMemo(
    () => data?.data?.bookingDetails ?? [],
    [data?.data?.bookingDetails]
  );
  const recurringPlans = useMemo(() => {
    const plans = recurringPlansResponse?.data?.plans;
    return Array.isArray(plans) ? plans : [];
  }, [recurringPlansResponse?.data?.plans]);
  const customerShopHistory = useMemo(
    () =>
      Array.isArray(data?.data?.customerShopHistory)
        ? data.data.customerShopHistory
        : [],
    [data?.data?.customerShopHistory]
  );
  const activeAssignment = useMemo(() => {
    const fromHistory = customerShopHistory.find((h) => h.activeAssignment)
      ?.activeAssignment;
    return fromHistory || null;
  }, [customerShopHistory]);
  const user = userDetails?.user;
  const customerPhone = formatUserPhone(user);
  const normalizedTel = String(customerPhone).replace(/[^+\d]/g, "");
  const normalizedWhatsApp = normalizedTel.replace(/\D/g, "");
  const canCallCustomer = Boolean(normalizedTel);
  const blockedFromApi =
    user?.blocked === true ||
    userDetails?.blocked === true ||
    isAccountBlocked(user?.status);

  useEffect(() => {
    setIsBlocked(blockedFromApi);
  }, [blockedFromApi]);

  useEffect(() => {
    setSettingsForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phoneNum: user?.phoneNum || "",
      streetAddress: userDetails?.streetAddress || "",
      province: userDetails?.province || "",
      password: "",
      confirmPassword: "",
    });
    setSettingsErrors({});
  }, [user?.email, user?.firstName, user?.lastName, user?.phoneNum, userDetails?.province, userDetails?.streetAddress]);

  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Customer";
  const fullAddress = [userDetails?.streetAddress, userDetails?.province].filter(Boolean).join(", ") || "—";

  const lifetimeSpend = bookingDetails.reduce(
    (sum, b) => sum + Number(b?.orderAmount ?? b?.billingDetail?.total ?? 0),
    0
  );

  const completedCount = bookingDetails.filter((b) =>
    String(b?.bookingStatus?.title || "").toLowerCase().includes("complete")
  ).length;
  const recurringSummary = useMemo(() => {
    const recurringOrders = bookingDetails.filter((order) => {
      const label = String(order?.frequency || "")
        .trim()
        .toLowerCase();
      return label && label !== "just once";
    });
    const autoCreatedOrders = bookingDetails.filter(
      (order) => order?.isRecurringAutoCreated === true
    );
    const activeFrequencies = Array.from(
      new Set(
        recurringOrders
          .map((order) => String(order?.frequency || "").trim())
          .filter(Boolean)
      )
    );
    return {
      recurringOrdersCount: recurringOrders.length,
      autoCreatedOrdersCount: autoCreatedOrders.length,
      activeFrequencies,
      lastAutoCreated:
        [...autoCreatedOrders]
          .sort(
            (a, b) =>
              new Date(b?.createdAt || 0).getTime() -
              new Date(a?.createdAt || 0).getTime()
          )
          .at(0) || null,
    };
  }, [bookingDetails]);

  const currencySymbol = useMemo(() => {
    for (const booking of bookingDetails) {
      const symbol = resolveCurrencySymbol(
        booking?.billingDetail ?? booking?.paymentSummary ?? booking?.zone ?? booking,
        { applyDefault: false }
      );
      if (symbol) return symbol;
    }
    return resolveCurrencySymbol(userDetails ?? user, { applyDefault: true });
  }, [bookingDetails, user, userDetails]);

  const allOrderRows = useMemo(
    () =>
      [...bookingDetails]
        .sort(
          (a, b) =>
            new Date(b?.createdAt || 0).getTime() -
            new Date(a?.createdAt || 0).getTime()
        )
        .map((booking) => mapBookingToOrderListRow(booking)),
    [bookingDetails]
  );
  const recentOrderRows = allOrderRows.slice(0, 4);

  const filteredOrderRows = useMemo(() => {
    let rows = allOrderRows;
    if (shopFilterId) {
      rows = rows.filter(
        (row) => String(row.laundryShopId ?? "") === String(shopFilterId)
      );
    }
    if (!searchOrders.trim()) return rows;
    const q = searchOrders.toLowerCase();
    return rows.filter((row) => {
      return (
        String(row.orderId ?? "").toLowerCase().includes(q) ||
        String(row.OrderStatus ?? "").toLowerCase().includes(q) ||
        String(row.shopName ?? "").toLowerCase().includes(q) ||
        String(row.serviceType ?? "").toLowerCase().includes(q) ||
        String(row.paymentMethod ?? "").toLowerCase().includes(q)
      );
    });
  }, [allOrderRows, searchOrders, shopFilterId]);

  const shopFilterOptions = useMemo(
    () => [
      { value: "", label: "All shops · spend" },
      ...customerShopHistory.map((h) => ({
        value: String(h.shopId),
        label: `${h.shopName} · ${formatMoney(
          Number(h.totalSpend) || 0,
          currencySymbol
        )}${h.isReturning ? " · Returning" : ""}`,
      })),
    ],
    [customerShopHistory, currencySymbol]
  );

  const selectedShopSpend = useMemo(() => {
    if (!shopFilterId) return null;
    return customerShopHistory.find(
      (h) => String(h.shopId) === String(shopFilterId)
    );
  }, [customerShopHistory, shopFilterId]);

  const toggleShopExclusion = (shop) => {
    if (!id || !shop?.shopId) return;
    setExcludeModalShop(shop);
  };

  const handleExcludeConfirm = async ({ shop, reason, include }) => {
    if (!id || !shop?.shopId) return;
    setExclusionBusyShopId(shop.shopId);
    try {
      if (include) {
        await includeCustomerForShop({
          customerId: id,
          shopId: shop.shopId,
        }).unwrap();
        success(`${shop.shopName || "Shop"} included — marketplace can offer it again`);
      } else {
        const res = await excludeCustomerFromShop({
          customerId: id,
          shopId: shop.shopId,
          reason: reason || undefined,
        }).unwrap();
        success(
          `${shop.shopName || "Shop"} excluded — new marketplace orders will skip it`
        );
        const notice = openOrdersNotice((res?.data ?? res)?.openOrders);
        if (notice) warning(notice);
      }
      setExcludeModalShop(null);
      refetch();
      refetchRoutingEvents();
    } catch (err) {
      showError(getApiErrorMessage(err) || "Could not update shop exclusion");
    } finally {
      setExclusionBusyShopId(null);
    }
  };

  const handleConfirmAssignShop = async (shop) => {
    if (!id || !shop?.shopId) return;
    try {
      await assignCustomerToShop({
        customerId: id,
        shopId: shop.shopId,
        sourceShopId: activeAssignment?.shopAddressId || undefined,
      }).unwrap();
      success(
        `Preferred shop set to ${shop.shopName || "shop"} — new orders offered there first`
      );
      setConfirmAssignShop(null);
      refetch();
      refetchRoutingEvents();
    } catch (err) {
      showError(getApiErrorMessage(err) || "Could not assign preferred shop");
    }
  };

  const preferredShopName =
    customerShopHistory[0]?.shopName ||
    resolveShopName(bookingDetails[0]) ||
    "—";

  const orderColumns = useOrderListColumns({
    navigate,
    setDeleteModal,
    setAssignModal,
    showAssign: true,
    hideCustomer: true,
  });
  const recentOrderColumns = useMemo(
    () => orderColumns.filter((c) => c.key !== "actions"),
    [orderColumns]
  );

  const handleCustomerRecurringAction = async (planId, action) => {
    const customerId = user?.id || userDetails?.userId || id;
    if (!customerId || !planId) return;
    if (action === "cancel") {
      const ok = window.confirm(
        "Turn off this customer's recurring service? No further orders will be auto-created. Existing orders are not cancelled."
      );
      if (!ok) return;
    }
    try {
      const res = await updateCustomerRecurringPlan({
        customerId,
        planId,
        body: { action },
      }).unwrap();
      success(res?.message || "Recurring service updated");
      refetchRecurringPlans();
    } catch (err) {
      showError(
        getApiErrorMessage(err) ||
          err?.data?.message ||
          "Failed to update recurring service"
      );
    }
  };

  const handleSaveCustomerSettings = async () => {
    const customerId = user?.id || userDetails?.userId;
    if (!customerId) return;

    const nextErrors = {};
    if (!settingsForm.firstName.trim()) nextErrors.firstName = "First name is required";
    if (!settingsForm.lastName.trim()) nextErrors.lastName = "Last name is required";
    if (!settingsForm.email.trim()) nextErrors.email = "Email is required";
    const phoneErr = customerPhoneError(settingsForm.phoneNum);
    if (phoneErr) nextErrors.phoneNum = phoneErr;
    if (settingsForm.password) {
      if (settingsForm.password.length < 6) {
        nextErrors.password = "Password must be at least 6 characters";
      }
      if (settingsForm.password !== settingsForm.confirmPassword) {
        nextErrors.confirmPassword = "Passwords must match";
      }
    } else if (settingsForm.confirmPassword) {
      nextErrors.confirmPassword = "Enter the new password first";
    }
    setSettingsErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      const body = {
        firstName: settingsForm.firstName.trim(),
        lastName: settingsForm.lastName.trim(),
        email: settingsForm.email.trim(),
        phoneNum: settingsForm.phoneNum.trim(),
      };
      if (settingsForm.password) body.password = settingsForm.password;
      await editCustomer({
        id: customerId,
        body,
      }).unwrap();
      success(settingsForm.password ? "Customer and password updated." : "Customer updated.");
      setSettingsForm((p) => ({ ...p, password: "", confirmPassword: "" }));
      refetch();
    } catch (err) {
      showError(getApiErrorMessage(err, "Failed to update customer."));
    }
  };

  const openContactModal = () => {
    if (!canCallCustomer) return;
    setContactModal(true);
  };

  const handleDirectCall = () => {
    if (!openTel(normalizedTel)) return;
    setContactModal(false);
  };

  const handleWhatsAppCall = () => {
    if (!openWhatsApp(normalizedWhatsApp)) return;
    setContactModal(false);
  };

  if (isLoading) return <Delay />;

  if (isError) {
    return (
      <div>
        <PageHeader
          title="Customer details"
          actions={
            <Button variant="secondary" onClick={() => navigate("/customer-management")}>
              Back
            </Button>
          }
        />
        <p role="alert" style={{ color: "var(--danger)" }}>
          Couldn’t load this customer. The details API failed. Try again or go back to the list.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Orders" },
    { id: "shops", label: "Shops" },
    { id: "recurring", label: "Recurring" },
    { id: "addresses", label: "Addresses" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div>
      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {fullName}
            {isBlocked ? <Badge tone="danger">Blocked</Badge> : null}
          </span>
        }
        description={`Customer since ${formatDate(
          userDetails?.createdAt || user?.createdAt,
          "MMMM YYYY"
        )} · ID: ${userDetails?.userId || user?.id || "—"}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/customer-management")}>
              Back
            </Button>
            <Button
              variant="secondary"
              onClick={openContactModal}
              disabled={!canCallCustomer}
            >
              Call customer
            </Button>
            <BlockUserButton
              userId={user?.id || id}
              userType="customer"
              isBlocked={isBlocked}
              onSuccess={(blocked) => { setIsBlocked(blocked); refetch(); }}
            />
            <Button variant="danger" onClick={() => setAnonymizeModal(true)}>Delete & anonymize</Button>
            <Button onClick={() => navigate(`/customer-management/edit/${id}`)}>Edit customer</Button>
          </>
        }
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={activeTab === tab.id ? "primary" : "secondary"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "grid", gap: 16 }}>
          <DirectoryMetrics
            items={[
              { label: "Total orders", value: bookingDetails.length, tone: "brand" },
              {
                label: "Lifetime spend",
                value: formatMoney(lifetimeSpend, currencySymbol),
                tone: "navy",
              },
              { label: "Completed orders", value: completedCount, tone: "success" },
              {
                label: "Avg order value",
                value: bookingDetails.length
                  ? formatMoney(lifetimeSpend / bookingDetails.length, currencySymbol)
                  : formatMoney(0, currencySymbol),
                tone: "warning",
              },
            ]}
          />

          <div style={PANEL}>
            <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Personal information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              <Info label="Full name" value={fullName} />
              <Info label="Email" value={user?.email || "—"} />
              <Info label="Phone" value={customerPhone || "—"} />
              <Info label="Primary address" value={fullAddress} />
              <Info label="Registered on" value={formatDate(user?.createdAt)} />
              <Info label="Preferred shop" value={preferredShopName} />
            </div>
          </div>

          <div style={PANEL}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recurring summary</h2>
              <Button size="sm" variant="secondary" onClick={() => setActiveTab("recurring")}>
                Manage recurring
              </Button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              <Info
                label="Recurring orders"
                value={String(recurringSummary.recurringOrdersCount || 0)}
              />
              <Info
                label="Auto-created orders"
                value={String(recurringSummary.autoCreatedOrdersCount || 0)}
              />
              <Info
                label="Active / paused plans"
                value={String(
                  recurringPlans.filter(
                    (p) => p.status === "active" || p.status === "paused"
                  ).length
                )}
              />
              <Info
                label="Frequencies"
                value={
                  recurringSummary.activeFrequencies.length
                    ? recurringSummary.activeFrequencies.join(", ")
                    : "None"
                }
              />
              <Info
                label="Latest auto-created"
                value={
                  recurringSummary.lastAutoCreated?.id
                    ? `#${recurringSummary.lastAutoCreated.orderTrackId || recurringSummary.lastAutoCreated.id}`
                    : "—"
                }
              />
            </div>
          </div>

          <CustomerShopHistoryPanel
            history={customerShopHistory}
            currencySymbol={currencySymbol}
            compact
            showHeaderAssign={false}
            selectedShopId={shopFilterId || null}
            onSelectShop={(shop) => {
              setShopFilterId(shop?.shopId != null ? String(shop.shopId) : "");
              if (shop) setActiveTab("orders");
            }}
          />

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent orders</h2>
              <Button size="sm" variant="ghost" onClick={() => setActiveTab("orders")}>
                View all
              </Button>
            </div>
            <DirectoryTableWrap>
              <Table
                columns={recentOrderColumns}
                rows={recentOrderRows}
                rowKey={(row) => row.id}
                empty="No orders yet"
              />
            </DirectoryTableWrap>
          </div>
        </div>
      )}

      {activeTab === "shops" && (
        <div style={{ display: "grid", gap: 16 }}>
          <DirectoryMetrics
            items={[
              {
                label: "Shops used",
                value: customerShopHistory.length,
                tone: "brand",
              },
              {
                label: "Returning shops",
                value: customerShopHistory.filter((h) => h.isReturning).length,
                tone: "success",
              },
              {
                label: "Excluded shops",
                value: customerShopHistory.filter((h) => h.isExcluded).length,
                tone: "danger",
              },
              {
                label: "Shop spend (all)",
                value: formatMoney(
                  customerShopHistory.reduce(
                    (s, h) => s + (Number(h.totalSpend) || 0),
                    0
                  ),
                  currencySymbol
                ),
                tone: "navy",
              },
            ]}
          />
          <p className="jd-lead" style={{ margin: 0 }}>
            One list for every shop this customer used.{" "}
            <strong>Returning</strong> = history. <strong>Assign</strong> =
            preferred shop for new orders. <strong>Exclude</strong> = never send
            marketplace orders here (bad experience).{" "}
            <strong>Unlink</strong> = clear preferred only; exclusions stay.
          </p>
          <CustomerShopHistoryPanel
            title="All shops · returning & spend"
            history={customerShopHistory}
            currencySymbol={currencySymbol}
            listFilter={shopListFilter}
            onListFilterChange={setShopListFilter}
            selectedShopId={shopFilterId || null}
            onSelectShop={(shop) => {
              setShopFilterId(shop?.shopId != null ? String(shop.shopId) : "");
              if (shop) setActiveTab("orders");
            }}
            onToggleExclusion={toggleShopExclusion}
            exclusionBusyShopId={exclusionBusyShopId}
            onAssignShop={() => setAssignShopModalOpen(true)}
            onAssignShopRow={(shop) => setConfirmAssignShop(shop)}
            onUnlinkAssignment={
              activeAssignment ? () => setUnlinkShopModalOpen(true) : undefined
            }
            assignBusyShopId={
              isAssigningShop && confirmAssignShop
                ? confirmAssignShop.shopId
                : null
            }
            activeAssignment={activeAssignment}
          />
          <CustomerRoutingEventsPanel
            title="Routing history"
            events={routingEvents}
            activeAssignment={activeAssignment}
            emptyText="No assign / exclude changes for this customer yet."
          />
        </div>
      )}

      {activeTab === "orders" && (
        <div style={{ display: "grid", gap: 16 }}>
          <CustomerShopHistoryPanel
            history={customerShopHistory}
            title="Shop-wise spend · filter orders"
            currencySymbol={currencySymbol}
            compact
            showHeaderAssign={false}
            selectedShopId={shopFilterId || null}
            onSelectShop={(shop) => {
              setShopFilterId(shop?.shopId != null ? String(shop.shopId) : "");
            }}
          />
          <div>
            <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>
              All orders ({filteredOrderRows.length}
              {shopFilterId ? ` at shop` : ""}
              {allOrderRows.length !== filteredOrderRows.length
                ? ` of ${allOrderRows.length}`
                : ""}
              )
            </h2>
            {selectedShopSpend ? (
              <p className="jd-lead" style={{ margin: "0 0 12px" }}>
                {selectedShopSpend.shopName}:{" "}
                {formatMoney(
                  Number(selectedShopSpend.totalSpend) || 0,
                  currencySymbol
                )}{" "}
                spent
                {selectedShopSpend.isReturning ? " · Returning customer" : ""}
              </p>
            ) : null}
            <DirectoryTableWrap
              toolbar={
                <DirectoryToolbar>
                  <DirectorySearch
                    id="customer-orders-search"
                    value={searchOrders}
                    onChange={setSearchOrders}
                    placeholder="Search by order ID, shop, service, status…"
                  />
                  <DirectoryToolSelect>
                    <Select
                      aria-label="Filter by shop spend"
                      value={shopFilterId}
                      onChange={(v) => setShopFilterId(v ?? "")}
                      options={shopFilterOptions}
                      placeholder="All shops"
                    />
                  </DirectoryToolSelect>
                  <DirectoryToolbarEnd>
                    {shopFilterId || searchOrders ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShopFilterId("");
                          setSearchOrders("");
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : null}
                  </DirectoryToolbarEnd>
                </DirectoryToolbar>
              }
            >
              <Table
                columns={orderColumns}
                rows={filteredOrderRows}
                rowKey={(row) => row.id}
                empty="No matching orders found"
              />
            </DirectoryTableWrap>
          </div>
        </div>
      )}

      {activeTab === "addresses" && (
        <div style={PANEL}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Saved address</h2>
          <p style={{ margin: 0, color: "var(--ink-2)" }}>{fullAddress}</p>
        </div>
      )}

      {activeTab === "recurring" && (
        <div style={PANEL}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>
                Recurring service
              </h2>
              <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 13 }}>
                Pause temporarily or turn off automatic future orders for this customer.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => refetchRecurringPlans()}
              disabled={isLoadingRecurringPlans || isUpdatingRecurring}
            >
              Refresh
            </Button>
          </div>

          {isLoadingRecurringPlans ? (
            <Delay size="32px" />
          ) : recurringPlans.length === 0 ? (
            <p style={{ margin: 0, color: "var(--ink-2)" }}>
              No recurring frequency plans for this customer.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {recurringPlans.map((plan) => {
                const status = String(plan.status || "active");
                const statusTone =
                  status === "paused"
                    ? "warning"
                    : status === "cancelled"
                      ? "danger"
                      : "success";
                const statusLabel =
                  status === "paused"
                    ? "Paused"
                    : status === "cancelled"
                      ? "Off"
                      : "Active";
                return (
                  <div
                    key={plan.id}
                    style={{
                      border: "1px solid #e6e9f0",
                      borderRadius: 12,
                      padding: 14,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 15 }}>
                          {plan.frequency || "Recurring"}
                        </strong>
                        <Badge tone={statusTone}>{statusLabel}</Badge>
                      </div>
                      {plan.orderTrackId || plan.bookingId ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            navigate(
                              `/orders/details/${plan.bookingId || plan.sourceBookingId}`
                            )
                          }
                        >
                          View order
                          {plan.orderTrackId ? ` #${plan.orderTrackId}` : ""}
                        </Button>
                      ) : null}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                        gap: 8,
                        fontSize: 13,
                        color: "var(--ink-2)",
                      }}
                    >
                      <span>
                        Next run:{" "}
                        {plan.nextRunAt
                          ? formatDate(plan.nextRunAt, "DD MMM YYYY HH:mm")
                          : "—"}
                      </span>
                      <span>Plan ID: {plan.id}</span>
                    </div>
                    {(plan.canPause || plan.canResume || plan.canCancel) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {plan.canPause ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isUpdatingRecurring}
                            onClick={() =>
                              handleCustomerRecurringAction(plan.id, "pause")
                            }
                          >
                            Pause (temp off)
                          </Button>
                        ) : null}
                        {plan.canResume ? (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={isUpdatingRecurring}
                            onClick={() =>
                              handleCustomerRecurringAction(plan.id, "resume")
                            }
                          >
                            Resume
                          </Button>
                        ) : null}
                        {plan.canCancel ? (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={isUpdatingRecurring}
                            onClick={() =>
                              handleCustomerRecurringAction(plan.id, "cancel")
                            }
                          >
                            Turn off / Cancel
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div style={{ ...PANEL, maxWidth: 720 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Customer settings</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="First name" htmlFor="settings-first-name" error={settingsErrors.firstName}>
              <Input
                id="settings-first-name"
                value={settingsForm.firstName}
                error={Boolean(settingsErrors.firstName)}
                onChange={(e) => setSettingsForm((p) => ({ ...p, firstName: e.target.value }))}
              />
            </Field>
            <Field label="Last name" htmlFor="settings-last-name" error={settingsErrors.lastName}>
              <Input
                id="settings-last-name"
                value={settingsForm.lastName}
                error={Boolean(settingsErrors.lastName)}
                onChange={(e) => setSettingsForm((p) => ({ ...p, lastName: e.target.value }))}
              />
            </Field>
            <Field label="Email" htmlFor="settings-email" error={settingsErrors.email}>
              <Input
                id="settings-email"
                value={settingsForm.email}
                error={Boolean(settingsErrors.email)}
                onChange={(e) => setSettingsForm((p) => ({ ...p, email: e.target.value }))}
              />
            </Field>
            <Field
              label="Phone"
              htmlFor="settings-phone"
              hint="UK number, e.g. 07911 123456 or +44 7911 123456"
              error={settingsErrors.phoneNum}
            >
              <PhoneInput
                id="settings-phone"
                countryCode={user?.countryCode}
                value={settingsForm.phoneNum}
                error={Boolean(settingsErrors.phoneNum)}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9+\-() ]/g, "");
                  setSettingsForm((p) => ({ ...p, phoneNum: val }));
                }}
              />
            </Field>
            <Field label="Street address" htmlFor="settings-street">
              <Input
                id="settings-street"
                value={settingsForm.streetAddress}
                onChange={(e) => setSettingsForm((p) => ({ ...p, streetAddress: e.target.value }))}
              />
            </Field>
            <Field label="Province" htmlFor="settings-province">
              <Input
                id="settings-province"
                value={settingsForm.province}
                onChange={(e) => setSettingsForm((p) => ({ ...p, province: e.target.value }))}
              />
            </Field>
            <Field
              label="New password"
              htmlFor="settings-password"
              hint="Leave blank to keep the current password"
              error={settingsErrors.password}
            >
              <PasswordInput
                id="settings-password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                value={settingsForm.password}
                error={Boolean(settingsErrors.password)}
                onChange={(e) => setSettingsForm((p) => ({ ...p, password: e.target.value }))}
              />
            </Field>
            <Field
              label="Confirm new password"
              htmlFor="settings-confirm-password"
              error={settingsErrors.confirmPassword}
            >
              <PasswordInput
                id="settings-confirm-password"
                placeholder="Repeat new password"
                autoComplete="new-password"
                value={settingsForm.confirmPassword}
                error={Boolean(settingsErrors.confirmPassword)}
                onChange={(e) => setSettingsForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              />
            </Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Button onClick={handleSaveCustomerSettings} disabled={isSavingCustomer}>
              {isSavingCustomer ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}

      <DeleteOrderModal
        open={deleteModal.open}
        orderId={deleteModal.orderId}
        onClose={() => setDeleteModal({ open: false, orderId: null })}
        onSuccess={() => refetch()}
      />

      <AssignOrderModal
        open={assignModal.open}
        bookingId={assignModal.orderId}
        bookingSnapshot={assignModal.booking}
        onClose={() =>
          setAssignModal({ open: false, orderId: null, booking: null })
        }
        onSuccess={() => refetch()}
      />

      <AssignCustomerShopModal
        open={assignShopModalOpen}
        customerId={user?.id || id}
        customerName={
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          user?.email
        }
        onClose={() => setAssignShopModalOpen(false)}
        onSuccess={() => {
          refetch();
          refetchRoutingEvents();
        }}
      />
      <ConfirmAssignShopModal
        open={Boolean(confirmAssignShop)}
        shop={confirmAssignShop}
        customerName={
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          user?.email
        }
        activeAssignment={activeAssignment}
        isLoading={isAssigningShop}
        onClose={() => setConfirmAssignShop(null)}
        onConfirm={handleConfirmAssignShop}
      />
      <ExcludeCustomerShopModal
        open={Boolean(excludeModalShop)}
        shop={excludeModalShop}
        customerName={
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          user?.email
        }
        activeAssignment={activeAssignment}
        returningShops={customerShopHistory.filter((h) => h.isReturning)}
        isLoading={Boolean(exclusionBusyShopId)}
        onClose={() => setExcludeModalShop(null)}
        onConfirm={handleExcludeConfirm}
      />
      <UnlinkCustomerShopModal
        open={unlinkShopModalOpen}
        customerId={user?.id || id}
        customerName={
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          user?.email
        }
        assignedShopName={activeAssignment?.shopName}
        onClose={() => setUnlinkShopModalOpen(false)}
        onSuccess={() => {
          refetch();
          refetchRoutingEvents();
        }}
      />

      <AnonymizeDeleteModal
        open={anonymizeModal}
        onClose={() => setAnonymizeModal(false)}
        userId={user?.id || id}
        userType="customer"
        onSuccess={() => navigate("/customer-management")}
      />

      <Modal
        open={contactModal}
        title="Contact customer"
        description={fullName}
        onClose={() => setContactModal(false)}
        hideFooter
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              background: "var(--canvas)",
              padding: 12,
              color: "var(--ink-2)",
              fontWeight: 600,
            }}
          >
            {customerPhone || "No phone number"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Button
              variant="primary"
              onClick={handleDirectCall}
              disabled={!canCallCustomer}
            >
              Direct call
            </Button>
            <Button
              variant="secondary"
              onClick={handleWhatsAppCall}
              disabled={!normalizedWhatsApp}
            >
              WhatsApp
            </Button>
            <ZoiperCallButton
              phone={normalizedTel || normalizedWhatsApp}
              onAfterClick={() => setContactModal(false)}
            />
            <Button variant="ghost" onClick={() => setContactModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="jd-field__hint" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: "6px 0 0", fontWeight: 600 }}>{value}</p>
    </div>
  );
}
