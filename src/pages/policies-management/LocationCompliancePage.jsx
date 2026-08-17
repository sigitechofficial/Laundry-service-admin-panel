import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import {
  useGetComplianceEventsQuery,
  useGetGeofenceOverrideReportQuery,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";

function unwrap(res) {
  return res?.data !== undefined ? res.data : res;
}

export default function LocationCompliancePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = useMemo(() => {
    const p = {};
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [from, to]);

  const { data: reportRaw, isLoading: loadingReport } =
    useGetGeofenceOverrideReportQuery(params);
  const { data: eventsRaw, isLoading: loadingEvents } =
    useGetComplianceEventsQuery({
      ...params,
      overridesOnly: true,
      limit: 50,
    });

  const report = unwrap(reportRaw) || {};
  const summary = report.summary || {};
  const byActor = report.byActor || [];
  const events = unwrap(eventsRaw)?.rows || [];

  if (loadingReport && loadingEvents) return <Delay />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Location compliance
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Geofence override rates for Arrived / Complete actions. Global QA
        bypass is excluded from override scoring. Fail-instruction ack snapshots
        appear on fail events when present.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        <TextField
          type="date"
          label="From"
          InputLabelProps={{ shrink: true }}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField
          type="date"
          label="To"
          InputLabelProps={{ shrink: true }}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3}>
        {[
          ["Actions", summary.totalActions ?? 0],
          ["Overrides", summary.overrideCount ?? 0],
          ["Override %", `${summary.overrideRate ?? 0}%`],
          ["QA bypass", summary.globalBypassCount ?? 0],
        ].map(([label, value]) => (
          <Paper key={label} sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {value}
            </Typography>
          </Paper>
        ))}
      </Stack>

      <Typography fontWeight={700} mb={1}>
        By driver / shop
      </Typography>
      <Paper sx={{ mb: 3, overflow: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Driver</TableCell>
              <TableCell>Shop</TableCell>
              <TableCell align="right">Actions</TableCell>
              <TableCell align="right">Overrides</TableCell>
              <TableCell align="right">Rate %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {byActor.map((r, idx) => (
              <TableRow key={`${r.actorUserId}-${r.shopId}-${idx}`}>
                <TableCell>{r.actorName || r.actorUserId || "—"}</TableCell>
                <TableCell>{r.shopName || r.shopId || "—"}</TableCell>
                <TableCell align="right">{r.totalActions}</TableCell>
                <TableCell align="right">{r.overrideCount}</TableCell>
                <TableCell align="right">{r.overrideRate}</TableCell>
              </TableRow>
            ))}
            {!byActor.length ? (
              <TableRow>
                <TableCell colSpan={5}>No data for this range.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

      <Typography fontWeight={700} mt={2} mb={1}>
        Recent override events
      </Typography>
      <Stack spacing={1}>
        {events.map((ev) => (
          <Paper key={ev.id} sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip size="small" label={ev.action} />
              <Typography variant="body2">
                Booking #{ev.booking?.orderTrackId || ev.bookingId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {ev.distanceMeters != null
                  ? `${ev.distanceMeters}m / ${ev.requiredRadiusMeters}m`
                  : "distance n/a"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : ""}
              </Typography>
              {ev.failInstructionSetId ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Fail set v${ev.failInstructionSetVersion || "?"}`}
                />
              ) : null}
              {Array.isArray(ev.acknowledgedItemSnapshot) &&
              ev.acknowledgedItemSnapshot.length ? (
                <Chip
                  size="small"
                  color="info"
                  variant="outlined"
                  label={`${ev.acknowledgedItemSnapshot.length} steps acked`}
                />
              ) : null}
            </Stack>
          </Paper>
        ))}
        {!events.length ? (
          <Typography color="text.secondary">No override events yet.</Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
