import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Autocomplete } from "@react-google-maps/api";
import { Badge, Button, Field, Input, PageHeader, PasswordInput, Select, Textarea } from "../../design-system";
import {
  useGetAllServicesQuery,
  useGetAllCountriesQuery,
  useGetCitiesByCountryIdQuery,
  useGetAllZonesQuery,
  useGetUnitsDistanceAndCurrencyQuery,
  useRegisterAgentMutation,
  useAddAgentAddressMutation,
  useAddAgentBusinessInfoMutation,
  useGetBusinessInformationQuery,
} from "../../store/services/api";
import { useSelector } from "react-redux";
import useToaster from "../../components/ui/Toaster";
import { useGoogleMaps } from "../../utilities/googleMapsConfig";
import { buildCurrencyUnitsList } from "../../utilities/zonesList";
import {
  DEFAULT_WORKING_DAYS,
  MACHINERY_COUNT_OPTIONS,
  TURNAROUND_OPTIONS,
  SHOP_PROFILE_OPTIONS,
  SHOP_PROFILE_VALUES,
  WIZARD_STEPS,
  buildAddressPayload,
  buildBusinessPayload,
  buildRegisterPayload,
  formatHoursSummary,
  getAccountErrors,
  getLocationErrors,
  getOperationsErrors,
  isAccountComplete,
  isLocationComplete,
  isOperationsComplete,
  profileLabel,
} from "./addShopForm";
import styles from "./AddShop.module.css";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 12l5 5L20 6" />
  </svg>
);

function Section({ title, description, children }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {description ? <p className={styles.sectionDesc}>{description}</p> : null}
      {children}
    </section>
  );
}

function labelWithReq(label, required) {
  return (
    <>
      {label}
      {required ? <span className={styles.req} aria-hidden>*</span> : null}
    </>
  );
}

function optionLabel(options, value, fallback = "—") {
  if (value === undefined || value === null || value === "") return fallback;
  return options.find((o) => String(o.value) === String(value))?.label ?? String(value);
}

export default function ShopProfile() {
  const navigate = useNavigate();
  const { success, error } = useToaster();
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState(null);
  const [addressSaved, setAddressSaved] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNum: "",
    countryCode: "+44",
    countryId: "",
    cityId: "",
    noOfEmployee: "",
    zone: "",
    currencyUnitId: "",
    streetAddress: "",
    district: "",
    province: "",
    postalcode: "",
    lat: "",
    lng: "",
    coordinates: "",
    addressType: "LaundaryShopAddress",
    shopName: "",
    matchProfileOptions: "",
    otherText: "",
    services: [],
    serviceTimes: {},
    bussinessWorkingDays: DEFAULT_WORKING_DAYS,
    machineryCount: {},
  });

  const addressAutocompleteRef = useRef(null);
  const accountLocked = Boolean(registeredUserId);

  const {
    data: countriesData,
    isError: countriesError,
    isLoading: countriesLoading,
    refetch: refetchCountries,
  } = useGetAllCountriesQuery();
  const { data: zonesResponse, isLoading: zonesLoading } = useGetAllZonesQuery();
  const { data: currencyUnitsPayload } = useGetUnitsDistanceAndCurrencyQuery("currency");
  const currencyUnitsRedux = useSelector((state) => state?.apiData?.units?.currency);
  const currencyUnitsList = useMemo(
    () => buildCurrencyUnitsList(currencyUnitsPayload, currencyUnitsRedux),
    [currencyUnitsPayload, currencyUnitsRedux]
  );
  const { data: citiesData, isFetching: citiesFetching } = useGetCitiesByCountryIdQuery(formData.countryId, {
    skip: !formData.countryId,
  });
  const {
    data: servicesData,
    isLoading: servicesLoading,
    isError: servicesError,
    refetch: refetchServices,
  } = useGetAllServicesQuery();
  const {
    data: businessInfoData,
    isLoading: machinesLoading,
    isError: machinesError,
    refetch: refetchMachines,
  } = useGetBusinessInformationQuery(registeredUserId, {
    skip: !registeredUserId,
  });

  const [registerAgent, { isLoading: isRegistering }] = useRegisterAgentMutation();
  const [addAgentAddress, { isLoading: isAddingAddress }] = useAddAgentAddressMutation();
  const [addAgentBusinessInfo, { isLoading: isAddingBusiness }] = useAddAgentBusinessInfoMutation();

  const { isLoaded: isGoogleMapsLoaded, mapsError } = useGoogleMaps();

  const services = useSelector((state) => state.apiData.services);
  const countries = countriesData?.data ?? [];
  const zones = useMemo(() => {
    const zonesRaw = Array.isArray(zonesResponse?.data)
      ? zonesResponse.data
      : zonesResponse?.data?.zones ?? zonesResponse?.zones ?? [];
    return Array.isArray(zonesRaw) ? zonesRaw : [];
  }, [zonesResponse]);
  const cities = citiesData?.data ?? [];
  const machines =
    businessInfoData?.machines ??
    businessInfoData?.data?.machines ??
    businessInfoData?.machinery ??
    (Array.isArray(businessInfoData?.data) ? businessInfoData.data : []) ??
    [];

  const serviceOptions =
    (services ?? servicesData?.data ?? []).map((s) => ({
      value: s.id,
      label: s.name ?? s.serviceName ?? String(s.id),
    })) ?? [];

  const countryOptions = countries.map((c) => ({
    value: c.id,
    label: c.name ?? c.shortName ?? String(c.id),
  }));

  const cityOptions = cities.map((c) => ({
    value: c.id,
    label: c.name ?? String(c.id),
  }));

  const zoneOptions = useMemo(() => {
    return zones
      .filter((z) => {
        if (!formData.cityId) return true;
        const zCity = z.cityId ?? z.city?.id;
        return zCity == null || String(zCity) === String(formData.cityId);
      })
      .map((z) => ({
        value: String(z.id ?? z.zoneId ?? ""),
        label: z.name ?? z.zoneName ?? String(z.id ?? z.zoneId ?? ""),
      }))
      .filter((opt) => opt.value !== "");
  }, [zones, formData.cityId]);

  const selectedZone = useMemo(
    () => zones.find((z) => String(z.id ?? z.zoneId) === String(formData.zone)),
    [zones, formData.zone]
  );

  const zoneCurrencyOptions = useMemo(() => {
    if (!selectedZone) return [];
    const unit = selectedZone.currencyUnitZ ?? selectedZone.currencyUnit;
    const id = selectedZone.currencyUnitId ?? unit?.id;
    if (id === undefined || id === null || id === "") return [];
    const fromList = currencyUnitsList.find((u) => String(u?.id) === String(id));
    const name = unit?.name ?? fromList?.name ?? fromList?.code ?? String(id);
    const sym = unit?.symbol != null && unit.symbol !== "" ? String(unit.symbol) : "";
    const label = sym ? `${name} (${sym})` : name;
    return [{ value: String(id), label }];
  }, [selectedZone, currencyUnitsList]);

  const selectedCountry = useMemo(
    () => countries.find((c) => String(c.id) === String(formData.countryId)) || null,
    [countries, formData.countryId]
  );

  const accountErrors = attempted && step === 0 ? getAccountErrors(formData) : {};
  const locationErrors =
    attempted && step === 1 ? getLocationErrors(formData, selectedCountry) : {};
  const operationsErrors =
    attempted && step === 2 ? getOperationsErrors(formData) : {};
  const busy = isRegistering || isAddingAddress || isAddingBusiness;

  const handleChange = (field) => (e) => {
    const value = e?.target?.value ?? e;
    setFormData((s) => {
      if (field === "countryId") {
        return { ...s, countryId: value, cityId: "", zone: "", currencyUnitId: "" };
      }
      if (field === "cityId") {
        return { ...s, cityId: value, zone: "", currencyUnitId: "" };
      }
      return { ...s, [field]: value };
    });
  };

  // Country code: a single leading "+" then up to 4 digits (e.g. +44, +971).
  // Letters and extra symbols are stripped as the user types, not just on
  // submit, so the field can never hold "44abc" or "++1".
  const handleCountryCode = (e) => {
    const raw = e?.target?.value ?? e;
    const digits = String(raw).replace(/\D/g, "").slice(0, 4);
    setFormData((s) => ({ ...s, countryCode: `+${digits}` }));
  };

  // Phone: national digits only, capped at 11 (UK "07911123456").
  const handlePhone = (e) => {
    const raw = e?.target?.value ?? e;
    const digits = String(raw).replace(/\D/g, "").slice(0, 11);
    setFormData((s) => ({ ...s, phoneNum: digits }));
  };

  const handleZoneChange = (e) => {
    const zoneId = String(e?.target?.value ?? e ?? "");
    setFormData((s) => {
      if (!zoneId) {
        return { ...s, zone: "", currencyUnitId: "" };
      }
      const z = zones.find((x) => String(x.id ?? x.zoneId) === zoneId);
      const unit = z?.currencyUnitZ ?? z?.currencyUnit;
      const cid = z?.currencyUnitId ?? unit?.id;
      const currencyUnitId =
        cid !== undefined && cid !== null && cid !== "" ? String(cid) : "";
      return { ...s, zone: zoneId, currencyUnitId };
    });
  };

  const handleAddressPlaceChanged = () => {
    if (addressAutocompleteRef.current) {
      const place = addressAutocompleteRef.current.getPlace();
      if (place?.formatted_address) {
        const lat = place.geometry?.location?.lat?.() ?? "";
        const lng = place.geometry?.location?.lng?.() ?? "";

        // Pull district / province / postcode straight out of the picked
        // result so the admin doesn't have to retype them (same idea as the
        // agent app's postcode lookup autofill).
        const parts = Array.isArray(place.address_components)
          ? place.address_components
          : [];
        const pick = (...types) => {
          for (const t of types) {
            const c = parts.find((p) => (p.types || []).includes(t));
            if (c?.long_name) return c.long_name;
          }
          return "";
        };
        const postcode = pick("postal_code");
        // UK: postal_town is the town (e.g. "London"); fall back to locality.
        const district = pick("postal_town", "locality", "sublocality", "neighborhood");
        const province = pick("administrative_area_level_2", "administrative_area_level_1");

        setFormData((s) => ({
          ...s,
          streetAddress: place.formatted_address,
          district: district || s.district,
          province: province || s.province,
          postalcode: postcode || s.postalcode,
          lat: lat ? String(lat) : s.lat,
          lng: lng ? String(lng) : s.lng,
          coordinates: lat && lng ? `${lat},${lng}` : s.coordinates,
        }));
        setAddressSaved(false);
      }
    }
  };

  const toggleService = (id) => {
    setFormData((s) => {
      const has = s.services.some((value) => String(value) === String(id));
      return {
        ...s,
        services: has
          ? s.services.filter((value) => String(value) !== String(id))
          : [...s.services, id],
      };
    });
  };

  const setMachineryCount = (machineId, total) => {
    setFormData((s) => ({
      ...s,
      machineryCount: { ...s.machineryCount, [machineId]: total },
    }));
  };

  const setServiceTimeRequired = (serviceId, value) => {
    setFormData((s) => ({
      ...s,
      serviceTimes: { ...s.serviceTimes, [serviceId]: value || undefined },
    }));
  };

  // Apply one turnaround to every selected service in a single click.
  const setAllServiceTimes = (value) => {
    setFormData((s) => {
      const next = { ...s.serviceTimes };
      (s.services || []).forEach((id) => {
        next[id] = value || undefined;
      });
      return { ...s, serviceTimes: next };
    });
  };

  const setWorkingDay = (index, field, value) => {
    setFormData((s) => {
      const next = [...(s.bussinessWorkingDays || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...s, bussinessWorkingDays: next };
    });
  };

  const goToStep = (next) => {
    setAttempted(false);
    setStep(next);
  };

  const handleStep1Next = async () => {
    setAttempted(true);
    if (!isAccountComplete(formData)) return;
    if (registeredUserId) {
      goToStep(1);
      return;
    }
    try {
      const res = await registerAgent(buildRegisterPayload(formData)).unwrap();
      const userId = res?.data?.id ?? res?.data?.userId ?? res?.userId ?? res?.id;
      if (userId) {
        setRegisteredUserId(userId);
        goToStep(1);
        success(res?.message ?? "Agent registered");
      } else {
        error(res?.message ?? "Registration succeeded but no user id returned");
      }
    } catch (err) {
      const msg =
        err?.data?.message ?? err?.data?.error ?? err?.message ?? "Failed to register agent";
      error(msg);
    }
  };

  const handleStep2Next = async () => {
    setAttempted(true);
    if (!isLocationComplete(formData, selectedCountry)) return;
    if (!registeredUserId) {
      error("Missing user id");
      return;
    }
    if (addressSaved) {
      goToStep(2);
      return;
    }
    try {
      await addAgentAddress({
        userId: registeredUserId,
        body: buildAddressPayload(formData),
      }).unwrap();
      setAddressSaved(true);
      goToStep(2);
      success("Address added");
    } catch (err) {
      const msg =
        err?.data?.message ?? err?.data?.error ?? err?.message ?? "Failed to add address";
      error(msg);
    }
  };

  const handleStep3Next = () => {
    setAttempted(true);
    if (!isOperationsComplete(formData)) return;
    goToStep(3);
  };

  const handleStep3Save = async () => {
    if (!registeredUserId) {
      error("Missing user id");
      return;
    }
    try {
      await addAgentBusinessInfo({
        userId: registeredUserId,
        body: buildBusinessPayload(formData),
      }).unwrap();
      success("Shop added successfully");
      navigate("/shop-management/shops");
    } catch (err) {
      const msg =
        err?.data?.message ?? err?.data?.error ?? err?.message ?? "Failed to add business info";
      error(msg);
    }
  };

  const primaryAction = () => {
    if (step === 0) return handleStep1Next();
    if (step === 1) return handleStep2Next();
    if (step === 2) return handleStep3Next();
    return handleStep3Save();
  };

  const primaryLabel = (() => {
    if (step === 0) return isRegistering ? "Registering…" : accountLocked ? "Continue" : "Save account";
    if (step === 1) return isAddingAddress ? "Saving…" : addressSaved ? "Continue" : "Save location";
    if (step === 2) return "Review shop";
    return isAddingBusiness ? "Creating…" : "Create shop";
  })();

  const primaryDisabled = busy;

  const cityPlaceholder = !formData.countryId
    ? "Select country first"
    : citiesFetching
      ? "Loading cities…"
      : cityOptions.length === 0
        ? "No cities for this country"
        : "Select city";

  const zonePlaceholder = !formData.cityId
    ? "Select city first"
    : zonesLoading
      ? "Loading zones…"
      : zoneOptions.length === 0
        ? "No zones for this city"
        : "Select zone";

  const currencyPlaceholder = !formData.zone
    ? "Select zone first"
    : zoneCurrencyOptions.length === 0
      ? "No currency on this zone"
      : "Currency";

  return (
    <div className={styles.page}>
      <PageHeader
        title="Add Shop"
        description="Register a shop owner, then save address and business details in order."
      />
      <nav className={styles.stepper} aria-label="Add shop steps">
        {WIZARD_STEPS.map((item, i) => {
          const done = i < step;
          const current = i === step;
          const clickable = i < step;
          return (
            <span key={item.id} style={{ display: "contents" }}>
              <button
                type="button"
                className={`${styles.step} ${done ? styles.isDone : ""} ${current ? styles.isCurrent : ""} ${clickable ? styles.isClickable : ""}`}
                disabled={!clickable}
                onClick={() => clickable && goToStep(i)}
                aria-current={current ? "step" : undefined}
              >
                <span className={styles.dot}>{done ? <CheckIcon /> : i + 1}</span>
                <span className={styles.copy}>
                  <span className={styles.lab}>{item.label}</span>
                  <span className={styles.sub}>{item.hint}</span>
                </span>
              </button>
              {i < WIZARD_STEPS.length - 1 ? (
                <span className={`${styles.conn} ${done ? styles.isDone : ""}`} />
              ) : null}
            </span>
          );
        })}
      </nav>

      {registeredUserId && step > 0 ? (
        <div className={`${styles.banner} ${styles.bannerInfo}`}>
          Account is registered. Finish location and operations to complete this shop — Cancel leaves an unfinished agent.
        </div>
      ) : null}

      <div className={styles.card}>
        {step === 0 && (
          <>
            {countriesError ? (
              <div className={`${styles.banner} ${styles.bannerDanger}`}>
                <span>Could not load countries.</span>
                <Button size="sm" variant="secondary" onClick={() => refetchCountries()}>
                  Retry
                </Button>
              </div>
            ) : null}
            {accountLocked ? (
              <div className={`${styles.banner} ${styles.bannerSuccess}`}>
                Owner account saved. Coverage below is locked because it was already sent to the server.
              </div>
            ) : null}

            <Section
              title="Owner account"
              description="Creates the shop agent login. Required before address or business details can be saved."
            >
              <div className={styles.grid}>
                <Field
                  label={labelWithReq("First name", true)}
                  htmlFor="add-shop-first-name"
                  error={accountErrors.firstName}
                >
                  <Input
                    id="add-shop-first-name"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleChange("firstName")}
                    error={Boolean(accountErrors.firstName)}
                    disabled={accountLocked}
                    autoComplete="given-name"
                  />
                </Field>
                <Field
                  label={labelWithReq("Last name", true)}
                  htmlFor="add-shop-last-name"
                  error={accountErrors.lastName}
                >
                  <Input
                    id="add-shop-last-name"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleChange("lastName")}
                    error={Boolean(accountErrors.lastName)}
                    disabled={accountLocked}
                    autoComplete="family-name"
                  />
                </Field>
                <Field
                  label={labelWithReq("Email", true)}
                  htmlFor="add-shop-email"
                  hint={!accountErrors.email ? "Login email for this agent" : undefined}
                  error={accountErrors.email}
                >
                  <Input
                    id="add-shop-email"
                    type="email"
                    placeholder="name@shop.com"
                    value={formData.email}
                    onChange={handleChange("email")}
                    error={Boolean(accountErrors.email)}
                    disabled={accountLocked}
                    autoComplete="email"
                  />
                </Field>
                <Field
                  label={labelWithReq("Password", true)}
                  htmlFor="add-shop-password"
                  hint={!accountErrors.password ? "At least 6 characters" : undefined}
                  error={accountErrors.password}
                >
                  <PasswordInput
                    id="add-shop-password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange("password")}
                    error={Boolean(accountErrors.password)}
                    disabled={accountLocked}
                    maxLength={64}
                  />
                </Field>
                <Field
                  label={labelWithReq("Phone", true)}
                  htmlFor="add-shop-phone"
                  hint={
                    !accountErrors.phoneNum && !accountErrors.countryCode
                      ? "Digits only, e.g. 07911123456"
                      : undefined
                  }
                  error={accountErrors.countryCode || accountErrors.phoneNum}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    <Input
                      id="add-shop-country-code"
                      aria-label="Country code"
                      placeholder="+44"
                      value={formData.countryCode}
                      onChange={handleCountryCode}
                      error={Boolean(accountErrors.countryCode)}
                      disabled={accountLocked}
                      inputMode="numeric"
                      style={{ flex: "0 0 84px", width: 84, textAlign: "center" }}
                    />
                    <Input
                      id="add-shop-phone"
                      placeholder="7123456789"
                      value={formData.phoneNum}
                      onChange={handlePhone}
                      error={Boolean(accountErrors.phoneNum || accountErrors.countryCode)}
                      disabled={accountLocked}
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={11}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                  </div>
                </Field>
              </div>
            </Section>

            <Section
              title="Coverage & settlement"
              description="Country, city, and zone decide routing. Currency is inherited from the selected zone — there is no separate banking step."
            >
              <div className={styles.grid}>
                <Field label={labelWithReq("Country", true)} error={accountErrors.countryId}>
                  <Select
                    aria-label="Country"
                    value={formData.countryId}
                    onChange={handleChange("countryId")}
                    options={countryOptions}
                    placeholder={countriesLoading ? "Loading countries…" : "Select country"}
                    error={Boolean(accountErrors.countryId)}
                    disabled={accountLocked || countriesLoading}
                  />
                </Field>
                <Field label={labelWithReq("City", true)} error={accountErrors.cityId}>
                  <Select
                    aria-label="City"
                    value={formData.cityId}
                    onChange={handleChange("cityId")}
                    options={cityOptions}
                    placeholder={cityPlaceholder}
                    error={Boolean(accountErrors.cityId)}
                    disabled={accountLocked || !formData.countryId || citiesFetching}
                  />
                </Field>
                <Field
                  label={labelWithReq("Zone", true)}
                  hint={!accountErrors.zone ? "Sets service area and settlement currency" : undefined}
                  error={accountErrors.zone}
                >
                  <Select
                    aria-label="Zone"
                    value={formData.zone}
                    onChange={handleZoneChange}
                    options={zoneOptions}
                    placeholder={zonePlaceholder}
                    error={Boolean(accountErrors.zone)}
                    disabled={accountLocked || !formData.cityId}
                  />
                </Field>
                <Field
                  label={labelWithReq("Currency", true)}
                  error={accountErrors.currencyUnitId}
                >
                  <Select
                    aria-label="Currency"
                    value={formData.zone ? formData.currencyUnitId || "" : ""}
                    onChange={() => {}}
                    options={zoneCurrencyOptions}
                    placeholder={currencyPlaceholder}
                    error={Boolean(accountErrors.currencyUnitId)}
                    disabled
                  />
                </Field>
                <Field
                  label={labelWithReq("No. of employees", true)}
                  htmlFor="add-shop-employees"
                  hint={!accountErrors.noOfEmployee ? "Staff count at this location" : undefined}
                  error={accountErrors.noOfEmployee}
                >
                  <Input
                    id="add-shop-employees"
                    placeholder="e.g. 8"
                    value={formData.noOfEmployee}
                    onChange={handleChange("noOfEmployee")}
                    error={Boolean(accountErrors.noOfEmployee)}
                    disabled={accountLocked}
                    inputMode="numeric"
                  />
                </Field>
              </div>
            </Section>
          </>
        )}

        {step === 1 && (
          <Section
            title="Shop address"
            description="Search with Google Places so the shop is geocoded for dispatch. Extra locality fields are optional."
          >
            <div className={styles.grid}>
              <div className={styles.spanAll}>
                <Field
                  label={labelWithReq("Address", true)}
                  htmlFor="add-shop-address"
                  hint="Start typing, then pick a result to fill coordinates"
                  error={locationErrors.streetAddress}
                >
                  {isGoogleMapsLoaded ? (
                    <Autocomplete
                      onLoad={(ac) => {
                        addressAutocompleteRef.current = ac;
                      }}
                      onPlaceChanged={handleAddressPlaceChanged}
                    >
                      <input
                        className={`jd-input${locationErrors.streetAddress ? " is-error" : ""}`}
                        id="add-shop-address"
                        placeholder="Start typing to search address…"
                        value={formData.streetAddress}
                        onChange={(e) => {
                          setAddressSaved(false);
                          setFormData((s) => ({ ...s, streetAddress: e.target.value }));
                        }}
                        autoComplete="off"
                      />
                    </Autocomplete>
                  ) : (
                    <Input
                      id="add-shop-address"
                      placeholder={
                        mapsError
                          ? "Type address (Google Maps unavailable)"
                          : "Loading address search…"
                      }
                      value={formData.streetAddress}
                      onChange={(e) =>
                        setFormData((s) => ({ ...s, streetAddress: e.target.value }))
                      }
                      disabled={!mapsError && !isGoogleMapsLoaded}
                    />
                  )}
                </Field>
              </div>
              <Field label="District" htmlFor="add-shop-district">
                <Input
                  id="add-shop-district"
                  placeholder="District"
                  value={formData.district}
                  onChange={(e) => {
                    setAddressSaved(false);
                    handleChange("district")(e);
                  }}
                />
              </Field>
              <Field label="Province" htmlFor="add-shop-province">
                <Input
                  id="add-shop-province"
                  placeholder="Province"
                  value={formData.province}
                  onChange={(e) => {
                    setAddressSaved(false);
                    handleChange("province")(e);
                  }}
                />
              </Field>
              <Field
                label={labelWithReq("Postal code", true)}
                htmlFor="add-shop-postal"
                error={locationErrors.postalcode}
              >
                <Input
                  id="add-shop-postal"
                  placeholder="Postal code"
                  value={formData.postalcode}
                  onChange={(e) => {
                    setAddressSaved(false);
                    handleChange("postalcode")(e);
                  }}
                  error={Boolean(locationErrors.postalcode)}
                />
              </Field>
              {formData.lat && formData.lng ? (
                <div className={styles.spanAll}>
                  <div className={styles.pin}>
                    <div className={styles.pinMark} aria-hidden>
                      ⌖
                    </div>
                    <div>
                      <p className={styles.pinTitle}>Pinned from address search</p>
                      <p className={styles.pinMeta}>
                        {formData.lat}, {formData.lng}
                      </p>
                    </div>
                    <Badge tone="success">Geocoded</Badge>
                  </div>
                </div>
              ) : null}
            </div>
          </Section>
        )}

        {step === 2 && (
          <>
            <Section
              title="Business profile"
              description="Shown on the shop record. Shop name can be added later if you do not have it yet."
            >
              <div className={styles.grid}>
                <Field
                  label={labelWithReq("Shop name (business name)", true)}
                  htmlFor="add-shop-name"
                  error={operationsErrors.shopName}
                >
                  <Input
                    id="add-shop-name"
                    placeholder="Shop name"
                    value={formData.shopName}
                    onChange={handleChange("shopName")}
                    error={Boolean(operationsErrors.shopName)}
                  />
                </Field>
                <Field
                  label={labelWithReq("Shop profile", true)}
                  hint={
                    !operationsErrors.matchProfileOptions
                      ? "How this shop processes laundry"
                      : undefined
                  }
                  error={operationsErrors.matchProfileOptions}
                >
                  <Select
                    aria-label="Shop profile"
                    value={formData.matchProfileOptions}
                    onChange={(v) => {
                      const value = v?.target?.value ?? v;
                      setFormData((s) => ({
                        ...s,
                        matchProfileOptions: value,
                        // Drop stale free-text when leaving "Other" so the
                        // backend never rejects it.
                        otherText:
                          value === SHOP_PROFILE_VALUES.OTHER ? s.otherText : "",
                      }));
                    }}
                    options={SHOP_PROFILE_OPTIONS}
                    placeholder="Select a profile"
                    error={Boolean(operationsErrors.matchProfileOptions)}
                  />
                </Field>
                {formData.matchProfileOptions === SHOP_PROFILE_VALUES.OTHER ? (
                  <div className={styles.spanAll}>
                    <Field
                      label={labelWithReq("Describe the profile", true)}
                      htmlFor="add-shop-other"
                      error={operationsErrors.otherText}
                    >
                      <Textarea
                        id="add-shop-other"
                        rows={3}
                        placeholder="Describe how this shop processes laundry"
                        value={formData.otherText}
                        onChange={handleChange("otherText")}
                      />
                    </Field>
                  </div>
                ) : null}
              </div>
            </Section>

            <Section
              title="Services"
              description="Select the services this shop will fulfil. Turnaround hours appear only for selected services."
            >
              {operationsErrors.services ? (
                <div className={`${styles.banner} ${styles.bannerDanger}`}>
                  <span>{operationsErrors.services}</span>
                </div>
              ) : null}
              {servicesError ? (
                <div className={`${styles.banner} ${styles.bannerDanger}`}>
                  <span>Could not load services.</span>
                  <Button size="sm" variant="secondary" onClick={() => refetchServices()}>
                    Retry
                  </Button>
                </div>
              ) : null}
              {servicesLoading ? (
                <p className={styles.empty}>Loading services…</p>
              ) : serviceOptions.length === 0 ? (
                <p className={styles.empty}>No services available. Configure services first.</p>
              ) : (
                <div className={styles.chips}>
                  {serviceOptions.map((opt) => {
                    const checked = formData.services.some(
                      (value) => String(value) === String(opt.value)
                    );
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`${styles.chip} ${checked ? styles.chipOn : ""}`}
                        aria-pressed={checked}
                        onClick={() => toggleService(opt.value)}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {formData.services?.length > 1 ? (
                <div
                  className="flex items-center flex-wrap"
                  style={{
                    gap: 10,
                    marginTop: 16,
                    padding: "10px 12px",
                    background: "#EEF2FF",
                    border: "1px solid #C7D2FE",
                    borderRadius: 10,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#3730A3" }}>
                    Set the same turnaround for all {formData.services.length} services
                  </span>
                  <div style={{ minWidth: 190 }}>
                    <Select
                      aria-label="Apply turnaround to all services"
                      value=""
                      onChange={(v) => {
                        const val = v?.target?.value ?? v;
                        if (val) setAllServiceTimes(val);
                      }}
                      options={TURNAROUND_OPTIONS}
                      placeholder="Apply to all…"
                    />
                  </div>
                </div>
              ) : null}

              {formData.services?.length > 0 ? (
                <div className={styles.grid} style={{ marginTop: 16 }}>
                  {formData.services.map((serviceId) => {
                    const label =
                      serviceOptions.find((o) => String(o.value) === String(serviceId))?.label ??
                      `Service ${serviceId}`;
                    return (
                      <Field
                        key={serviceId}
                        label={`${label} · turnaround`}
                      >
                        <Select
                          aria-label={`${label} turnaround`}
                          value={formData.serviceTimes?.[serviceId] ?? ""}
                          onChange={(v) =>
                            setServiceTimeRequired(serviceId, v?.target?.value ?? v)
                          }
                          options={TURNAROUND_OPTIONS}
                          placeholder="Select turnaround"
                        />
                      </Field>
                    );
                  })}
                </div>
              ) : null}
            </Section>

            <Section
              title="Opening hours"
              description="Closed days send null open/close times. Default is 09:00–18:00, Sunday closed."
            >
              {operationsErrors.workingDays ? (
                <div className={`${styles.banner} ${styles.bannerDanger}`}>
                  <span>{operationsErrors.workingDays}</span>
                </div>
              ) : null}
              <div className={styles.hours}>
                <div className={styles.hourHead}>
                  <span>Day</span>
                  <span>Status</span>
                  <span>Opens</span>
                  <span>Closes</span>
                </div>
                {(formData.bussinessWorkingDays || []).map((day, index) => (
                  <div key={day.dayOfWeek} className={styles.hourRow}>
                    <span className={styles.hourDay}>{day.dayOfWeek}</span>
                    <Button
                      size="sm"
                      variant={day.status ? "primary" : "secondary"}
                      onClick={() => setWorkingDay(index, "status", !day.status)}
                      aria-pressed={day.status}
                    >
                      {day.status ? "Open" : "Closed"}
                    </Button>
                    <Input
                      id={`open-${day.dayOfWeek}`}
                      type="time"
                      aria-label={`${day.dayOfWeek} opens`}
                      disabled={!day.status}
                      value={day.openTime ? day.openTime.slice(0, 5) : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setWorkingDay(index, "openTime", v ? `${v}:00` : null);
                      }}
                    />
                    <Input
                      id={`close-${day.dayOfWeek}`}
                      type="time"
                      aria-label={`${day.dayOfWeek} closes`}
                      disabled={!day.status}
                      value={day.closeTime ? day.closeTime.slice(0, 5) : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setWorkingDay(index, "closeTime", v ? `${v}:00` : null);
                      }}
                    />
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title="Machinery"
              description="Counts are stored as 0 / 2 / 5 / 6 for the 0, 1–2, 3–5, and 5+ options."
            >
              {machinesError ? (
                <div className={`${styles.banner} ${styles.bannerDanger}`}>
                  <span>Could not load machine types.</span>
                  <Button size="sm" variant="secondary" onClick={() => refetchMachines()}>
                    Retry
                  </Button>
                </div>
              ) : null}
              {machinesLoading ? (
                <p className={styles.empty}>Loading machine types…</p>
              ) : !machines || machines.length === 0 ? (
                <p className={styles.empty}>No machine types available. Configure machines first.</p>
              ) : (
                <div className={styles.machineList}>
                  {machines.map((machine) => {
                    const machineId = machine.id ?? machine.machineId ?? machine._id;
                    const name = machine.name ?? machine.machineName ?? `Machine ${machineId}`;
                    const value = formData.machineryCount[machineId] ?? "";
                    return (
                      <div key={machineId} className={styles.machine}>
                        <p className={styles.machineTitle}>{name}</p>
                        <div className={styles.chips}>
                          {MACHINERY_COUNT_OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className={`${styles.chip} ${value === opt ? styles.chipOn : ""}`}
                              aria-pressed={value === opt}
                              onClick={() => setMachineryCount(machineId, opt)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </>
        )}

        {step === 3 && (
          <div className={styles.reviewGrid}>
            <section>
              <div className={styles.reviewHead}>
                <div>
                  <h3 className={styles.sectionTitle}>Account</h3>
                  <p className={styles.sectionDesc}>Owner and coverage already saved.</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => goToStep(0)}>
                  View
                </Button>
              </div>
              <dl className={styles.kv}>
                <dt>Owner</dt>
                <dd>
                  {formData.firstName} {formData.lastName}
                </dd>
                <dt>Email</dt>
                <dd>{formData.email || "—"}</dd>
                <dt>Phone</dt>
                <dd>
                  {formData.countryCode} {formData.phoneNum}
                </dd>
                <dt>Coverage</dt>
                <dd>
                  {optionLabel(countryOptions, formData.countryId)} · {optionLabel(cityOptions, formData.cityId)}
                </dd>
                <dt>Zone</dt>
                <dd>{optionLabel(zoneOptions, formData.zone)}</dd>
                <dt>Currency</dt>
                <dd>{optionLabel(zoneCurrencyOptions, formData.currencyUnitId)}</dd>
                <dt>Employees</dt>
                <dd>{formData.noOfEmployee || "—"}</dd>
              </dl>
            </section>

            <section>
              <div className={styles.reviewHead}>
                <div>
                  <h3 className={styles.sectionTitle}>Location</h3>
                  <p className={styles.sectionDesc}>Address already saved.</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => goToStep(1)}>
                  Edit
                </Button>
              </div>
              <dl className={styles.kv}>
                <dt>Address</dt>
                <dd>{formData.streetAddress || "—"}</dd>
                <dt>District</dt>
                <dd>{formData.district || "—"}</dd>
                <dt>Province</dt>
                <dd>{formData.province || "—"}</dd>
                <dt>Postal code</dt>
                <dd>{formData.postalcode || "—"}</dd>
                <dt>Coordinates</dt>
                <dd>{formData.coordinates || (formData.lat && formData.lng ? `${formData.lat},${formData.lng}` : "—")}</dd>
              </dl>
            </section>

            <section>
              <div className={styles.reviewHead}>
                <div>
                  <h3 className={styles.sectionTitle}>Operations</h3>
                  <p className={styles.sectionDesc}>Saved when you create the shop.</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => goToStep(2)}>
                  Edit
                </Button>
              </div>
              <dl className={styles.kv}>
                <dt>Shop name</dt>
                <dd>{formData.shopName || "—"}</dd>
                <dt>Profile</dt>
                <dd>{profileLabel(formData.matchProfileOptions)}</dd>
                {formData.matchProfileOptions === SHOP_PROFILE_VALUES.OTHER ? (
                  <>
                    <dt>Profile detail</dt>
                    <dd>{formData.otherText || "—"}</dd>
                  </>
                ) : null}
                <dt>Services</dt>
                <dd>
                  {formData.services.length
                    ? formData.services
                        .map(
                          (id) =>
                            serviceOptions.find((o) => String(o.value) === String(id))?.label ?? id
                        )
                        .join(", ")
                    : "None selected"}
                </dd>
                <dt>Hours</dt>
                <dd>{formatHoursSummary(formData.bussinessWorkingDays).join(" · ")}</dd>
                <dt>Machinery</dt>
                <dd>
                  {Object.keys(formData.machineryCount).length
                    ? Object.entries(formData.machineryCount)
                        .map(([id, count]) => {
                          const machine = (machines || []).find(
                            (m) => String(m.id ?? m.machineId ?? m._id) === String(id)
                          );
                          const name =
                            machine?.name ?? machine?.machineName ?? `Machine ${id}`;
                          return `${name} ${count}`;
                        })
                        .join(", ")
                    : "Not set"}
                </dd>
              </dl>
            </section>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerBar}>
          <span className={styles.footerMeta}>
            Step {step + 1} of {WIZARD_STEPS.length} · {WIZARD_STEPS[step].hint}
          </span>
          <div className={styles.footerActions}>
            <Button variant="ghost" onClick={() => navigate("/shop-management/shops")} disabled={busy}>
              Cancel
            </Button>
            {step > 0 ? (
              <Button variant="secondary" onClick={() => goToStep(step - 1)} disabled={busy}>
                Back
              </Button>
            ) : null}
            <Button disabled={primaryDisabled} onClick={primaryAction}>
              {primaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
