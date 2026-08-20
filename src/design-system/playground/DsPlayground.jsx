import { useState } from "react";
import DsScope from "../DsScope";
import Button from "../components/Button";
import Field from "../components/Field";
import Input from "../components/Input";
import Select from "../components/Select";
import Badge from "../components/Badge";

const ROLES = [
  { value: "dispatcher", label: "Dispatcher" },
  { value: "owner", label: "Owner" },
  { value: "zone", label: "Zone Manager" },
];

/**
 * Isolated kit preview. Old shell is not mounted.
 * Open /ds — login and every existing route are unchanged.
 */
export default function DsPlayground() {
  const [role, setRole] = useState("dispatcher");

  return (
    <DsScope
      as="main"
      style={{
        minHeight: "100vh",
        background: "var(--canvas)",
        padding: "40px 28px 64px",
      }}
    >
      <div style={{ maxWidth: 720 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)" }}>
          Just Dry · new kit
        </p>
        <h1 className="jd-h1" style={{ marginTop: 10 }}>
          Parallel design system
        </h1>
        <p className="jd-lead">
          This page uses only the new files. The rest of the admin still runs on MUI and the old Tailwind theme.
        </p>

        <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Button>Accept & enable</Button>
          <Button variant="secondary">Decline</Button>
          <Button variant="ghost">Reset</Button>
          <Button variant="danger" size="sm">
            Cancel order
          </Button>
        </div>

        <div style={{ marginTop: 28, display: "grid", gap: 16, maxWidth: 360 }}>
          <Field label="Customer name" hint="Shown on the invoice.">
            <Input defaultValue="Sarah Ahmed" />
          </Field>
          <Field label="Role">
            <Select
              aria-label="Role"
              value={role}
              onChange={setRole}
              options={ROLES}
            />
          </Field>
        </div>

        <div style={{ marginTop: 22, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge tone="brand">On hold</Badge>
          <Badge tone="success">Delivered</Badge>
          <Badge tone="warning">Action required</Badge>
          <Badge tone="danger">Payment failed</Badge>
        </div>
      </div>
    </DsScope>
  );
}
