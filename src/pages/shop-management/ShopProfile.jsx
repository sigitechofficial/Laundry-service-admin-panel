import React, { useState } from "react";
import InputFieldModal from "../../components/ui/InputFieldModal";
import InputFieldBordered from "../../components/ui/InputFieldBordered";
import SelectField from "../../components/ui/SelectField";

export default function ShopProfile() {
  const [tab, setTab] = useState(0);
  return (
    <div className="w-full">
      <div className="flex items-center gap-5 font-Inter font-medium text-lg !py-8">
        <p
          onClick={() => setTab(0)}
          className={`shadow-chip !px-3 !py-1 rounded-full  cursor-pointer
            
           ${tab === 0 ? "bg-blue100 text-white" : "bg-white"} `}
        >
          User Information
        </p>
        <p
          onClick={() => setTab(1)}
          className={`shadow-chip !px-3 !py-1 rounded-full  cursor-pointer
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
          />

          <InputFieldBordered
            type="email"
            title="Email"
            placeholder="@gmall.com"
          />

          <InputFieldBordered type="number" title="Email" placeholder="+92" />

          <SelectField
            title="Country"
            placeholder="Pakistan"
            bgcolor="none"
            border="1px solid #00000033"
            labelColor="black"
          />

          <SelectField
            title="City"
            placeholder="Lahore"
            bgcolor="none"
            border="1px solid #00000033"
            labelColor="black"
          />

          <InputFieldBordered title="Address" placeholder="Address..." />

          <InputFieldBordered title="No. of Employee" placeholder="05" />

          <InputFieldBordered title="Zone" placeholder="Lahore" />
        </div>
      ) : (
        <div className="w-full bg-white rounded-lg !py-6 !px-4  sm:!px-12 grid ms:grid-cols-2 gap-6">
          <InputFieldBordered
            title="Register Business Name (Shop Name)"
            label=""
            placeholder=""
          />
          <InputFieldBordered
            title="Turnaround Time (TAT)?"
            label=""
            placeholder=""
          />
          <InputFieldBordered title="Business Hours" label="" placeholder="" />
          <InputFieldBordered
            title="Count of machinery?"
            label=""
            placeholder=""
          />
          <InputFieldBordered title="Services" label="" placeholder="" />
          <InputFieldBordered
            title="What match your profile"
            label=""
            placeholder=""
          />
          <InputFieldBordered title="No of Employees" label="" placeholder="" />
          <InputFieldBordered title="Zone" label="" placeholder="" />
        </div>
      )}
    </div>
  );
}
