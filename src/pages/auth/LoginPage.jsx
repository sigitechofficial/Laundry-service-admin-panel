import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  useAdminLoginMutation,
  useZoneAdminLoginMutation,
} from "../../store/services/api";
import { FALLBACK_DV_TOKEN, loginSchema } from "./constant";
import useToaster from "../../components/ui/Toaster";
import { requestDeviceToken } from "../../utilities/requestFCMToken";
import {
  hasValidSession,
  persistAdminLoginSession,
  persistZoneAdminLoginSession,
} from "../../utilities/authStorage";
import {
  formatDeploymentLine,
  loadDeploymentInfo,
} from "../../utilities/deploymentInfo";
import { DsScope, Button, Field, Input } from "../../design-system";
import { getApiErrorMessage } from "../../store/services/apiErrors";

export default function LoginPage() {
  const { success, error } = useToaster();
  const [seePassword, setSeePassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [deployLine, setDeployLine] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");
  const [adminLogin, { isLoading: adminLoginLoading }] = useAdminLoginMutation();
  const [zoneAdminLogin, { isLoading: zoneAdminLoginLoading }] =
    useZoneAdminLoginMutation();
  const mutationLoading = role === "manager" ? zoneAdminLoginLoading : adminLoginLoading;
  const busy = submitting || mutationLoading;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: {
      email: localStorage.getItem("rememberedEmail") || "",
      password: "",
      rememberMe: !!localStorage.getItem("rememberedEmail"),
    },
  });

  /** Password managers / automation often set DOM value without RHF onChange. */
  function syncNativeFields(form) {
    const fd = new FormData(form);
    setValue("email", String(fd.get("email") ?? "").trim(), { shouldDirty: true });
    setValue("password", String(fd.get("password") ?? ""), { shouldDirty: true });
    setValue("rememberMe", fd.get("rememberMe") != null);
  }

  useEffect(() => {
    if (hasValidSession()) navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    setSubmitError("");
    setSeePassword(false);
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    loadDeploymentInfo().then((info) => {
      if (!cancelled) setDeployLine(formatDeploymentLine(info));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onInvalid = (formErrors) => {
    setSubmitError(
      formErrors?.email?.message ||
        formErrors?.password?.message ||
        "Please fill in email and password."
    );
  };

  const handleSubmitData = async (data) => {
    if (busy) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      if (data.rememberMe) localStorage.setItem("rememberedEmail", data.email);
      else localStorage.removeItem("rememberedEmail");

      const rawDvToken = await requestDeviceToken();
      const dvToken =
        rawDvToken && String(rawDvToken).trim()
          ? String(rawDvToken).trim()
          : FALLBACK_DV_TOKEN;

      const res =
        role === "manager"
          ? await zoneAdminLogin({
              email: data.email,
              password: data.password,
              dvToken,
            }).unwrap()
          : await adminLogin({
              email: data.email,
              password: data.password,
              dvToken,
            }).unwrap();

      if (res.status === "1") {
        const persisted =
          role === "manager"
            ? persistZoneAdminLoginSession(res.data)
            : persistAdminLoginSession(res.data);
        if (!persisted) {
          const msg = "Sign-in succeeded but no valid session token was issued.";
          setSubmitError(msg);
          error(msg);
          return;
        }
        success(res.message || "Login successful 🎉");
        navigate("/");
      } else {
        const msg = res.message || "Invalid credentials, please try again.";
        setSubmitError(msg);
        error(msg);
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, "Something went wrong, please try again.");
      setSubmitError(msg);
      error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DsScope as="main" className="jd-auth">
      <div className="jd-auth__card">
        <div className="jd-auth__brand">
          <img
            className="jd-auth__logo"
            src="/images/logo1.png"
            alt="Just Dry Cleaners"
          />
        </div>
        <h1 className="jd-h1">Sign in</h1>
        <p className="jd-lead">
          Administrator and Zone Manager use different endpoints. Choose a role, then enter your credentials.
        </p>

        <div className="jd-rolepick" role="group" aria-label="Sign-in role">
          <button
            type="button"
            className={`jd-role${role === "admin" ? " is-on" : ""}`}
            aria-pressed={role === "admin"}
            onClick={() => navigate("/auth/login?role=admin")}
          >
            <b>Administrator</b>
            <span>Full platform</span>
          </button>
          <button
            type="button"
            className={`jd-role${role === "manager" ? " is-on" : ""}`}
            aria-pressed={role === "manager"}
            onClick={() => navigate("/auth/login?role=manager")}
          >
            <b>Zone Manager</b>
            <span>Scoped to assigned zones</span>
          </button>
        </div>

        {role ? (
          <form
            noValidate
            className="jd-auth__form"
            aria-busy={busy}
            onSubmit={(e) => {
              e.preventDefault();
              syncNativeFields(e.currentTarget);
              handleSubmit(handleSubmitData, onInvalid)(e);
            }}
          >
            {submitError ? (
              <div className="jd-alert jd-alert--danger" role="alert">
                {submitError}
              </div>
            ) : null}

            <Field label="Email" error={errors.email?.message} htmlFor="email">
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="name@justdry.com"
                disabled={busy}
                aria-invalid={!!errors.email}
                {...register("email")}
                error={!!errors.email}
              />
            </Field>
            <Field label="Password" error={errors.password?.message} htmlFor="password">
              <div className="jd-pass">
                <Input
                  id="password"
                  type={seePassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  disabled={busy}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                  error={!!errors.password}
                />
                <button
                  type="button"
                  className="jd-pass__toggle"
                  aria-pressed={seePassword}
                  aria-label={seePassword ? "Hide password" : "Show password"}
                  onClick={() => setSeePassword((v) => !v)}
                >
                  {seePassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            <label className="jd-check">
              <input type="checkbox" disabled={busy} {...register("rememberMe")} />
              Remember me
            </label>
            <div className="jd-auth__actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => navigate("/auth/login")}
              >
                Back
              </Button>
              <Button type="submit" disabled={busy} aria-busy={busy}>
                {busy
                  ? "Signing in…"
                  : role === "manager"
                    ? "Sign in as Zone Manager"
                    : "Sign in as Administrator"}
              </Button>
            </div>
          </form>
        ) : null}

        {deployLine ? <p className="jd-auth__build">{deployLine}</p> : null}
      </div>
    </DsScope>
  );
}
