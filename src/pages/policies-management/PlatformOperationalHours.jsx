import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Switch,
  TextField,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ButtonBlue from "../../components/ui/ButtonBlue";
import useToaster from "../../components/ui/Toaster";
import {
  useGetPlatformOperationalHoursQuery,
  useUpdatePlatformOperationalHoursMutation,
  useGetAllCountriesQuery,
} from "../../store/services/api";
import { TbCalendar } from "../../shared/icons/index";

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

const buildRowsFromApi = (days = []) => {
  const byDay = new Map(
    (Array.isArray(days) ? days : []).map((d) => [d.dayOfWeek, d])
  );
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
  const countries = Array.isArray(countriesRes?.data)
    ? countriesRes.data
    : Array.isArray(countriesRes)
      ? countriesRes
      : [];

  const [countryId, setCountryId] = useState("");

  useEffect(() => {
    if (!countryId && countries.length > 0) {
      setCountryId(String(countries[0].id));
    }
  }, [countries, countryId]);

  const { data, isLoading, refetch, isFetching } =
    useGetPlatformOperationalHoursQuery(countryId, {
      skip: !countryId,
    });
  const [updateHours, { isLoading: isSaving }] =
    useUpdatePlatformOperationalHoursMutation();

  const apiPayload = data?.data ?? data ?? {};
  const apiDays = apiPayload?.days ?? [];
  const ianaTimeZone = apiPayload?.ianaTimeZone;
  const countryName = apiPayload?.countryName;

  const [rows, setRows] = useState(buildRowsFromApi());

  useEffect(() => {
    if (apiDays.length) {
      setRows(buildRowsFromApi(apiDays));
    }
  }, [data]);

  const handleChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
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
      toast.error(
        err?.data?.message || "Failed to update platform operational hours."
      );
    }
  };

  const selectedCountry =
    countries.find((c) => String(c.id) === String(countryId)) || null;

  return (
    <Box className="w-full">
      <Box
        sx={{
          background: "linear-gradient(135deg, #000099 0%, #1a1aff 100%)",
          borderRadius: "20px",
          mb: 3,
          px: { xs: 3, sm: 5 },
          py: { xs: 3, sm: 4 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <TbCalendar size={28} color="#fff" />
          <Box>
            <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 22 }}>
              Platform Operational Hours
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: 14, mt: 0.5 }}>
              Set hours per country. Shops in that country can only open inside
              these times (local wall clock).
            </Typography>
          </Box>
        </Box>
      </Box>

      <Paper sx={{ borderRadius: "16px", border: "1px solid #E2E8F0", overflow: "hidden", mb: 2 }}>
        <Box sx={{ px: 2.5, py: 2, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="platform-hours-country-label">Country</InputLabel>
            <Select
              labelId="platform-hours-country-label"
              label="Country"
              value={countryId}
              onChange={(e) => setCountryId(e.target.value)}
            >
              {countries.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {(ianaTimeZone || selectedCountry) && (
            <Typography sx={{ fontSize: 13, color: "#64748B" }}>
              Timezone: {ianaTimeZone || "—"}
              {countryName ? ` · ${countryName}` : ""}
            </Typography>
          )}
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "16px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #F1F5F9" }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
            Weekly schedule
          </Typography>
        </Box>
        <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {isLoading || isFetching
            ? DAY_ORDER.map((day) => (
                <Skeleton key={day} height={48} sx={{ borderRadius: 2 }} />
              ))
            : rows.map((row, index) => (
                <Box
                  key={row.dayOfWeek}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "140px 1fr" },
                    gap: 2,
                    alignItems: "center",
                    py: 1,
                    borderBottom:
                      index < rows.length - 1 ? "1px solid #F1F5F9" : "none",
                  }}
                >
                  <Typography sx={{ fontWeight: 600, color: "#334155" }}>
                    {row.dayOfWeek}
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: 2,
                      alignItems: "center",
                    }}
                  >
                    <Switch
                      checked={row.enabled}
                      onChange={(e) =>
                        handleChange(index, "enabled", e.target.checked)
                      }
                    />
                    {row.enabled ? (
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 24px 1fr",
                          gap: 1,
                          alignItems: "center",
                        }}
                      >
                        <TextField
                          type="time"
                          size="small"
                          value={row.start}
                          onChange={(e) =>
                            handleChange(index, "start", e.target.value)
                          }
                        />
                        <Typography
                          sx={{ textAlign: "center", color: "#94A3B8", fontSize: 12 }}
                        >
                          to
                        </Typography>
                        <TextField
                          type="time"
                          size="small"
                          value={row.end}
                          onChange={(e) =>
                            handleChange(index, "end", e.target.value)
                          }
                        />
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: 13, color: "#EF4444" }}>
                        Closed (platform off)
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
        </Box>
        <Box sx={{ px: 2.5, py: 2, borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end" }}>
          <ButtonBlue
            text={isSaving ? "Saving…" : "Save hours"}
            onClick={handleSave}
            disabled={!countryId || isLoading || isSaving}
          />
        </Box>
      </Paper>
    </Box>
  );
}
