import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Table,
} from "../../../design-system";
import { useNavigate, useParams } from "react-router-dom";
import { useEditCustomerMutation, useGetCustomerByIdQuery } from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import useToaster from "../../../components/ui/Toaster";
import { getApiErrorMessage } from "../../../store/services/apiErrors";
import DeleteOrderModal from "../../order-management/order-modals/DeleteOrderModal";
import { formatDate, formatMoney, resolveCurrencySymbol } from "../../../utilities/formatters";
import {
  DirectoryActionDelete,
  DirectoryActions,
  DirectoryActionView,
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolbar,
} from "../../directory-table/directoryTable";
import { directoryStatusTone } from "../../directory-table/directoryTableUtils";
import { BlockUserButton, AnonymizeDeleteModal } from "../../user-management/UserBlockActions";

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
  const { success, error: showError } = useToaster();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchOrders, setSearchOrders] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, orderId: null });
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
  });

  const { data, isLoading, isError, refetch } = useGetCustomerByIdQuery(id, { skip: !id });
  const [editCustomer, { isLoading: isSavingCustomer }] = useEditCustomerMutation();
  const userDetails = data?.data?.userDetails;
  const bookingDetails = useMemo(
    () => data?.data?.bookingDetails ?? [],
    [data?.data?.bookingDetails]
  );
  const user = userDetails?.user;
  const customerPhone = user?.phoneNum || "";
  const normalizedTel = String(customerPhone).replace(/[^+\d]/g, "");
  const normalizedWhatsApp = normalizedTel.replace(/\D/g, "");
  const canCallCustomer = Boolean(normalizedTel);

  // Sync blocked state from API data
  useEffect(() => {
    if (user?.status !== undefined) setIsBlocked(!user.status);
  }, [user?.status]);

  useEffect(() => {
    setSettingsForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phoneNum: user?.phoneNum || "",
      streetAddress: userDetails?.streetAddress || "",
      province: userDetails?.province || "",
    });
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

  const currencySymbol = useMemo(() => {
    for (const booking of bookingDetails) {
      const symbol = resolveCurrencySymbol(
        booking?.billingDetail ?? booking?.paymentSummary ?? booking?.zone ?? booking
      );
      if (symbol) return symbol;
    }
    return resolveCurrencySymbol(userDetails ?? user);
  }, [bookingDetails, user, userDetails]);

  const allOrders = useMemo(
    () =>
      [...bookingDetails].sort(
        (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
      ),
    [bookingDetails]
  );
  const recentOrders = allOrders.slice(0, 4);

  const filteredOrders = allOrders.filter((order) => {
    if (!searchOrders.trim()) return true;
    const q = searchOrders.toLowerCase();
    return (
      String(order?.orderTrackId || "").toLowerCase().includes(q) ||
      String(order?.bookingStatus?.title || "").toLowerCase().includes(q) ||
      String(order?.laundryShop?.name || "").toLowerCase().includes(q)
    );
  });

  const handleSaveCustomerSettings = async () => {
    const customerId = user?.id || userDetails?.userId;
    if (!customerId) return;
    try {
      await editCustomer({
        id: customerId,
        body: {
          firstName: settingsForm.firstName,
          lastName: settingsForm.lastName,
          email: settingsForm.email,
          phoneNum: settingsForm.phoneNum,
          streetAddress: settingsForm.streetAddress,
          province: settingsForm.province,
        },
      }).unwrap();
      success("Customer updated.");
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
    if (!normalizedTel) return;
    window.location.href = `tel:${normalizedTel}`;
    setContactModal(false);
  };

  const handleWhatsAppCall = () => {
    if (!normalizedWhatsApp) return;
    window.open(`https://wa.me/${normalizedWhatsApp}`, "_blank", "noopener,noreferrer");
    setContactModal(false);
  };

  const orderColumns = [
    {
      key: "orderTrackId",
      header: "Order",
      render: (row) => (
        <DirectoryIdentity
          name={`#${row.orderTrackId || row.id}`}
          meta={row.laundryShop?.name || "—"}
          id={row.id}
        />
      ),
    },
    {
      key: "collectionDate",
      header: "Schedule",
      render: (row) => (
        <DirectoryIdentity
          name={row.collectionDate ? `Collect ${formatDate(row.collectionDate)}` : "—"}
          meta={row.deliveryDate ? `Deliver ${formatDate(row.deliveryDate)}` : undefined}
        />
      ),
    },
    {
      key: "totalItems",
      header: "Items",
      render: (row) => <DirectoryMetric value={row.totalItems ?? 0} />,
    },
    {
      key: "orderAmount",
      header: "Total",
      render: (row) => (
        <DirectoryMoney>
          {formatMoney(
            row.orderAmount,
            resolveCurrencySymbol(row.billingDetail ?? row.paymentSummary ?? row) || currencySymbol
          )}
        </DirectoryMoney>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const status = row.bookingStatus?.title || "Pending";
        return <DirectoryDotPill tone={directoryStatusTone(status)}>{status}</DirectoryDotPill>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView
            onClick={() => row.id && navigate(`/orders/details/${row.id}`)}
          />
          <DirectoryActionDelete
            onClick={() => setDeleteModal({ open: true, orderId: row.id })}
          />
        </DirectoryActions>
      ),
    },
  ];

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
    { id: "addresses", label: "Addresses" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div>
      <PageHeader
        title={fullName}
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
              <Info label="Phone" value={user?.phoneNum || "—"} />
              <Info label="Date of birth" value={formatDate(user?.dob)} />
              <Info label="Gender" value={user?.gender || "—"} />
              <Info label="Primary address" value={fullAddress} />
              <Info label="Registered on" value={formatDate(user?.createdAt)} />
              <Info label="Preferred shop" value={bookingDetails?.[0]?.laundryShop?.name || "—"} />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent orders</h2>
              <Button size="sm" variant="ghost" onClick={() => setActiveTab("orders")}>
                View all
              </Button>
            </div>
            <DirectoryTableWrap>
              <Table
                columns={orderColumns.filter((c) => c.key !== "actions")}
                rows={recentOrders}
                rowKey={(row) => row.id}
                empty="No orders yet"
              />
            </DirectoryTableWrap>
          </div>
        </div>
      )}

      {activeTab === "orders" && (
        <div>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>
            All orders ({allOrders.length})
          </h2>
          <DirectoryTableWrap
            toolbar={
              <DirectoryToolbar>
                <DirectorySearch
                  id="customer-orders-search"
                  value={searchOrders}
                  onChange={setSearchOrders}
                  placeholder="Search orders..."
                />
              </DirectoryToolbar>
            }
          >
            <Table
              columns={orderColumns}
              rows={filteredOrders}
              rowKey={(row) => row.id}
              empty="No matching orders found"
            />
          </DirectoryTableWrap>
        </div>
      )}

      {activeTab === "addresses" && (
        <div style={PANEL}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Saved address</h2>
          <p style={{ margin: 0, color: "var(--ink-2)" }}>{fullAddress}</p>
        </div>
      )}

      {activeTab === "settings" && (
        <div style={{ ...PANEL, maxWidth: 720 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Customer settings</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="First name" htmlFor="settings-first-name">
              <Input
                id="settings-first-name"
                value={settingsForm.firstName}
                onChange={(e) => setSettingsForm((p) => ({ ...p, firstName: e.target.value }))}
              />
            </Field>
            <Field label="Last name" htmlFor="settings-last-name">
              <Input
                id="settings-last-name"
                value={settingsForm.lastName}
                onChange={(e) => setSettingsForm((p) => ({ ...p, lastName: e.target.value }))}
              />
            </Field>
            <Field label="Email" htmlFor="settings-email">
              <Input
                id="settings-email"
                value={settingsForm.email}
                onChange={(e) => setSettingsForm((p) => ({ ...p, email: e.target.value }))}
              />
            </Field>
            <Field label="Phone" htmlFor="settings-phone">
              <Input
                id="settings-phone"
                value={settingsForm.phoneNum}
                inputMode="tel"
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
