import { Link } from "react-router-dom";
import { Table } from "../../design-system";
import { Notice } from "../misc-kit";
import { DirectoryTableWrap } from "../directory-table/directoryTable";
import {
  CRUD_ACTIONS,
  CRUD_INITIAL,
  CRUD_LABEL,
  crudForRoleFeature,
  hasAnyCrud,
  prettyFeatureTitle,
  selectionsFromRole,
  summarizeRoleAccess,
} from "./roleAccessUtils";

function FeatureTitle({ feature }) {
  return (
    <div>
      <div style={{ fontWeight: 600 }}>{prettyFeatureTitle(feature?.title)}</div>
      {feature?.key ? (
        <code style={{ fontSize: 12, color: "var(--muted)" }}>{feature.key}</code>
      ) : null}
    </div>
  );
}

/**
 * Busy Bean–style Feature × Create/View/Edit/Delete matrix.
 * Access is role-owned (enterprise); employee forms show a live preview.
 */
export function RolePermissionMatrix({
  features = [],
  selections = {},
  onToggle,
  readOnly = true,
  empty = "No screens available for this role.",
}) {
  if (!features.length) {
    return <Notice>{empty}</Notice>;
  }

  return (
    <DirectoryTableWrap>
      <Table
        stickyLeft={1}
        columns={[
          {
            key: "feature",
            header: "Feature",
            render: (feature) => <FeatureTitle feature={feature} />,
          },
          ...CRUD_ACTIONS.map((action) => ({
            key: action,
            header: CRUD_LABEL[action],
            render: (feature) => (
              <input
                type="checkbox"
                aria-label={`${CRUD_LABEL[action]} — ${prettyFeatureTitle(feature?.title)}`}
                checked={Boolean(selections?.[String(feature.id)]?.[action])}
                disabled={readOnly || !onToggle}
                onChange={() => onToggle?.(feature.id, action)}
                style={{ width: 16, height: 16, cursor: readOnly || !onToggle ? "default" : "pointer" }}
              />
            ),
          })),
        ]}
        rows={features}
        rowKey={(feature) => feature.id}
        empty={empty}
      />
    </DirectoryTableWrap>
  );
}

/** Compact V/C/E/D chips for directory tables. */
export function AccessGrantChips({ role, features = [] }) {
  const list = Array.isArray(features) && features.length
    ? features
    : (Array.isArray(role?.permissions) ? role.permissions.map((p) => ({
        id: p.featureId,
        title: p.title,
        key: p.key,
      })) : []);

  const granted = list
    .map((feature) => ({
      feature,
      crud: crudForRoleFeature(role, feature),
    }))
    .filter(({ crud }) => hasAnyCrud(crud));

  const summary = summarizeRoleAccess(role);

  if (!role || summary.screens === 0) {
    return (
      <span style={{ color: "var(--muted)", fontSize: 13 }}>No screens</span>
    );
  }

  // Aggregate which actions exist on at least one screen for a quick scan.
  const any = CRUD_ACTIONS.reduce((acc, action) => {
    acc[action] = granted.some(({ crud }) => crud[action]);
    return acc;
  }, {});

  const title = granted
    .map(({ feature, crud }) => {
      const acts = CRUD_ACTIONS.filter((a) => crud[a]).map((a) => CRUD_LABEL[a]).join(", ");
      return `${prettyFeatureTitle(feature?.title || feature?.key)}: ${acts}`;
    })
    .join("\n");

  return (
    <div title={title} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink, #0F172A)" }}>
        {summary.screens} screen{summary.screens === 1 ? "" : "s"}
      </span>
      <span style={{ display: "inline-flex", gap: 3 }}>
        {CRUD_ACTIONS.map((action) => {
          const on = any[action];
          return (
            <span
              key={action}
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                borderRadius: 5,
                fontSize: 10,
                fontWeight: 700,
                color: on ? "var(--success-700)" : "var(--muted)",
                background: on ? "var(--success-bg)" : "transparent",
                border: on ? "1px solid transparent" : "1px dashed var(--line)",
                opacity: on ? 1 : 0.55,
              }}
            >
              {CRUD_INITIAL[action]}
            </span>
          );
        })}
      </span>
    </div>
  );
}

/**
 * Section used on create / edit / details: role-bound access matrix + manage link.
 */
export function RoleAccessPanel({
  role,
  features = [],
  readOnly = true,
  selections,
  onToggle,
  compactHint = false,
}) {
  const matrixSelections =
    selections ?? (role ? selectionsFromRole(role, features) : {});

  const summary = role ? summarizeRoleAccess(role) : { screens: 0 };

  if (!role) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <SectionHeader />
        <Notice>Select a role to preview Create / View / Edit / Delete access.</Notice>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <SectionHeader
        meta={`${summary.screens} screen${summary.screens === 1 ? "" : "s"} granted · role “${role.name || role.id}”`}
      />
      {!compactHint ? (
        <p className="jd-field__hint" style={{ margin: 0 }}>
          Access is owned by the role (not the individual). Everyone with this role
          gets the same screens.{" "}
          <Link to="/role-permission" style={{ fontWeight: 600 }}>
            Manage role permissions
          </Link>
        </p>
      ) : null}
      <RolePermissionMatrix
        features={features}
        selections={matrixSelections}
        onToggle={onToggle}
        readOnly={readOnly}
      />
    </div>
  );
}

function SectionHeader({ meta }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        Permissions
      </h3>
      {meta ? (
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{meta}</span>
      ) : null}
    </div>
  );
}
