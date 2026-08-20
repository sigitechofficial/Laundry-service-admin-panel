import { useMemo, useState } from "react";
import { Button, Modal, PageHeader, Select, Table } from "../../design-system";
import { useSelector } from "react-redux";
import {
  useGetAllCitiesQuery,
  useGetAllCountriesQuery,
  useGetAllZonesQuery,
  useGetUnitsDistanceAndCurrencyQuery,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import {
  mergedZonesList,
  zonesArrayFromGetZonesResponse,
  currencyCodeFromZone,
  buildCurrencyUnitsList,
} from "../../utilities/zonesList";
import {
  PolicyDetailRow,
  PolicyDetailSection,
  PolicyDetailStack,
  PolicyIdentity,
  PolicyMeta,
  PolicyMoney,
} from "./policy-ui";
import {
  formatPolicyDate,
  formatPolicyMoney,
  resolvePolicyCurrencySymbol,
} from "./policyUtils";
import {
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";

function cityLabel(zone, cities) {
  return (
    zone.city?.name ||
    cities.find((c) => String(c.id) === String(zone.cityId || zone.city?.id))?.name ||
    ""
  );
}

function countryLabel(zone, countries) {
  return (
    zone.country?.name ||
    countries.find((c) => String(c.id) === String(zone.countryId || zone.country?.id || zone.city?.countryId))?.name ||
    ""
  );
}

export default function OverallPolicies() {
  const [search, setSearch] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [viewingZone, setViewingZone] = useState(null);

  const { data: zonesQueryData, isLoading, isError } = useGetAllZonesQuery();
  const { data: countriesQueryData } = useGetAllCountriesQuery();
  const { data: citiesQueryData } = useGetAllCitiesQuery();
  const { data: currencyUnitsPayload } = useGetUnitsDistanceAndCurrencyQuery("currency");
  const zonesReduxNode = useSelector((state) => state?.apiData?.zones);
  const countriesRedux = useSelector((state) => state?.apiData?.countries || []);
  const citiesRedux = useSelector((state) => state?.apiData?.cities || []);
  const currencyUnitsRedux = useSelector((state) => state?.apiData?.units?.currency);

  const zones = useMemo(
    () => mergedZonesList(zonesQueryData, zonesReduxNode),
    [zonesQueryData, zonesReduxNode]
  );
  const countries = useMemo(() => {
    const fromQuery = zonesArrayFromGetZonesResponse(countriesQueryData);
    return fromQuery.length ? fromQuery : Array.isArray(countriesRedux) ? countriesRedux : [];
  }, [countriesQueryData, countriesRedux]);
  const cities = useMemo(() => {
    const raw = citiesQueryData?.data ?? citiesQueryData;
    const fromQuery = Array.isArray(raw) ? raw : raw?.cities || [];
    return fromQuery.length ? fromQuery : Array.isArray(citiesRedux) ? citiesRedux : [];
  }, [citiesQueryData, citiesRedux]);
  const currencyUnitsList = useMemo(
    () => buildCurrencyUnitsList(currencyUnitsPayload, currencyUnitsRedux),
    [currencyUnitsPayload, currencyUnitsRedux]
  );

  const policiesData = useMemo(() => {
    return (zones || [])
      .filter((zone) => {
        if (selectedZone && String(zone.id) !== String(selectedZone)) return false;
        if (selectedCity && String(zone.cityId || zone.city?.id) !== String(selectedCity)) return false;
        if (selectedCountry && String(zone.countryId || zone.country?.id || zone.city?.countryId) !== String(selectedCountry)) {
          return false;
        }
        if (!search) return true;
        const hay = `${zone.id} ${zone.name}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      })
      .map((zone) => {
        const code = currencyCodeFromZone(zone, currencyUnitsList);
        const symbol = resolvePolicyCurrencySymbol({ zone, code, currencyUnits: currencyUnitsList });
        const place = [cityLabel(zone, cities), countryLabel(zone, countries)].filter(Boolean).join(" · ");
        const active =
          zone.status === true ||
          zone.status === 1 ||
          zone.isActive === true ||
          zone.isActive === 1 ||
          String(zone.status || "").toLowerCase() === "active";
        const inactive =
          zone.status === false ||
          zone.status === 0 ||
          zone.isActive === false ||
          zone.isActive === 0 ||
          String(zone.status || "").toLowerCase() === "inactive";
        return {
          id: zone.id,
          zoneId: zone.id,
          zoneName: zone.name || "—",
          place: place || "—",
          deliveryFee: zone.serviceCharge,
          feeLabel: formatPolicyMoney(zone.serviceCharge, symbol, code),
          currencyCode: code || "",
          currencySymbol: symbol,
          statusKnown: active || inactive,
          isActive: active,
          updatedAt: zone.updatedAt || zone.updated_at || zone.createdAt || zone.created_at,
          _rawZone: zone,
        };
      });
  }, [zones, selectedZone, selectedCity, selectedCountry, search, cities, countries, currencyUnitsList]);

  const averageDeliveryFee = useMemo(() => {
    const fees = (zones || [])
      .map((z) => Number(z.serviceCharge))
      .filter((n) => Number.isFinite(n));
    if (!fees.length) return "—";
    const first = zones.find((z) => Number.isFinite(Number(z.serviceCharge)));
    const code = currencyCodeFromZone(first, currencyUnitsList);
    const symbol = resolvePolicyCurrencySymbol({
      zone: first,
      code,
      currencyUnits: currencyUnitsList,
    });
    return formatPolicyMoney(fees.reduce((a, b) => a + b, 0) / fees.length, symbol, code);
  }, [zones, currencyUnitsList]);

  const columns = [
    {
      key: "zone",
      header: "Zone",
      render: (row) => (
        <PolicyIdentity primary={row.zoneName} secondary={`#${row.zoneId}${row.place !== "—" ? ` · ${row.place}` : ""}`} />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.statusKnown ? (
          <DirectoryStatusPill active={row.isActive} />
        ) : (
          <PolicyMeta>—</PolicyMeta>
        ),
    },
    {
      key: "deliveryFee",
      header: "Fee",
      render: (row) => <PolicyMoney>{row.feeLabel}</PolicyMoney>,
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (row) => <PolicyMeta>{formatPolicyDate(row.updatedAt)}</PolicyMeta>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActionView onClick={() => setViewingZone(row._rawZone)} />
      ),
    },
  ];

  const viewing = viewingZone;
  const viewingCode = viewing ? currencyCodeFromZone(viewing, currencyUnitsList) : "";
  const viewingSymbol = viewing
    ? resolvePolicyCurrencySymbol({ zone: viewing, code: viewingCode, currencyUnits: currencyUnitsList })
    : "";

  if (isLoading) return <Delay />;
  if (isError) return <p style={{ color: "var(--danger)", margin: 0 }}>Could not load zones.</p>;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader title="Overall Policies" description="Zone-level fee snapshot from live zone records." />
      <DirectoryMetrics
        items={[
          { label: "Average delivery fee", value: averageDeliveryFee, tone: "brand" },
          { label: "Zones", value: policiesData.length, tone: "navy" },
        ]}
      />
      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectorySearch
              id="overall-search"
              value={search}
              onChange={setSearch}
              placeholder="Search by zone…"
            />
            <DirectoryToolSelect>
              <Select
                aria-label="Zone"
                value={selectedZone}
                onChange={setSelectedZone}
                options={(zones || []).map((z) => ({ value: String(z.id), label: z.name }))}
                placeholder="All zones"
              />
            </DirectoryToolSelect>
            <DirectoryToolSelect>
              <Select
                aria-label="City"
                value={selectedCity}
                onChange={setSelectedCity}
                options={(cities || []).map((c) => ({ value: String(c.id), label: c.name }))}
                placeholder="All cities"
              />
            </DirectoryToolSelect>
            <DirectoryToolSelect>
              <Select
                aria-label="Country"
                value={selectedCountry}
                onChange={setSelectedCountry}
                options={(countries || []).map((c) => ({ value: String(c.id), label: c.name }))}
                placeholder="All countries"
              />
            </DirectoryToolSelect>
            {search || selectedZone || selectedCity || selectedCountry ? (
              <DirectoryToolbarEnd>
                <DirectoryClearButton
                  onClick={() => {
                    setSearch("");
                    setSelectedZone("");
                    setSelectedCity("");
                    setSelectedCountry("");
                  }}
                />
              </DirectoryToolbarEnd>
            ) : null}
          </DirectoryToolbar>
        }
      >
        <Table columns={columns} rows={policiesData} rowKey={(row) => row.id} empty="No zones match these filters." />
      </DirectoryTableWrap>

      <Modal
        open={Boolean(viewing)}
        title="Zone policy"
        onClose={() => setViewingZone(null)}
        primaryLabel="Close"
        secondaryLabel="Close"
        onPrimary={() => setViewingZone(null)}
        size="lg"
      >
        {viewing ? (
          <PolicyDetailStack>
            <PolicyDetailSection title="Identity">
              <PolicyDetailRow label="Zone" value={viewing.name} />
              <PolicyDetailRow label="Zone ID" value={viewing.id} />
              <PolicyDetailRow label="City" value={cityLabel(viewing, cities) || "—"} />
              <PolicyDetailRow label="Country" value={countryLabel(viewing, countries) || "—"} />
              <PolicyDetailRow
                label="Status"
                value={
                  viewing.status == null && viewing.isActive == null
                    ? "—"
                    : viewing.status === false || viewing.isActive === false || viewing.status === 0
                      ? "Inactive"
                      : "Active"
                }
              />
            </PolicyDetailSection>
            <PolicyDetailSection title="Fees & currency">
              <PolicyDetailRow
                label="Delivery fee"
                value={formatPolicyMoney(viewing.serviceCharge, viewingSymbol, viewingCode)}
              />
              <PolicyDetailRow label="Currency" value={viewingSymbol ? `${viewingCode || ""} (${viewingSymbol})`.trim() : viewingCode || "—"} />
              <PolicyDetailRow
                label="Currency unit ID"
                value={viewing.currencyUnitId ?? viewing.currencyUnitZ?.id ?? viewing.currencyUnit?.id ?? "—"}
              />
              <PolicyDetailRow
                label="Minimum order"
                value={
                  viewing.minOrderValue != null || viewing.minimumOrder != null
                    ? formatPolicyMoney(viewing.minOrderValue ?? viewing.minimumOrder, viewingSymbol, viewingCode)
                    : "—"
                }
              />
            </PolicyDetailSection>
            <PolicyDetailSection title="Record">
              <PolicyDetailRow label="Created" value={formatPolicyDate(viewing.createdAt || viewing.created_at)} />
              <PolicyDetailRow label="Updated" value={formatPolicyDate(viewing.updatedAt || viewing.updated_at)} />
              <PolicyDetailRow label="City ID" value={viewing.cityId ?? viewing.city?.id ?? "—"} />
              <PolicyDetailRow label="Country ID" value={viewing.countryId ?? viewing.country?.id ?? viewing.city?.countryId ?? "—"} />
            </PolicyDetailSection>
          </PolicyDetailStack>
        ) : null}
      </Modal>
    </div>
  );
}
