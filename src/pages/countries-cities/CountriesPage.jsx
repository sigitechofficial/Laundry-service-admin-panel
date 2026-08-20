import { useMemo, useState, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { Autocomplete } from "@react-google-maps/api";
import { Button, Field, Input, Modal, PageHeader, Table } from "../../design-system";
import {
  DirectoryActions,
  DirectoryFlagIdentity,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import { useGoogleMaps } from "../../utilities/googleMapsConfig";
import CountryFlag from "../../components/CountryFlag";
import {
  useAddCountryMutation,
  useDeleteCountryMutation,
  useEditCountryMutation,
  useGetAllCountriesQuery,
} from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";

export default function CountriesPage() {
  const { success, error: showError } = useToaster();
  const [countryModal, setCountryModal] = useState({ open: false, data: null, isEdit: false });
  const [deleteModal, setDeleteModal] = useState({ open: false, data: null });
  const [flagPreview, setFlagPreview] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { isLoaded, mapsError } = useGoogleMaps();

  const countryAutocompleteRef = useRef(null);
  const countryInputRef = useRef(null);

  const { data: countriesResponse, isLoading, isError, error, refetch } = useGetAllCountriesQuery();
  const [addCountry, { isLoading: isAddingCountry }] = useAddCountryMutation();
  const [editCountry, { isLoading: isEditingCountry }] = useEditCountryMutation();
  const [deleteCountry, { isLoading: isDeletingCountry }] = useDeleteCountryMutation();

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: { name: "", shortName: "", flag: "" },
  });

  const countriesData = useMemo(() => {
    const list = countriesResponse?.data || [];
    return Array.isArray(list)
      ? list.map((country, index) => ({
          id: country.id,
          sl: index + 1,
          countryId: country.id,
          countryName: country.name,
          countryCode: country.shortName || "",
          countryFlag: country.image || "",
          status: country.status !== undefined && country.status !== null ? country.status : false,
        }))
      : [];
  }, [countriesResponse?.data]);

  const visibleCountries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return countriesData;
    return countriesData.filter((row) =>
      [row.countryName, row.countryCode, row.countryId].some((value) =>
        String(value ?? "").toLowerCase().includes(q)
      )
    );
  }, [countriesData, searchTerm]);

  const closeCountryModal = () => {
    setCountryModal({ open: false, data: null, isEdit: false });
    if (flagPreview) URL.revokeObjectURL(flagPreview);
    setFlagPreview(null);
    reset();
  };

  const fetchCountryFlag = async (countryCode) => {
    try {
      const response = await fetch(`https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`);
      if (response.ok) {
        const blob = await response.blob();
        return new File([blob], `${countryCode.toLowerCase()}_flag.png`, { type: blob.type });
      }
    } catch (err) {
      console.error("Error fetching country flag:", err);
    }
    return null;
  };

  const handleCountryPlaceChanged = async () => {
    if (!countryAutocompleteRef.current) return;
    const place = countryAutocompleteRef.current.getPlace();
    if (!place) return;

    let countryName = "";
    let countryShortName = "";
    let countryCode = "";

    if (place.address_components) {
      const countryComponent = place.address_components.find((component) =>
        component.types.includes("country")
      );
      if (countryComponent) {
        countryName = countryComponent.long_name;
        countryShortName = countryComponent.short_name;
        countryCode = countryComponent.short_name.toLowerCase();
      }
    }

    if (!countryName) countryName = place.name;

    if (countryName) {
      setValue("name", countryName);
      if (countryInputRef.current) countryInputRef.current.value = countryName;
    }
    if (countryShortName) setValue("shortName", countryShortName);
    if (countryCode) {
      const flagFile = await fetchCountryFlag(countryCode);
      if (flagFile) {
        setValue("flag", flagFile);
        setFlagPreview(URL.createObjectURL(flagFile));
      }
    }
  };

  const handleAddCountry = () => {
    reset({ name: "", shortName: "", flag: "" });
    setFlagPreview(null);
    setCountryModal({ open: true, data: null, isEdit: false });
  };

  const handleEditCountry = (country) => {
    reset({
      name: country.countryName,
      shortName: country.countryCode,
      flag: country.countryFlag,
    });
    if (country.countryFlag) setFlagPreview(country.countryFlag);
    setCountryModal({ open: true, data: country, isEdit: true });
  };

  const onSubmitCountry = async (form) => {
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("shortName", form.shortName || "");
      if (form.flag) formData.append("flagImg", form.flag);

      if (countryModal.isEdit) {
        await editCountry({ id: countryModal.data.countryId, body: formData }).unwrap();
        success("Country updated successfully!");
      } else {
        await addCountry(formData).unwrap();
        success("Country added successfully!");
      }

      refetch();
      closeCountryModal();
    } catch (err) {
      showError(err?.data?.message || "Failed to add country. Please try again.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCountry(deleteModal.data.countryId).unwrap();
      success("Country deleted successfully!");
      refetch();
      setDeleteModal({ open: false, data: null });
    } catch (err) {
      showError(err?.data?.message || "Failed to delete country. Please try again.");
    }
  };

  const columns = [
    {
      key: "countryName",
      header: "Country",
      render: (row) => (
        <DirectoryFlagIdentity
          flag={
            <CountryFlag
              imagePath={row.countryFlag}
              countryCode={row.countryCode}
              countryName={row.countryName}
            />
          }
        >
          <DirectoryIdentity name={row.countryName} id={row.countryId} />
        </DirectoryFlagIdentity>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <DirectoryStatusPill active={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <Button size="sm" variant="secondary" onClick={() => setViewRow(row)}>
            View
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleEditCountry(row)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteModal({ open: true, data: row })}>
            Delete
          </Button>
        </DirectoryActions>
      ),
    },
  ];

  if (isLoading) return <p style={{ color: "var(--muted)", margin: 0 }}>Loading…</p>;
  if (isError) {
    return (
      <p style={{ color: "var(--danger-700)", margin: 0 }}>
        {error?.data?.message || "Failed to load countries."}
      </p>
    );
  }

  return (
    <div>
      <style>{`
        .pac-container { z-index: 9999 !important; border-radius: 8px; margin-top: 4px; }
      `}</style>
      <PageHeader
        title="Countries"
        description="Countries available for shop and zone mapping."
        actions={<Button onClick={handleAddCountry}>Add Country</Button>}
      />
      <DirectoryMetrics
        items={[{ label: "Total countries", value: countriesData.length, tone: "brand" }]}
      />
      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectorySearch
              id="country-search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by country name or code…"
            />
          </DirectoryToolbar>
        }
      >
        <Table
          columns={columns}
          rows={visibleCountries}
          rowKey={(row) => row.id}
          empty="No countries yet"
        />
      </DirectoryTableWrap>

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.countryName || "Country"}
        onClose={() => setViewRow(null)}
        fields={[
          { label: "Country ID", value: viewRow?.countryId },
          { label: "Name", value: viewRow?.countryName },
          { label: "Status", value: viewRow?.status ? "Active" : "Inactive" },
        ]}
      />

      <Modal
        open={countryModal.open}
        title={countryModal.isEdit ? "Edit Country" : "Add Country"}
        onClose={closeCountryModal}
        primaryLabel={
          isAddingCountry || isEditingCountry
            ? countryModal.isEdit
              ? "Updating…"
              : "Adding…"
            : countryModal.isEdit
              ? "Update"
              : "Add Country"
        }
        primaryDisabled={isAddingCountry || isEditingCountry}
        onPrimary={handleSubmit(onSubmitCountry)}
        secondaryLabel="Cancel"
      >
        <div style={{ display: "grid", gap: 16 }}>
          <Controller
            name="name"
            control={control}
            rules={{ required: "Country name is required" }}
            render={({ field: { onChange, value } }) => (
              <Field label="Country name" error={errors.name?.message}>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(autocomplete) => {
                      countryAutocompleteRef.current = autocomplete;
                      autocomplete?.setTypes(["country"]);
                    }}
                    onPlaceChanged={handleCountryPlaceChanged}
                    types={["country"]}
                  >
                    <input
                      ref={countryInputRef}
                      id="countryName"
                      className="jd-input"
                      placeholder="Enter country name"
                      defaultValue={value || ""}
                      onChange={(e) => {
                        onChange(e.target.value);
                        if (countryInputRef.current) countryInputRef.current.value = e.target.value;
                      }}
                      autoComplete="off"
                    />
                  </Autocomplete>
                ) : (
                  <Input
                    value={value || ""}
                    placeholder={mapsError ? "Type country name (Maps unavailable)" : "Loading Google Maps..."}
                    disabled={!mapsError && !isLoaded}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              </Field>
            )}
          />
          <Controller
            name="shortName"
            control={control}
            rules={{ required: "Country short name is required" }}
            render={({ field: { value } }) => (
              <Field label="Country short name" hint="Auto-filled from Google Places" error={errors.shortName?.message}>
                <Input value={value || ""} disabled placeholder="Auto-filled from Google Places" />
              </Field>
            )}
          />
          <Field
            label={flagPreview ? "Country flag (auto-filled)" : "Country flag"}
            hint={flagPreview ? "Flag automatically fetched from Google Places" : "Flag is fetched when you select a country"}
          >
            {flagPreview ? (
              <CountryFlag
                imagePath={flagPreview}
                countryCode={countryModal.data?.countryCode}
                countryName={countryModal.data?.countryName || "Selected country"}
                width={80}
                height={60}
                borderRadius={8}
              />
            ) : (
              <span style={{ color: "var(--muted)", fontSize: 13 }}>No flag yet</span>
            )}
          </Field>
        </div>
      </Modal>

      <Modal
        open={deleteModal.open}
        title="Delete Country"
        description="Are you sure you want to delete this country? This action cannot be undone."
        onClose={() => setDeleteModal({ open: false, data: null })}
        primaryLabel={isDeletingCountry ? "Deleting…" : "Delete"}
        primaryDisabled={isDeletingCountry}
        onPrimary={handleDelete}
        secondaryLabel="Cancel"
        danger
      />
    </div>
  );
}
