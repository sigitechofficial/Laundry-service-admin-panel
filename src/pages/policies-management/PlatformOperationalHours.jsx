import { useEffect, useMemo, useState } from "react";
import { Button, Field, Input, PageHeader, Select } from "../../design-system";
import { Toggle } from "../misc-kit";
import { DirectoryFormCard } from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import {
  useGetPlatformOperationalHoursQuery,
  useUpdatePlatformOperationalHoursMutation,
  useGetAllCountriesQuery,
} from "../../store/services/api";

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const toHourMinute = (value, fallback = "07:00") => {
  if (!value || typeof value !== "string") return fallback;
  const [hh = "07", mm = "00"] = value.split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
};

/** Normalize typed/partial input to 24h `HH:mm` (no AM/PM). */
const normalizeHHmm = (value, fallback = "07:00") => {
  if (!value || typeof value !== "string") return fallback;
  const match = value.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) {
    return fallback;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

/** Text HH:mm field — avoids native `type="time"` which follows OS locale (often AM/PM). */
function Time24Input({ value, onChange, "aria-label": ariaLabel, fallback = "07:00" }) {
  const [draft, setDraft] = useState(toHourMinute(value, fallback));

  useEffect(() => {
    setDraft(toHourMinute(value, fallback));
  }, [value, fallback]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="HH:mm"
      aria-label={ariaLabel}
      title="24-hour time (HH:mm)"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = normalizeHHmm(draft, fallback);
        setDraft(next);
        onChange(next);
      }}
      style={{ width: 88, fontVariantNumeric: "tabular-nums" }}
    />
  );
}

const buildRowsFromApi = (days = []) => {
  const byDay = new Map((Array.isArray(days) ? days : []).map((d) => [d.dayOfWeek, d]));
  return DAY_ORDER.map((day) => {
    const hit = byDay.get(day);
    return {
      dayOfWeek: day,
      id: hit?.id,
      enabled: Boolean(hit?.status),
      start: toHourMinute(hit?.openTime, "07:00"),
      end: toHourMinute(hit?.closeTime, "20:00"),
    };
  });
};

const toApiPayload = (rows) =>
  rows.map((row) => ({
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    status: row.enabled,
    openTime: row.enabled ? `${row.start}:00` : null,
    closeTime: row.enabled ? `${row.end}:00` : null,
  }));

export default function PlatformOperationalHours() {
  const toast = useToaster();
  const { data: countriesRes } = useGetAllCountriesQuery();
  const countries = useMemo(
    () =>
      Array.isArray(countriesRes?.data)
        ? countriesRes.data
        : Array.isArray(countriesRes)
          ? countriesRes
          : [],
    [countriesRes]
  );

  const [countryId, setCountryId] = useState("");

  useEffect(() => {
    if (!countryId && countries.length > 0) {
      setCountryId(String(countries[0].id));
    }
  }, [countries, countryId]);

  const { data, isLoading, refetch, isFetching } = useGetPlatformOperationalHoursQuery(countryId, {
    skip: !countryId,
  });
  const [updateHours, { isLoading: isSaving }] = useUpdatePlatformOperationalHoursMutation();

  const apiPayload = data?.data ?? data ?? {};
  const apiDays = useMemo(() => apiPayload?.days ?? [], [apiPayload?.days]);
  const ianaTimeZone = apiPayload?.ianaTimeZone;
  const countryName = apiPayload?.countryName;

  const [rows, setRows] = useState(buildRowsFromApi());

  useEffect(() => {
    setRows(buildRowsFromApi(apiDays));
  }, [apiDays]);

  const handleChange = (index, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleSave = async () => {
    if (!countryId) {
      toast.error("Please select a country.");
      return;
    }
    for (const row of rows) {
      if (row.enabled && row.start >= row.end) {
        toast.error(`${row.dayOfWeek}: close time must be after open time.`);
        return;
      }
    }
    try {
      await updateHours({
        countryId: Number(countryId),
        days: toApiPayload(rows),
      }).unwrap();
      toast.success("Platform operational hours saved.");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update platform operational hours.");
    }
  };

  const selectedCountry = countries.find((c) => String(c.id) === String(countryId)) || null;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Platform Operational Hours"
        description="Set hours per country. Shops in that country can only open inside these times (local wall clock)."
      />

      <DirectoryFormCard title="Country" hint="Hours apply to shops in the selected country (local wall clock).">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
        <Field label="Country">
          <div style={{ minWidth: 220 }}>
            <Select
              aria-label="Country"
              value={countryId}
              onChange={setCountryId}
              options={countries.map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder="Select country"
            />
          </div>
        </Field>
        {(ianaTimeZone || selectedCountry) && (
          <span className="jd-field__hint">
            Timezone: {ianaTimeZone || "—"}
            {countryName ? ` · ${countryName}` : ""}
          </span>
        )}
        </div>
      </DirectoryFormCard>

      <DirectoryFormCard title="Weekly schedule">
        {isLoading || isFetching ? (
          <p className="jd-field__hint">Loading hours…</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((row) => (
              <div
                key={row.dayOfWeek}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 16,
                  alignItems: "center",
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <strong>{row.dayOfWeek}</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  <Toggle
                    checked={row.enabled}
                    onChange={(e) =>
                      handleChange(
                        rows.findIndex((r) => r.dayOfWeek === row.dayOfWeek),
                        "enabled",
                        e.target.checked
                      )
                    }
                    label={row.enabled ? "Open" : "Closed"}
                  />
                  {row.enabled ? (
                    <>
                      <Time24Input
                        aria-label={`${row.dayOfWeek} open time`}
                        value={row.start}
                        fallback="07:00"
                        onChange={(next) =>
                          handleChange(
                            rows.findIndex((r) => r.dayOfWeek === row.dayOfWeek),
                            "start",
                            next
                          )
                        }
                      />
                      <span className="jd-field__hint">to</span>
                      <Time24Input
                        aria-label={`${row.dayOfWeek} close time`}
                        value={row.end}
                        fallback="20:00"
                        onChange={(next) =>
                          handleChange(
                            rows.findIndex((r) => r.dayOfWeek === row.dayOfWeek),
                            "end",
                            next
                          )
                        }
                      />
                    </>
                  ) : (
                    <span style={{ color: "var(--danger)" }}>Closed (platform off)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <Button onClick={handleSave} disabled={!countryId || isLoading || isSaving}>
            {isSaving ? "Saving…" : "Save hours"}
          </Button>
        </div>
      </DirectoryFormCard>
    </div>
  );
}
