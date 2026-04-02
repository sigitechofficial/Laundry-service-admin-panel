import { Box, Typography, Skeleton, Divider } from "@mui/material";
import { useState } from "react";
import InputFieldBordered from "../../components/ui/InputFieldBordered";
import ButtonBlue from "../../components/ui/ButtonBlue";
import useToaster from "../../components/ui/Toaster";
import {
  useUpdateSupportContactMutation,
  useGetSupportContactQuery,
} from "../../store/services/api";
import {
  PiHeadsetBold,
  MdMailOutline,
  MdOutlinePhone,
  TbCalendar,
  TbSearch,
} from "../../shared/icons/index";

const INITIAL = { supportEmail: "", supportPhone: "", supportHours: "" };

function InfoRow({ icon: Icon, label, value, isLoading }) {
  return (
    <Box className="flex items-start gap-3">
      <Box
        sx={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          background: "#EEF2FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          mt: "2px",
        }}
      >
        <Icon size={18} color="#000099" />
      </Box>
      <Box className="flex-1 min-w-0">
        <Typography
          sx={{
            fontFamily: "Switzer",
            fontSize: "11px",
            fontWeight: 600,
            color: "#94A3B8",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            mb: "3px",
          }}
        >
          {label}
        </Typography>
        {isLoading ? (
          <Skeleton width="70%" height={20} />
        ) : (
          <Typography
            sx={{
              fontFamily: "Switzer",
              fontSize: "14px",
              fontWeight: 500,
              color: "#1E293B",
              wordBreak: "break-all",
            }}
          >
            {value || "—"}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function CustomerSupport() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const toast = useToaster();

  const { data: contactData, isLoading: isFetching } = useGetSupportContactQuery();
  const contact = contactData?.data;

  const [updateSupportContact, { isLoading: isSaving }] =
    useUpdateSupportContactMutation();

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
      await updateSupportContact({
        supportEmail: form.supportEmail.trim(),
        supportPhone: form.supportPhone.trim(),
        supportHours: form.supportHours.trim(),
      }).unwrap();
      toast.success("Support contact updated successfully.");
      setForm(INITIAL);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update support contact.");
    }
  }

  return (
    <Box className="w-full">
      {/* ── Hero banner ── */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #000099 0%, #1a1aff 100%)",
          borderRadius: "20px",
          overflow: "hidden",
          position: "relative",
          mb: "32px",
          px: { xs: "24px", sm: "48px" },
          py: { xs: "32px", sm: "40px" },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "-60px",
            right: "120px",
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
            pointerEvents: "none",
          }}
        />
        <Box className="flex items-center gap-4 relative z-10">
          <Box
            sx={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <PiHeadsetBold size={28} color="#ffffff" />
          </Box>
          <Box>
            <Typography
              sx={{
                fontFamily: "Switzer",
                fontWeight: 700,
                fontSize: { xs: "22px", sm: "28px" },
                color: "#ffffff",
                lineHeight: 1.2,
              }}
            >
              Customer Support
            </Typography>
            <Typography
              sx={{
                fontFamily: "Switzer",
                fontSize: "14px",
                color: "rgba(255,255,255,0.72)",
                mt: "4px",
              }}
            >
              Update the public-facing support contact details for your platform.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Two-column layout ── */}
      <Box className="flex flex-col lg:flex-row gap-6">
        {/* ── Left: form card ── */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{
            flex: "1 1 0",
            maxWidth: { lg: "520px" },
            background: "#ffffff",
            border: "1px solid #E5E7EB",
            borderRadius: "16px",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            p: { xs: "24px", sm: "32px" },
          }}
        >
          <Typography
            sx={{
              fontFamily: "Switzer",
              fontWeight: 600,
              fontSize: "18px",
              color: "#0F172A",
              mb: "6px",
            }}
          >
            Update Support Contact
          </Typography>
          <Typography
            sx={{
              fontFamily: "Switzer",
              fontSize: "13px",
              color: "#64748B",
              mb: "24px",
            }}
          >
            All fields are required.
          </Typography>

          <Box className="flex flex-col">
            <Box>
              <InputFieldBordered
                title="Support Email *"
                name="supportEmail"
                type="email"
                placeholder="support@yourcompany.com"
                value={form.supportEmail}
                onChange={handleChange("supportEmail")}
              />
              {errors.supportEmail && (
                <Typography
                  sx={{
                    fontFamily: "Switzer",
                    fontSize: "12px",
                    color: "#EF4444",
                    mt: "4px",
                    ml: "2px",
                  }}
                >
                  {errors.supportEmail}
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: "24px" }}>
              <InputFieldBordered
                title="Support Phone *"
                name="supportPhone"
                type="tel"
                placeholder="+44 20 1234 5678"
                value={form.supportPhone}
                onChange={handleChange("supportPhone")}
              />
              {errors.supportPhone && (
                <Typography
                  sx={{
                    fontFamily: "Switzer",
                    fontSize: "12px",
                    color: "#EF4444",
                    mt: "4px",
                    ml: "2px",
                  }}
                >
                  {errors.supportPhone}
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: "24px" }}>
              <InputFieldBordered
                title="Support Hours *"
                name="supportHours"
                type="text"
                placeholder="Mon–Fri 9am–6pm"
                value={form.supportHours}
                onChange={handleChange("supportHours")}
              />
              {errors.supportHours && (
                <Typography
                  sx={{
                    fontFamily: "Switzer",
                    fontSize: "12px",
                    color: "#EF4444",
                    mt: "4px",
                    ml: "2px",
                  }}
                >
                  {errors.supportHours}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ mt: "28px" }}>
            <ButtonBlue
              text="Save Changes"
              type="submit"
              width="100%"
              size="large"
              isLoading={isSaving}
            />
          </Box>
        </Box>

        {/* ── Right: current contact card ── */}
        <Box
          sx={{
            flex: "1 1 0",
            background: "#ffffff",
            border: "1px solid #E5E7EB",
            borderRadius: "16px",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            p: { xs: "24px", sm: "32px" },
          }}
        >
          <Box className="flex items-center justify-between mb-1">
            <Typography
              sx={{
                fontFamily: "Switzer",
                fontWeight: 600,
                fontSize: "18px",
                color: "#0F172A",
              }}
            >
              Current Contact Info
            </Typography>
            <Box
              sx={{
                px: "10px",
                py: "3px",
                borderRadius: "999px",
                background: "#DCFCE7",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  fontFamily: "Switzer",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#16A34A",
                }}
              >
                Live
              </Typography>
            </Box>
          </Box>
          <Typography
            sx={{
              fontFamily: "Switzer",
              fontSize: "13px",
              color: "#64748B",
              mb: "24px",
            }}
          >
            These details are visible to your customers right now.
          </Typography>

          <Box className="flex flex-col gap-5">
            <InfoRow
              icon={MdMailOutline}
              label="Support Email"
              value={contact?.supportEmail}
              isLoading={isFetching}
            />
            <Divider sx={{ borderColor: "#F1F5F9" }} />
            <InfoRow
              icon={MdOutlinePhone}
              label="Support Phone"
              value={contact?.supportPhone}
              isLoading={isFetching}
            />
            <Divider sx={{ borderColor: "#F1F5F9" }} />
            <InfoRow
              icon={TbCalendar}
              label="Support Hours"
              value={contact?.supportHours}
              isLoading={isFetching}
            />
            {contact?.helpUrl && (
              <>
                <Divider sx={{ borderColor: "#F1F5F9" }} />
                <InfoRow
                  icon={TbSearch}
                  label="Help URL"
                  value={contact.helpUrl}
                  isLoading={isFetching}
                />
              </>
            )}
          </Box>

          {contact?.updatedAt && (
            <Typography
              sx={{
                fontFamily: "Switzer",
                fontSize: "11px",
                color: "#CBD5E1",
                mt: "24px",
              }}
            >
              Last updated:{" "}
              {new Date(contact.updatedAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
