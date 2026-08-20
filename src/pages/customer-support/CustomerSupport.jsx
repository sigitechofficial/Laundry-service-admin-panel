import { useEffect, useState } from "react";
import { Badge, Button, Field, Input, PageHeader } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import {
  useUpdateSupportContactMutation,
  useGetSupportContactQuery,
} from "../../store/services/api";
import { DirectoryFormCard, DirectoryStack } from "../directory-table/directoryTable";
import { DATE_TIME_FORMAT, formatDate } from "../../utilities/formatters";

const INITIAL = { supportEmail: "", supportPhone: "", supportHours: "" };

/**
 * Convert clock-like 12h tokens (e.g. `9am`, `9:30 PM`) to `HH:mm`.
 * Leaves non-time free text unchanged (`24/7`, day names, notes).
 */
function amPmTokenToHHmm(hourStr, minuteStr, meridiem) {
  let hour = Number(hourStr);
  const minute = minuteStr != null && minuteStr !== "" ? Number(minuteStr) : 0;
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  const isPm = String(meridiem).toLowerCase().startsWith("p");
  if (hour === 12) {
    hour = isPm ? 12 : 0;
  } else if (isPm) {
    hour += 12;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function to24HourHoursText(value) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") return String(value);
  // Match `9am` / `9:30 PM` / `9 a.m.` — consume optional trailing dots; avoid bare `\b` after `.`.
  return value.replace(
    /\b(\d{1,2})(?::(\d{2}))?\s*((?:[AaPp]\.[Mm])|(?:[AaPp][Mm]))\.?(?!\w)/g,
    (match, hourStr, minuteStr, meridiem) =>
      amPmTokenToHHmm(hourStr, minuteStr, meridiem) ?? match
  );
}

const INFO_ROW = {
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  gap: 8,
  padding: "10px 0",
  borderBottom: "1px dashed #e6e9f0",
};

function InfoRow({ label, value, isLoading }) {
  return (
    <div style={INFO_ROW}>
      <span className="jd-field__hint" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 500, wordBreak: "break-all" }}>
        {isLoading ? "Loading…" : value || "—"}
      </span>
    </div>
  );
}

export default function CustomerSupport() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const toast = useToaster();

  const { data: contactData, isLoading: isFetching } = useGetSupportContactQuery();
  const contact = contactData?.data;
  const [hydrated, setHydrated] = useState(false);

  const [updateSupportContact, { isLoading: isSaving }] =
    useUpdateSupportContactMutation();

  useEffect(() => {
    if (!contact || hydrated) return;
    setForm({
      supportEmail: contact.supportEmail || "",
      supportPhone: contact.supportPhone || "",
      supportHours: to24HourHoursText(contact.supportHours || ""),
    });
    setHydrated(true);
  }, [contact, hydrated]);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate() {
    const e = {};
    if (!form.supportEmail.trim()) {
      e.supportEmail = "Email is required.";
    } else if (!EMAIL_RE.test(form.supportEmail.trim())) {
      e.supportEmail = "Enter a valid email address.";
    }
    if (!form.supportPhone.trim()) {
      e.supportPhone = "Phone number is required.";
    }
    if (!form.supportHours.trim()) {
      e.supportHours = "Support hours are required.";
    }
    return e;
  }

  function handleChange(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    try {
      const supportHours = to24HourHoursText(form.supportHours.trim());
      await updateSupportContact({
        supportEmail: form.supportEmail.trim(),
        supportPhone: form.supportPhone.trim(),
        supportHours,
      }).unwrap();
      setForm((prev) => ({ ...prev, supportHours }));
      toast.success("Support contact updated successfully.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update support contact.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Customer Support"
        description="Update the public-facing support contact details for your platform."
      />

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <form onSubmit={handleSubmit} noValidate style={{ flex: "1 1 0", maxWidth: 520 }}>
          <DirectoryFormCard title="Update Support Contact" hint="All fields are required.">
          <DirectoryStack>
            <Field
              label="Support Email"
              htmlFor="support-email"
              error={errors.supportEmail}
            >
              <Input
                id="support-email"
                name="supportEmail"
                type="email"
                placeholder="support@yourcompany.com"
                value={form.supportEmail}
                onChange={handleChange("supportEmail")}
                error={Boolean(errors.supportEmail)}
              />
            </Field>
            <Field
              label="Support Phone"
              htmlFor="support-phone"
              error={errors.supportPhone}
            >
              <Input
                id="support-phone"
                name="supportPhone"
                type="tel"
                placeholder="+44 20 1234 5678"
                value={form.supportPhone}
                onChange={handleChange("supportPhone")}
                error={Boolean(errors.supportPhone)}
              />
            </Field>
            <Field
              label="Support Hours"
              htmlFor="support-hours"
              hint="Use 24-hour times (e.g. Mon–Fri 09:00–18:00)."
              error={errors.supportHours}
            >
              <Input
                id="support-hours"
                name="supportHours"
                type="text"
                placeholder="Mon–Fri 09:00–18:00"
                title="24-hour support hours"
                value={form.supportHours}
                onChange={handleChange("supportHours")}
                onBlur={() => {
                  setForm((prev) => {
                    const next = to24HourHoursText(prev.supportHours);
                    return next === prev.supportHours
                      ? prev
                      : { ...prev, supportHours: next };
                  });
                }}
                error={Boolean(errors.supportHours)}
              />
            </Field>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </DirectoryStack>
          </DirectoryFormCard>
        </form>

        <DirectoryFormCard
          title="Current Contact Info"
          hint="These details are visible to your customers right now."
          actions={<Badge tone="success">Live</Badge>}
          style={{ flex: "1 1 0" }}
        >

          <InfoRow
            label="Support Email"
            value={contact?.supportEmail}
            isLoading={isFetching}
          />
          <InfoRow
            label="Support Phone"
            value={contact?.supportPhone}
            isLoading={isFetching}
          />
          <InfoRow
            label="Support Hours"
            value={to24HourHoursText(contact?.supportHours)}
            isLoading={isFetching}
          />
          {contact?.helpUrl ? (
            <InfoRow
              label="Help URL"
              value={contact.helpUrl}
              isLoading={isFetching}
            />
          ) : null}

          {contact?.updatedAt ? (
            <p className="jd-field__hint" style={{ margin: "20px 0 0" }}>
              Last updated: {formatDate(contact.updatedAt, DATE_TIME_FORMAT)}
            </p>
          ) : null}
        </DirectoryFormCard>
      </div>
    </div>
  );
}
