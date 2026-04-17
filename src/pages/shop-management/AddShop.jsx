import React, { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import InputFieldBordered from "../../components/ui/InputFieldBordered";
import SelectField from "../../components/ui/SelectField";
import {
  Select,
  MenuItem,
  FormControl,
  Typography,
  Checkbox,
  ListItemText,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
} from "@mui/material";
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
import { googleApiKey } from "../../utilities/URL";
import { buildCurrencyUnitsList } from "../../utilities/zonesList";

const MACHINERY_COUNT_OPTIONS = ["0", "1-2", "3-5", "5+"];
// Map radio value to API numeric total
const MACHINERY_COUNT_TO_NUMBER = { "0": 0, "1-2": 2, "3-5": 5, "5+": 6 };

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DEFAULT_WORKING_DAYS = DAYS_OF_WEEK.map((dayOfWeek) =>
  dayOfWeek === "Sunday"
    ? { dayOfWeek, openTime: null, closeTime: null, status: false }
    : { dayOfWeek, openTime: "09:00:00", closeTime: "18:00:00", status: true }
);

export default function ShopProfile() {
  const navigate = useNavigate();
  const { success, error } = useToaster();
  const [step, setStep] = useState(0);
  const [registeredUserId, setRegisteredUserId] = useState(null);
  const [formData, setFormData] = useState({
    // Step 1 - Register agent
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNum: "",
    countryCode: "+92",
    countryId: "",
    cityId: "",
    noOfEmployee: "",
    zone: "",
    currencyUnitId: "",
    // Step 2 - Address
    streetAddress: "",
    district: "",
    province: "",
    postalcode: "",
    lat: "",
    lng: "",
    coordinates: "",
    addressType: "LaundaryShopAddress",
    // Step 3 - Business info
    shopName: "",
    matchProfileOptions: "",
    otherText: "",
    services: [],
    serviceTimes: {}, // { [serviceId]: hours (number) }
    bussinessWorkingDays: DEFAULT_WORKING_DAYS,
    machineryCount: {}, // { [machineId]: "0" | "1-2" | "3-5" | "5+" }
  });

  const addressAutocompleteRef = useRef(null);

  const { data: countriesData } = useGetAllCountriesQuery();
  const { data: zonesResponse } = useGetAllZonesQuery();
  const { data: currencyUnitsPayload } = useGetUnitsDistanceAndCurrencyQuery("currency");
  const currencyUnitsRedux = useSelector((state) => state?.apiData?.units?.currency);
  const currencyUnitsList = useMemo(
    () => buildCurrencyUnitsList(currencyUnitsPayload, currencyUnitsRedux),
    [currencyUnitsPayload, currencyUnitsRedux]
  );
  const { data: citiesData } = useGetCitiesByCountryIdQuery(formData.countryId, {
    skip: !formData.countryId,
  });
  const { data: servicesData } = useGetAllServicesQuery();
  const { data: businessInfoData } = useGetBusinessInformationQuery(registeredUserId, {
    skip: !registeredUserId,
  });

  const [registerAgent, { isLoading: isRegistering }] = useRegisterAgentMutation();
  const [addAgentAddress, { isLoading: isAddingAddress }] = useAddAgentAddressMutation();
  const [addAgentBusinessInfo, { isLoading: isAddingBusiness }] = useAddAgentBusinessInfoMutation();

  const { isLoaded: isGoogleMapsLoaded } = useLoadScript({
    googleMapsApiKey: googleApiKey,
    libraries: ["places"],
  });

  const services = useSelector((state) => state.apiData.services);
  const countries = countriesData?.data ?? [];
  const zonesRaw = Array.isArray(zonesResponse?.data)
    ? zonesResponse.data
    : zonesResponse?.data?.zones ?? zonesResponse?.zones ?? [];
  const zones = Array.isArray(zonesRaw) ? zonesRaw : [];
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

  const handleZoneChange = (e) => {
    const zoneId = String(e?.target?.value ?? "");
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
        setFormData((s) => ({
          ...s,
          streetAddress: place.formatted_address,
          lat: lat ? String(lat) : s.lat,
          lng: lng ? String(lng) : s.lng,
          coordinates: lat && lng ? `${lat},${lng}` : s.coordinates,
        }));
      }
    }
  };

  const handleServicesChange = (e) => {
    const value = e.target.value;
    setFormData((s) => ({
      ...s,
      services: typeof value === "string" ? value.split(",") : value,
    }));
  };

  const setMachineryCount = (machineId, total) => {
    setFormData((s) => ({
      ...s,
      machineryCount: { ...s.machineryCount, [machineId]: total },
    }));
  };

  const setServiceTimeRequired = (serviceId, hours) => {
    setFormData((s) => ({
      ...s,
      serviceTimes: { ...s.serviceTimes, [serviceId]: hours === "" ? undefined : Number(hours) || 0 },
    }));
  };

  const setWorkingDay = (index, field, value) => {
    setFormData((s) => {
      const next = [...(s.bussinessWorkingDays || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...s, bussinessWorkingDays: next };
    });
  };

  const isStep1Complete = () => {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNum,
      countryId,
      cityId,
      noOfEmployee,
      zone,
      currencyUnitId,
    } = formData;
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !phoneNum ||
      !countryId ||
      !cityId ||
      !noOfEmployee ||
      !zone ||
      !currencyUnitId
    )
      return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isStep2Complete = () => {
    const { streetAddress } = formData;
    return !!streetAddress?.trim();
  };

  const handleStep1Next = async () => {
    try {
      const res = await registerAgent({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phoneNum: formData.phoneNum,
        countryCode: formData.countryCode || "+92",
        countryId: Number(formData.countryId) || formData.countryId,
        cityId: Number(formData.cityId) || formData.cityId,
        zoneId: formData.zone ? Number(formData.zone) : undefined,
        currencyUnitId: formData.currencyUnitId
          ? Number(formData.currencyUnitId)
          : undefined,
      }).unwrap();
      const userId = res?.data?.id ?? res?.data?.userId ?? res?.userId ?? res?.id;
      if (userId) {
        setRegisteredUserId(userId);
        setStep(1);
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
    if (!registeredUserId) {
      error("Missing user id");
      return;
    }
    try {
      await addAgentAddress({
        userId: registeredUserId,
        body: {
          streetAddress: formData.streetAddress,
          district: formData.district || undefined,
          province: formData.province || undefined,
          postalcode: formData.postalcode || undefined,
          lat: formData.lat || undefined,
          lng: formData.lng || undefined,
          coordinates: formData.coordinates || undefined,
          addressType: formData.addressType || "LaundaryShopAddress",
        },
      }).unwrap();
      setStep(2);
      success("Address added");
    } catch (err) {
      const msg =
        err?.data?.message ?? err?.data?.error ?? err?.message ?? "Failed to add address";
      error(msg);
    }
  };

  const handleStep3Save = async () => {
    if (!registeredUserId) {
      error("Missing user id");
      return;
    }
    try {
      const machineryCount = Object.entries(formData.machineryCount)
        .filter(([, v]) => v != null && v !== "")
        .map(([machineId, radioValue]) => ({
          machineId: Number(machineId) || machineId,
          total: MACHINERY_COUNT_TO_NUMBER[radioValue] ?? 0,
        }));

      const services = (formData.services || []).map((id) => ({
        serviceId: Number(id) || id,
      }));

      const serviceTimes = (formData.services || [])
        .map((serviceId) => {
          const hours = formData.serviceTimes?.[serviceId];
          if (hours == null || hours === "") return null;
          return {
            serviceId: Number(serviceId) || serviceId,
            serviceTimeRequired: Number(hours) || 0,
          };
        })
        .filter(Boolean);

      const bussinessWorkingDays = (formData.bussinessWorkingDays || []).map((day) => ({
        dayOfWeek: day.dayOfWeek,
        openTime: day.status ? day.openTime : null,
        closeTime: day.status ? day.closeTime : null,
        status: !!day.status,
      }));

      await addAgentBusinessInfo({
        userId: registeredUserId,
        body: {
          shopName: formData.shopName || null,
          matchProfileOptions: formData.matchProfileOptions || null,
          otherText: formData.otherText || null,
          machineryCount: machineryCount.length ? machineryCount : [],
          services,
          serviceTimes,
          bussinessWorkingDays,
        },
      }).unwrap();
      success("Shop added successfully");
      navigate("/shop-management/shops");
    } catch (err) {
      const msg =
        err?.data?.message ?? err?.data?.error ?? err?.message ?? "Failed to add business info";
      error(msg);
    }
  };

  const isSaving = isRegistering || isAddingAddress || isAddingBusiness;

  return (
    <div className="w-full">
      <div className="flex items-center gap-5 font-Inter font-medium text-lg !py-8">
        {["User Information", "Address", "Business Information"].map((label, i) => (
          <p
            key={label}
            className={`shadow-chip !px-3 !py-1 rounded-full ${
              step === i ? "bg-blue100 text-white" : "bg-white"
            }`}
          >
            {label}
          </p>
        ))}
      </div>

      {step === 0 && (
        <div className="w-full bg-white rounded-lg !py-6 !px-4 sm:!px-12 grid sm:grid-cols-2 gap-6">
          <InputFieldBordered
            title="First Name"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange("firstName")}
          />
          <InputFieldBordered
            title="Last Name"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange("lastName")}
          />
          <InputFieldBordered
            type="email"
            title="Email"
            placeholder="@gmail.com"
            value={formData.email}
            onChange={handleChange("email")}
          />
          <InputFieldBordered
            type="password"
            title="Password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange("password")}
          />
          <InputFieldBordered
            title="Phone"
            placeholder="+92"
            value={formData.phoneNum}
            onChange={handleChange("phoneNum")}
          />
          <InputFieldBordered
            title="Country Code"
            placeholder="+92"
            value={formData.countryCode}
            onChange={handleChange("countryCode")}
          />
          <SelectField
            title="Country"
            placeholder="select country"
            value={formData.countryId}
            onChange={handleChange("countryId")}
            options={countryOptions}
            bgcolor="none"
            border="1px solid #00000033"
            labelColor="black"
          />
          <SelectField
            title="City"
            placeholder={formData.countryId ? "select city" : "select country first"}
            value={formData.cityId}
            onChange={handleChange("cityId")}
            options={cityOptions}
            bgcolor="none"
            border="1px solid #00000033"
            labelColor="black"
            disabled={!formData.countryId}
          />
          <InputFieldBordered
            title="No. of Employee"
            placeholder="05"
            value={formData.noOfEmployee}
            onChange={handleChange("noOfEmployee")}
          />
          <SelectField
            title="Zone"
            placeholder={formData.cityId ? "Select zone" : "Select city first"}
            value={formData.zone}
            onChange={handleZoneChange}
            options={zoneOptions}
            bgcolor="none"
            border="1px solid #00000033"
            labelColor="black"
            disabled={!formData.cityId}
          />
          <SelectField
            title="Currency"
            placeholder={
              !formData.zone
                ? "Select zone first"
                : zoneCurrencyOptions.length === 0
                  ? "No currency on this zone"
                  : "Currency"
            }
            value={formData.zone ? formData.currencyUnitId || "" : ""}
            onChange={() => {}}
            options={zoneCurrencyOptions}
            bgcolor="none"
            border="1px solid #00000033"
            labelColor="black"
            disabled
          />
          <div className="sm:col-span-2 flex justify-end pt-4">
            <button
              type="button"
              disabled={!isStep1Complete() || isRegistering}
              onClick={handleStep1Next}
              className={`rounded-lg font-medium text-white !px-12 !py-3 ${
                isStep1Complete() && !isRegistering
                  ? "bg-blue200 hover:opacity-90 cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {isRegistering ? "Registering..." : "Next"}
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="w-full bg-white rounded-lg !py-6 !px-4 sm:!px-12 grid sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <Typography variant="body2" sx={{ mb: "8px", color: "black", fontFamily: "Switzer" }}>
              Address
            </Typography>
            <div className="relative w-full">
              {isGoogleMapsLoaded ? (
                <Autocomplete onLoad={(ac) => (addressAutocompleteRef.current = ac)} onPlaceChanged={handleAddressPlaceChanged}>
                  <input
                    placeholder="Start typing to search address..."
                    value={formData.streetAddress}
                    onChange={(e) => setFormData((s) => ({ ...s, streetAddress: e.target.value }))}
                    className="w-full h-[52px] outline-none bg-none border border-[#00000033] rounded-lg !px-4 font-[Switzer] !font-normal !text-base pr-10"
                  />
                </Autocomplete>
              ) : (
                <input
                  placeholder="Loading address search..."
                  value={formData.streetAddress}
                  onChange={(e) => setFormData((s) => ({ ...s, streetAddress: e.target.value }))}
                  className="w-full h-[52px] outline-none bg-none border border-[#00000033] rounded-lg !px-4 font-[Switzer] !font-normal !text-base pr-10"
                  disabled
                />
              )}
            </div>
          </div>
          <InputFieldBordered
            title="District"
            placeholder="District"
            value={formData.district}
            onChange={handleChange("district")}
          />
          <InputFieldBordered
            title="Province"
            placeholder="Province"
            value={formData.province}
            onChange={handleChange("province")}
          />
          <InputFieldBordered
            title="Postal Code"
            placeholder="Postal code"
            value={formData.postalcode}
            onChange={handleChange("postalcode")}
          />
          <div className="sm:col-span-2 flex justify-end pt-4">
            <button
              type="button"
              disabled={!isStep2Complete() || isAddingAddress}
              onClick={handleStep2Next}
              className={`rounded-lg font-medium text-white !px-12 !py-3 ${
                isStep2Complete() && !isAddingAddress
                  ? "bg-blue200 hover:opacity-90 cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {isAddingAddress ? "Saving..." : "Next"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full bg-white rounded-lg !py-6 !px-4 sm:!px-12 grid sm:grid-cols-2 gap-6">
          <InputFieldBordered
            title="Shop Name (Business Name)"
            placeholder="Shop Name"
            value={formData.shopName}
            onChange={handleChange("shopName")}
          />
          <InputFieldBordered
            title="Match profile options"
            placeholder="e.g. Laundry Shop"
            value={formData.matchProfileOptions}
            onChange={handleChange("matchProfileOptions")}
          />
          <div className="sm:col-span-2">
            <InputFieldBordered
              title="Other text (optional)"
              placeholder=""
              value={formData.otherText}
              onChange={handleChange("otherText")}
            />
          </div>

          <FormControl fullWidth className="sm:col-span-2">
            <Typography variant="body2" sx={{ mb: "8px", color: "black" }}>
              Services
            </Typography>
            <Select
              multiple
              value={formData.services}
              onChange={handleServicesChange}
              displayEmpty
              sx={{
                height: "52px",
                fontFamily: "Switzer",
                fontWeight: 400,
                borderRadius: "8px",
                border: "1px solid #00000033",
                bgcolor: "none",
                "& fieldset": { border: "1px solid #00000033" },
                "& .MuiSelect-select": { px: "16px", fontWeight: 400 },
              }}
              renderValue={(selected) =>
                selected.length === 0
                  ? "Select services"
                  : selected
                      .map((id) => serviceOptions.find((o) => o.value === id)?.label)
                      .filter(Boolean)
                      .join(", ")
              }
            >
              {serviceOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Checkbox checked={formData.services.indexOf(opt.value) > -1} />
                  <ListItemText primary={opt.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {(formData.services?.length > 0) && (
            <div className="sm:col-span-2">
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Service times (hours required per service)
              </Typography>
              <div className="grid sm:grid-cols-2 gap-4">
                {formData.services.map((serviceId) => {
                  const label = serviceOptions.find((o) => o.value === serviceId)?.label ?? `Service ${serviceId}`;
                  return (
                    <InputFieldBordered
                      key={serviceId}
                      title={label}
                      type="number"
                      placeholder="e.g. 24"
                      min={0}
                      value={formData.serviceTimes?.[serviceId] ?? ""}
                      onChange={(e) => setServiceTimeRequired(serviceId, e.target.value)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Business working days
            </Typography>
            <div className="border border-[#00000033] rounded-lg overflow-hidden">
              <table className="w-full text-left font-[Switzer] text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 font-medium">Day</th>
                    <th className="px-4 py-2 font-medium">Open</th>
                    <th className="px-4 py-2 font-medium">Close</th>
                    <th className="px-4 py-2 font-medium">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {(formData.bussinessWorkingDays || []).map((day, index) => (
                    <tr key={day.dayOfWeek} className="border-t border-[#00000033]">
                      <td className="px-4 py-2">{day.dayOfWeek}</td>
                      <td className="px-4 py-2">
                        <input
                          type="time"
                          disabled={!day.status}
                          value={day.openTime ? day.openTime.slice(0, 5) : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setWorkingDay(index, "openTime", v ? `${v}:00` : null);
                          }}
                          className="h-9 px-2 border border-[#00000033] rounded outline-none disabled:bg-gray-100 disabled:opacity-70"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="time"
                          disabled={!day.status}
                          value={day.closeTime ? day.closeTime.slice(0, 5) : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setWorkingDay(index, "closeTime", v ? `${v}:00` : null);
                          }}
                          className="h-9 px-2 border border-[#00000033] rounded outline-none disabled:bg-gray-100 disabled:opacity-70"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={!!day.status}
                          onChange={(e) => setWorkingDay(index, "status", e.target.checked)}
                          className="rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="sm:col-span-2">
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              What is your count of machinery?
            </Typography>
            <div className="space-y-6">
              {(machines?.length ? machines : []).map((machine) => {
                const machineId = machine.id ?? machine.machineId ?? machine._id;
                const name = machine.name ?? machine.machineName ?? `Machine ${machineId}`;
                const value = formData.machineryCount[machineId] ?? "";
                return (
                  <FormControl key={machineId} component="fieldset" fullWidth>
                    <FormLabel component="legend" sx={{ color: "black", mb: 1 }}>
                      {name}
                    </FormLabel>
                    <RadioGroup
                      row
                      value={value}
                      onChange={(e) => setMachineryCount(machineId, e.target.value)}
                    >
                      {MACHINERY_COUNT_OPTIONS.map((opt) => (
                        <FormControlLabel
                          key={opt}
                          value={opt}
                          control={<Radio size="small" />}
                          label={opt}
                          sx={{ mr: 2 }}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                );
              })}
              {(!machines || machines.length === 0) && (
                <Typography color="textSecondary">No machine types available. Configure machines first.</Typography>
              )}
            </div>
          </div>

          <div className="sm:col-span-2 flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="bg-gray-100 rounded-lg font-medium text-black !px-12 !py-3 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={isAddingBusiness}
              onClick={handleStep3Save}
              className="rounded-lg font-medium text-white !px-12 !py-3 bg-blue200 hover:opacity-90 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isAddingBusiness ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
