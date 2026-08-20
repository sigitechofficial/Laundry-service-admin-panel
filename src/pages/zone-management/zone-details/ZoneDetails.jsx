import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Badge, PageHeader, Table } from "../../../design-system";
import { panel } from "../../miscKitConstants";
import { useGetZoneByIdQuery } from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import { unwrapZoneFromApiResponse } from "../../../utilities/zonesList";
import { formatMoney, resolveCurrencySymbol } from "../../../utilities/formatters";
import {
  DirectoryIdentity,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryStatusPill,
  DirectoryTableWrap,
} from "../../directory-table/directoryTable";

function formatPostcodes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? item : item?.postcode || item?.code || ""))
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return formatPostcodes(parsed);
    } catch {
      return raw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export default function ZoneDetails() {
  const { id } = useParams();
  const { data, isLoading, isError } = useGetZoneByIdQuery(id, { skip: !id });
  const zone = useMemo(() => unwrapZoneFromApiResponse(data), [data]);
  const postcodes = useMemo(() => formatPostcodes(zone?.postcodes), [zone]);

  const moneySymbol = resolveCurrencySymbol(zone, {
    country: zone?.city?.country,
    countryId: zone?.city?.countryId ?? zone?.city?.country?.id,
  });
  const currencyCode =
    zone?.currencyUnitZ?.name ||
    zone?.currency ||
    zone?.zoneCurrency ||
    "";
  const currency =
    currencyCode && moneySymbol && currencyCode !== moneySymbol
      ? `${currencyCode} (${moneySymbol})`
      : currencyCode || moneySymbol || "—";
  const commission =
    zone?.agentCommissionPercent ??
    (zone?.zoneAdminComission != null ? 100 - zone.zoneAdminComission : "—");

  const columns = [
    {
      key: "field",
      header: "Field",
      render: (row) => <DirectoryIdentity name={row.field} />,
    },
    {
      key: "value",
      header: "Value",
      render: (row) => row.value,
    },
  ];

  const rows = zone
    ? [
        { field: "Zone ID", value: zone.id ?? id },
        { field: "Name", value: zone.name || "—" },
        { field: "City ID", value: zone.cityId ?? "—" },
        { field: "Currency", value: currency },
        {
          field: "Service fee",
          value: <DirectoryMoney>{formatMoney(zone.serviceCharge, moneySymbol)}</DirectoryMoney>,
        },
        {
          field: "Minimum amount",
          value: <DirectoryMoney>{formatMoney(zone.zoneMinimumAmount, moneySymbol)}</DirectoryMoney>,
        },
        { field: "Agent commission %", value: commission },
        { field: "Payment method", value: zone.paymentMethod || zone.paymentMehtod || "—" },
        {
          field: "Status",
          value: <DirectoryStatusPill active={Boolean(zone.status)} />,
        },
      ]
    : [];

  if (isLoading) return <Delay />;
  if (isError || !zone) {
    return <p style={{ color: "var(--danger)", margin: 0 }}>Could not load zone details.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title={zone.name || `Zone #${id}`}
        description={`Zone #${zone.id ?? id}`}
      />

      <DirectoryMetrics
        items={[
          { label: "Service fee", value: formatMoney(zone.serviceCharge, moneySymbol), tone: "brand" },
          { label: "Minimum", value: formatMoney(zone.zoneMinimumAmount, moneySymbol), tone: "navy" },
          { label: "Shops", value: zone.shopCount ?? zone.shops ?? "—", tone: "success" },
          {
            label: "Status",
            value: zone.status ? "Active" : "Inactive",
            tone: zone.status ? "success" : "neutral",
          },
        ]}
      />

      <DirectoryTableWrap>
        <Table columns={columns} rows={rows} rowKey={(row) => row.field} empty="No zone fields." />
      </DirectoryTableWrap>

      <section style={panel}>
        <h3 style={{ margin: "0 0 12px" }}>Postcodes</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {postcodes.map((code) => (
            <Badge key={code}>{code}</Badge>
          ))}
          {!postcodes.length ? <p className="jd-field__hint" style={{ margin: 0 }}>No postcodes on this zone.</p> : null}
        </div>
      </section>
    </div>
  );
}
