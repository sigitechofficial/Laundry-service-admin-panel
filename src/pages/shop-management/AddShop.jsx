import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import InputFieldBordered from "../../components/ui/InputFieldBordered";
import SelectField from "../../components/ui/SelectField";
import { Select, MenuItem, FormControl, Typography, Checkbox, ListItemText } from "@mui/material";
import {
  useGetAllServicesQuery,
  useGetAllCountriesQuery,
  useGetCitiesByCountryIdQuery,
  useGetAllZonesQuery,
  useAddShopMutation,
} from "../../store/services/api";
import { useSelector } from "react-redux";
import useToaster from "../../components/ui/Toaster";
import { googleApiKey } from "../../utilities/URL";

export default function ShopProfile() {
  const navigate = useNavigate();
  const { success, error } = useToaster();
  const [tab, setTab] = useState(0);
  const [formData, setFormData] = useState({
    shopName: "",
    email: "",
    phone: "",
    country: "",
    countryId: "",
    city: "",
    cityId: "",
    address: "",
    bussinessName: "",
    turnaroundTime: "",
    businessHours: "",
    countOfMachinery: "",
    services: [],
    whatMatchYourProfile: "",
    noOfEmployee: "",
    noOfEmployees: "",
    zone: "",
  });

  const addressAutocompleteRef = useRef(null);

  // Fetch services, countries, zones
  const { isLoading: servicesLoading } = useGetAllServicesQuery();
  const { data: countriesData } = useGetAllCountriesQuery();
  const { data: zonesResponse } = useGetAllZonesQuery();
  const { data: citiesData } = useGetCitiesByCountryIdQuery(formData.countryId, {
    skip: !formData.countryId,
  });
  const [addShop, { isLoading: isAdding }] = useAddShopMutation();

  const { isLoaded: isGoogleMapsLoaded } = useLoadScript({
    googleMapsApiKey: googleApiKey,
    libraries: ["places"],
  });

  const handleAddressPlaceChanged = () => {
    if (addressAutocompleteRef.current) {
      const place = addressAutocompleteRef.current.getPlace();
      if (place?.formatted_address) {
        setFormData((s) => ({ ...s, address: place.formatted_address }));
      }
    }
  };

  const services = useSelector((state) => state.apiData.services);
  const countries = countriesData?.data ?? [];
  const zonesRaw = Array.isArray(zonesResponse?.data)
    ? zonesResponse.data
    : (zonesResponse?.data?.zones ?? zonesResponse?.zones ?? []);
  const zones = Array.isArray(zonesRaw) ? zonesRaw : [];
  const cities = citiesData?.data ?? [];

  const serviceOptions =
    services?.map((service) => ({
      value: service.id,
      label: service.name,
    })) ?? [];

  const countryOptions = countries.map((c) => ({
    value: c.id,
    label: c.name ?? c.shortName ?? String(c.id),
  }));

  const cityOptions = cities.map((c) => ({
    value: c.id,
    label: c.name ?? String(c.id),
  }));

  const zoneOptions = zones.map((z) => ({
    value: String(z.id ?? z.zoneId ?? ""),
    label: z.name ?? z.zoneName ?? String(z.id ?? z.zoneId ?? ""),
  })).filter((opt) => opt.value !== "");
  const handleChange = (field) => (e) => {
    const value = e?.target?.value ?? e;
    setFormData((s) => {
      if (field === "countryId" || field === "country") {
        return { ...s, countryId: value, cityId: "", city: "" };
      }
      if (field === "cityId" || field === "city") {
        return { ...s, cityId: value };
      }
      return { ...s, [field]: value };
    });
  };

  const handleServicesChange = (e) => {
    const value = e.target.value;
    setFormData((s) => ({
      ...s,
      services: typeof value === "string" ? value.split(",") : value,
    }));
  };

  const isUserInfoComplete = () => {
    const {
      shopName,
      email,
      phone,
      countryId,
      cityId,
      address,
      noOfEmployee,
      zone,
    } = formData;
    if (
      !shopName ||
      !email ||
      !phone ||
      !countryId ||
      !cityId ||
      !address ||
      !noOfEmployee ||
      !zone
    )
      return false;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return emailValid;
  };

  const handleSave = async () => {
    try {
      const body = {
        shopName: formData.shopName,
        email: formData.email,
        phone: formData.phone,
        countryId: parseInt(formData.countryId) || formData.countryId,
        cityId: parseInt(formData.cityId) || formData.cityId,
        address: formData.address,
        noOfEmployee: formData.noOfEmployee,
        zoneId: formData.zone ? parseInt(formData.zone) || formData.zone : undefined,
        services: formData.services?.length ? formData.services : undefined,
        bussinessName: formData.bussinessName || undefined,
        turnaroundTime: formData.turnaroundTime || undefined,
        businessHours: formData.businessHours || undefined,
        countOfMachinery: formData.countOfMachinery || undefined,
        whatMatchYourProfile: formData.whatMatchYourProfile || undefined,
        noOfEmployees: formData.noOfEmployees || undefined,
      };
      const res = await addShop(body).unwrap();
      if (res?.status === "1") {
        success(res?.message ?? "Shop added successfully");
        navigate("/shop-management/shops");
      } else {
        error(res?.message ?? "Failed to add shop");
      }
    } catch (err) {
      const msg =
        err?.data?.message ??
        err?.data?.error ??
        err?.message ??
        "Failed to add shop";
      error(msg);
    }
  };
  return (
    <div className="w-full">
      <div className="flex items-center gap-5 font-Inter font-medium text-lg !py-8">
        <p
          className={`shadow-chip !px-3 !py-1 rounded-full  
            
           ${tab === 0 ? "bg-blue100 text-white" : "bg-white"} `}
        >
          User Information
        </p>
        <p
          className={`shadow-chip !px-3 !py-1 rounded-full  
           ${tab === 1 ? "bg-blue100 text-white" : "bg-white"} `}
        >
          Business Information
        </p>
      </div>
      {tab === 0 ? (
        <div className="w-full bg-white rounded-lg !py-6 !px-4 sm:!px-12 grid sm:grid-cols-2 gap-6">
          <InputFieldBordered
            title="Shop"
            label="Shop Name"
            placeholder="Shop Name"
            name="shopName"
            value={formData.shopName}
            onChange={handleChange("shopName")}
          />

          <InputFieldBordered
            type="email"
            title="Email"
            placeholder="@gmail.com"
            name="email"
            value={formData.email}
            onChange={handleChange("email")}
          />

          <InputFieldBordered
            type="text"
            title="Phone"
            placeholder="+92"
            name="phone"
            value={formData.phone}
            onChange={handleChange("phone")}
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

          <div className="w-full">
            <Typography variant="body2" sx={{ mb: "8px", color: "black", fontFamily: "Switzer" }}>
              Address
            </Typography>
            <div className="relative w-full">
              {isGoogleMapsLoaded ? (
                <Autocomplete
                  onLoad={(autocomplete) => {
                    addressAutocompleteRef.current = autocomplete;
                  }}
                  onPlaceChanged={handleAddressPlaceChanged}
                >
                  <input
                    placeholder="Start typing to search address..."
                    name="address"
                    value={formData.address}
                    onChange={(e) => setFormData((s) => ({ ...s, address: e.target.value }))}
                    className="w-full h-[52px] outline-none bg-none border border-[#00000033] rounded-lg !px-4 font-[Switzer] !font-normal !text-base pr-10"
                  />
                </Autocomplete>
              ) : (
                <input
                  placeholder="Loading address search..."
                  name="address"
                  value={formData.address}
                  onChange={(e) => setFormData((s) => ({ ...s, address: e.target.value }))}
                  className="w-full h-[52px] outline-none bg-none border border-[#00000033] rounded-lg !px-4 font-[Switzer] !font-normal !text-base pr-10"
                  disabled
                />
              )}
            </div>
          </div>

          <InputFieldBordered
            title="No. of Employee"
            placeholder="05"
            name="noOfEmployee"
            value={formData.noOfEmployee}
            onChange={handleChange("noOfEmployee")}
          />

          <SelectField
            title="Zone"
            placeholder="Select zone"
            value={formData.zone}
            onChange={handleChange("zone")}
            options={zoneOptions}
            bgcolor="none"
            border="1px solid #00000033"
            labelColor="black"
          />

          <div className="sm:col-span-2 flex justify-end pt-4">
            <button
              type="button"
              disabled={!isUserInfoComplete()}
              onClick={() => setTab(1)}
              className={`rounded-lg font-medium text-white !px-12 !py-3 ${isUserInfoComplete()
                ? "bg-blue200 hover:opacity-90 cursor-pointer"
                : "bg-gray-300 cursor-not-allowed"
                }`}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full bg-white rounded-lg !py-6 !px-4  sm:!px-12 grid ms:grid-cols-2 gap-6">
          <InputFieldBordered
            title="Register Business Name (Shop Name)"
            label=""
            placeholder=""
            value={formData.bussinessName}
            onChange={handleChange("bussinessName")}
          />
          <InputFieldBordered
            title="Turnaround Time (TAT)?"
            label=""
            placeholder=""
            value={formData.turnaroundTime}
            onChange={handleChange("turnaroundTime")}
          />
          <InputFieldBordered
            title="Business Hours"
            label=""
            placeholder=""
            value={formData.businessHours}
            onChange={handleChange("businessHours")}
          />
          <InputFieldBordered
            title="Count of machinery?"
            label=""
            placeholder=""
            value={formData.countOfMachinery}
            onChange={handleChange("countOfMachinery")}
          />
          <FormControl fullWidth>
            <Typography variant="body2" sx={{ mb: "8px", color: "black" }}>
              Services
            </Typography>
            <Select
              multiple
              value={formData.services}
              onChange={handleServicesChange}
              displayEmpty
              disabled={servicesLoading}
              sx={{
                height: "52px",
                fontFamily: "Switzer",
                fontWeight: 400,
                borderRadius: "8px",
                border: "1px solid #00000033",
                bgcolor: "none",
                "& fieldset": {
                  border: "1px solid #00000033",
                },
                "& .MuiSelect-select": {
                  px: "16px",
                  fontWeight: 400,
                },
              }}
              renderValue={(selected) => {
                if (selected.length === 0) {
                  return <span style={{ color: "#999" }}>Select services</span>;
                }
                return selected
                  .map(
                    (id) =>
                      serviceOptions.find((opt) => opt.value === id)?.label
                  )
                  .filter(Boolean)
                  .join(", ");
              }}
            >
              {serviceOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Checkbox checked={formData.services.indexOf(option.value) > -1} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <InputFieldBordered
            title="What match your profile"
            label=""
            placeholder=""
            value={formData.whatMatchYourProfile}
            onChange={handleChange("whatMatchYourProfile")}
          />
          <InputFieldBordered
            title="No of Employees"
            label=""
            placeholder=""
            value={formData.noOfEmployees}
            onChange={handleChange("noOfEmployees")}
          />
          <SelectField
            title="Zone"
            placeholder="Select zone"
            value={formData.zone}
            onChange={handleChange("zone")}
            options={zoneOptions}
            bgcolor="none"
            border="1px solid #00000033"
            labelColor="black"
          />

          <div className="sm:col-span-2 flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setTab(0)}
              className=" bg-gray-100 rounded-lg font-medium text-black !px-12 !py-3 cursor-pointer"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={isAdding}
              onClick={handleSave}
              className="rounded-lg font-medium text-white !px-12 !py-3 bg-blue200 hover:opacity-90 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isAdding ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
