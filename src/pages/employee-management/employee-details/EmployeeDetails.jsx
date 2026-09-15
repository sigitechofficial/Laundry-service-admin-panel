import { Badge, Button, PageHeader } from "../../../design-system";
import { useNavigate, useParams } from "react-router-dom";
import { useGetAdminEmployeesQuery } from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import { extractAdminEmployees } from "../extractAdminEmployees";
import { useState, useEffect } from "react";
import { BlockUserButton, AnonymizeDeleteModal } from "../../user-management/UserBlockActions";
import { isAccountBlocked } from "../../../utilities/accountBlocked";

const PANEL = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

export default function EmployeeDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [anonymizeModal, setAnonymizeModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const { data, currentData, isLoading, isFetching, isUninitialized, isError, refetch } =
    useGetAdminEmployeesQuery(undefined, { skip: !id, refetchOnMountOrArgChange: true });
  const payload = currentData ?? data;
  const adminEmployees = extractAdminEmployees(payload);
  const employee = adminEmployees.find((e) => String(e.id) === String(id));

  useEffect(() => {
    if (employee) setIsBlocked(isAccountBlocked(employee));
  }, [employee?.status, employee?.blocked]);
  const showInitialLoader =
    Boolean(id) &&
    payload == null &&
    !isError &&
    (isUninitialized || isLoading || isFetching);

  if (showInitialLoader) {
    return (
      <div
        style={{
          minHeight: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Delay />
      </div>
    );
  }
  if (isError || !employee) {
    return (
      <div>
        <PageHeader
          title="Employee details"
          actions={
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
          }
        />
        <p style={{ color: "var(--muted)" }}>
          {isError ? "Could not load this employee." : "Employee not found."}
        </p>
        {isError ? (
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div>
      <PageHeader
        title="Employee details"
        description={`ID #${employee.id}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
            <BlockUserButton
              userId={employee.id}
              userType="admin_employee"
              isBlocked={isBlocked}
              onSuccess={(blocked) => { setIsBlocked(blocked); refetch(); }}
            />
            <Button variant="danger" onClick={() => setAnonymizeModal(true)}>Delete & anonymize</Button>
            <Button onClick={() => navigate(`/employee-management/edit/${employee.id}`)}>
              Edit
            </Button>
          </>
        }
      />

      <div style={PANEL}>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>{fullName}</h2>
        <p style={{ margin: "0 0 16px", color: "var(--muted)" }}>{employee.email ?? "—"}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          <div>
            <p className="jd-field__hint" style={{ margin: 0 }}>Phone</p>
            <p style={{ margin: "6px 0 0", fontWeight: 600 }}>{employee.phoneNum ?? "—"}</p>
          </div>
          <div>
            <p className="jd-field__hint" style={{ margin: 0 }}>Status</p>
            <div style={{ marginTop: 6 }}>
              <Badge tone={isAccountBlocked(employee) ? "danger" : "success"}>
                {isAccountBlocked(employee) ? "Blocked" : "Active"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <AnonymizeDeleteModal
        open={anonymizeModal}
        onClose={() => setAnonymizeModal(false)}
        userId={employee.id}
        userType="admin_employee"
        onSuccess={() => navigate("/employee-management")}
      />
    </div>
  );
}
