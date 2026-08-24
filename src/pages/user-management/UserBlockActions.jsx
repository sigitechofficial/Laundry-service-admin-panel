/**
 * Shared Block / Unblock + Anonymize-Delete modals for admin user management.
 * Used on Customer, Driver, Employee detail pages.
 */
import { useState } from "react";
import { Modal, Button } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import {
  useBlockUserMutation,
  useUnblockUserMutation,
  useDeleteCustomerMutation,
  useDeleteDriverMutation,
} from "../../store/services/api";

// ---------- Block / Unblock Modal ----------

export function BlockUserModal({ open, onClose, userId, userType, isBlocked, onSuccess }) {
  const { success, error } = useToaster();
  const [blockUser, { isLoading: isBlocking }] = useBlockUserMutation();
  const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation();
  const loading = isBlocking || isUnblocking;

  const handleConfirm = async () => {
    try {
      const fn = isBlocked ? unblockUser : blockUser;
      const res = await fn({ userId, userType }).unwrap();
      success(res?.message || (isBlocked ? "User unblocked" : "User blocked"));
      onSuccess?.(!isBlocked);
      onClose();
    } catch (err) {
      error(err?.data?.message || "Action failed");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isBlocked ? "Unblock user" : "Block user"}
      primaryLabel={loading ? (isBlocked ? "Unblocking…" : "Blocking…") : isBlocked ? "Yes, unblock" : "Yes, block"}
      primaryTone={isBlocked ? "brand" : "danger"}
      secondaryLabel="Cancel"
      onPrimary={handleConfirm}
    >
      {isBlocked ? (
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          This will restore access for this user. They will be able to log in again immediately.
        </p>
      ) : (
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          This will <strong>block</strong> the user. They will not be able to log in until unblocked.
          Their data will remain intact and can be restored at any time.
        </p>
      )}
    </Modal>
  );
}

// ---------- Block / Unblock Button ----------

export function BlockUserButton({ userId, userType, isBlocked, onSuccess }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={isBlocked ? "secondary" : "danger"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {isBlocked ? "Unblock" : "Block"}
      </Button>
      <BlockUserModal
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        userType={userType}
        isBlocked={isBlocked}
        onSuccess={onSuccess}
      />
    </>
  );
}

// ---------- Anonymize / Delete — Customer ----------

export function AnonymizeCustomerModal({ open, onClose, userId, onSuccess }) {
  const { success, error } = useToaster();
  const [deleteUser, { isLoading }] = useDeleteCustomerMutation();
  return (
    <AnonymizeDeleteModalInner
      open={open}
      onClose={onClose}
      isLoading={isLoading}
      onConfirm={async () => {
        const res = await deleteUser(userId).unwrap();
        success(res?.message || "Account deleted and data anonymized");
        onSuccess?.();
        onClose();
      }}
      onError={(err) => error(err?.data?.message || "Delete failed")}
    />
  );
}

// ---------- Anonymize / Delete — Driver ----------

export function AnonymizeDriverModal({ open, onClose, userId, onSuccess }) {
  const { success, error } = useToaster();
  const [deleteUser, { isLoading }] = useDeleteDriverMutation();
  return (
    <AnonymizeDeleteModalInner
      open={open}
      onClose={onClose}
      isLoading={isLoading}
      onConfirm={async () => {
        const res = await deleteUser(userId).unwrap();
        success(res?.message || "Account deleted and data anonymized");
        onSuccess?.();
        onClose();
      }}
      onError={(err) => error(err?.data?.message || "Delete failed")}
    />
  );
}

// ---------- Anonymize / Delete — Employee (block via blockUser then delete) ----------
// Employees use the blockUser + a dedicated admin endpoint. For now we reuse deleteCustomer
// route since the backend anonymize handler accepts any userId. If a dedicated route is needed
// it can be swapped here with no changes to calling pages.

export function AnonymizeEmployeeModal({ open, onClose, userId, onSuccess }) {
  const { success, error } = useToaster();
  const [deleteUser, { isLoading }] = useDeleteCustomerMutation();
  return (
    <AnonymizeDeleteModalInner
      open={open}
      onClose={onClose}
      isLoading={isLoading}
      onConfirm={async () => {
        const res = await deleteUser(userId).unwrap();
        success(res?.message || "Account deleted and data anonymized");
        onSuccess?.();
        onClose();
      }}
      onError={(err) => error(err?.data?.message || "Delete failed")}
    />
  );
}

// ---------- Generic AnonymizeDeleteModal that routes by type ----------

export function AnonymizeDeleteModal({ open, onClose, userId, userType, onSuccess }) {
  if (userType === "driver") {
    return <AnonymizeDriverModal open={open} onClose={onClose} userId={userId} onSuccess={onSuccess} />;
  }
  if (userType === "admin_employee" || userType === "agent_employee") {
    return <AnonymizeEmployeeModal open={open} onClose={onClose} userId={userId} onSuccess={onSuccess} />;
  }
  return <AnonymizeCustomerModal open={open} onClose={onClose} userId={userId} onSuccess={onSuccess} />;
}

// ---------- Shared UI for confirm dialog ----------

function AnonymizeDeleteModalInner({ open, onClose, isLoading, onConfirm, onError }) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (err) {
      onError(err);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Anonymize & delete account"
      primaryLabel={isLoading ? "Deleting…" : "Delete & anonymize"}
      primaryTone="danger"
      secondaryLabel="Cancel"
      onPrimary={handleConfirm}
    >
      <div style={{ display: "grid", gap: 12, lineHeight: 1.6 }}>
        <p style={{ margin: 0 }}>
          This will <strong>permanently anonymize</strong> this account:
        </p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Name replaced with "Deleted User"</li>
          <li>Email, phone, and password wiped</li>
          <li>Account blocked — login no longer possible</li>
          <li>Order history preserved (booking IDs kept)</li>
        </ul>
        <p style={{ margin: 0, color: "#c9403f", fontWeight: 600, fontSize: 13 }}>
          This action cannot be undone.
        </p>
      </div>
    </Modal>
  );
}
