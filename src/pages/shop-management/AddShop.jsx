import React, { useState } from "react";
import InputFieldModal from "../../components/ui/InputFieldModal";
import InputFieldBordered from "../../components/ui/InputFieldBordered";
import SelectField from "../../components/ui/SelectField";
import { Select, MenuItem, FormControl, Typography, Checkbox, ListItemText } from "@mui/material";
import { useGetAllServicesQuery } from "../../store/services/api";
import { useSelector } from "react-redux";

export default function ShopProfile() {
  const [tab, setTab] = useState(0);
  const [formData, setFormData] = useState({
    shopName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    address: "",
    bussinessName: "",
    turnaroundTime: "",
    businessHours: "",
    countOfMachinery: "",
    services: [],
    whatMatchYourProfile: "",
    noOfEmployees: "",
    zone: "",
  });

  // Fetch services
  const { isLoading: servicesLoading } = useGetAllServicesQuery();
  const services = useSelector((state) => state.apiData.services);

  // Transform services to options format
  const serviceOptions = services?.map((service) => ({
    value: service.id,
    label: service.name,
  })) || [];

  const countryOptions = [
    { value: "pakistan", label: "Pakistan" },
    { value: "usa", label: "United States" },
    { value: "uk", label: "United Kingdom" },
  ];

  const cityOptionsMap = {
    pakistan: [
      { value: "lahore", label: "Lahore" },
      { value: "karachi", label: "Karachi" },
      { value: "islamabad", label: "Islamabad" },
    ],
    usa: [
      { value: "newyork", label: "New York" },
      { value: "losangeles", label: "Los Angeles" },
      { value: "chicago", label: "Chicago" },
    ],
    uk: [
      { value: "london", label: "London" },
      { value: "manchester", label: "Manchester" },
      { value: "birmingham", label: "Birmingham" },
    ],
  };

  const currentCityOptions = cityOptionsMap[formData.country] || [];
  console.log("formData", formData);
  const handleChange = (field) => (e) => {
    const value = e?.target?.value ?? e;
    setFormData((s) => {
      if (field === "country") {
        // when country changes, reset city
        return { ...s, [field]: value, city: "" };
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
      country,
      city,
      address,
      noOfEmployee,
      zone,
    } = formData;
    if (
      !shopName ||
      !email ||
      !phone ||
      !country ||
      !city ||
      !address ||
      !noOfEmployee ||
      !zone
    )
      return false;
    // simple email check
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return emailValid;
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
            value={formData.country}
            onChange={handleChange("country")}
            options={countryOptions}
            bgcolor="none"
            border="1px solid #00000033"
            labelColor="black"
          />

          <SelectField
            title="City"
            placeholder="select city"
            value={formData.city}
            onChange={handleChange("city")}
            options={currentCityOptions}
            bgcolor="none"
            border="1px solid #00000033"
            labelColor="black"
          />

          <InputFieldBordered
            title="Address"
            placeholder="Address..."
            name="address"
            value={formData.address}
            onChange={handleChange("address")}
          />

          <InputFieldBordered
            title="No. of Employee"
            placeholder="05"
            name="noOfEmployee"
            value={formData.noOfEmployee}
            onChange={handleChange("noOfEmployee")}
          />

          <InputFieldBordered
            title="Zone"
            placeholder="Lahore"
            name="zone"
            value={formData.zone}
            onChange={handleChange("zone")}
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
          <InputFieldBordered title="Business Hours" label="" placeholder="" />
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
          <InputFieldBordered
            title="Zone"
            label=""
            placeholder=""
            value={formData.zone}
            onChange={handleChange("zone")}
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
              className="rounded-lg font-medium text-white !px-12 !py-3 bg-blue200 hover:opacity-90 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
