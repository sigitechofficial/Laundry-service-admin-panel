import { useMemo, useState, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { Autocomplete } from "@react-google-maps/api";
import { Button, Field, Input, Modal, PageHeader, Select, Table } from "../../design-system";
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
  useAddCityMutation,
  useDeleteCityMutation,
  useEditCityMutation,
  useGetAllCitiesQuery,
  useGetAllCountriesQuery,
} from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";

export default function CitiesPage() {
  const { success, error: showError } = useToaster();
  const [cityModal, setCityModal] = useState({ open: false, data: null, isEdit: false });
  const [deleteModal, setDeleteModal] = useState({ open: false, data: null });
  const [selectedCountryCode, setSelectedCountryCode] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { isLoaded, mapsError } = useGoogleMaps();

  const cityAutocompleteRef = useRef(null);
  const cityInputRef = useRef(null);

  const { data: countriesResponse } = useGetAllCountriesQuery();
  const { data: citiesResponse, isLoading, isError, error, refetch } = useGetAllCitiesQuery();
  const [addCity, { isLoading: isAddingCity }] = useAddCityMutation();
  const [editCity, { isLoading: isEditingCity }] = useEditCityMutation();
  const [deleteCity, { isLoading: isDeletingCity }] = useDeleteCityMutation();

  const countries = countriesResponse?.data || [];

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: { name: "", countryId: "", lat: "", lng: "" },
  });

  const citiesData = useMemo(() => {
    const list = citiesResponse?.data || [];
    return Array.isArray(list)
      ? list.map((city, index) => ({
          id: city.id,
          sl: index + 1,
          cityId: city.id,
          cityName: city.name,
          countryName: city.country?.name || "N/A",
          countryCode: city.country?.shortName || "",
          countryFlag: city.country?.image || "",
          countryId: city.countryId,
          status: city.status !== undefined && city.status !== null ? city.status : false,
        }))
      : [];
  }, [citiesResponse?.data]);

  const visibleCities = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return citiesData;
    return citiesData.filter((row) =>
      [row.cityName, row.countryName, row.cityId].some((value) =>
        String(value ?? "").toLowerCase().includes(q)
      )
    );
  }, [citiesData, searchTerm]);

  const countryOptions = countries.map((country) => ({
    value: country.id,
    label: country.name,
  }));

  const closeCityModal = () => {
    setCityModal({ open: false, data: null, isEdit: false });
    setSelectedCountryCode(null);
    reset();
  };

  const handleCityPlaceChanged = () => {
    if (!cityAutocompleteRef.current) return;
    const place = cityAutocompleteRef.current.getPlace();
    if (!place) return;

    let cityName = place.name || place.formatted_address;
    if (place.address_components) {
      const cityComponent = place.address_components.find(
        (component) =>
          component.types.includes("locality") || component.types.includes("administrative_area_level_2")
      );
      if (cityComponent) cityName = cityComponent.long_name;
    }

    let lat = "";
    let lng = "";
    if (place.geometry?.location) {
      lat = place.geometry.location.lat().toString();
      lng = place.geometry.location.lng().toString();
    }

    if (cityName) {
      setValue("name", cityName);
      if (cityInputRef.current) cityInputRef.current.value = cityName;
    }
    if (lat) setValue("lat", lat);
    if (lng) setValue("lng", lng);
  };

  const handleAddCity = () => {
    reset({ name: "", countryId: "", lat: "", lng: "" });
    setSelectedCountryCode(null);
    setCityModal({ open: true, data: null, isEdit: false });
  };

  const handleEditCity = (city) => {
    reset({
      name: city.cityName,
      countryId: city.countryId || "",
      lat: city.lat || "",
      lng: city.lng || "",
    });
    const selectedCountry = countries.find((c) => c.id === city.countryId);
    setSelectedCountryCode(selectedCountry?.shortName?.toLowerCase() || null);
    setCityModal({ open: true, data: city, isEdit: true });
  };

  const onSubmitCity = async (form) => {
    try {
      const body = {
        name: form.name,
        lat: form.lat || "",
        lng: form.lng || "",
        countryId: parseInt(form.countryId, 10),
      };

      if (cityModal.isEdit) {
        await editCity({ id: cityModal.data.cityId, body }).unwrap();
        success("City updated successfully!");
      } else {
        await addCity(body).unwrap();
        success("City added successfully!");
      }

      refetch();
      closeCityModal();
    } catch (err) {
      showError(err?.data?.message || `Failed to ${cityModal.isEdit ? "update" : "add"} city. Please try again.`);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCity(deleteModal.data.cityId).unwrap();
      success("City deleted successfully!");
      refetch();
      setDeleteModal({ open: false, data: null });
    } catch (err) {
      showError(err?.data?.message || "Failed to delete city. Please try again.");
    }
  };

  const columns = [
    {
      key: "cityName",
      header: "City",
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
          <DirectoryIdentity name={row.cityName} meta={row.countryName} id={row.cityId} />
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
          <Button size="sm" variant="secondary" onClick={() => handleEditCity(row)}>
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
        {error?.data?.message || "Failed to load cities."}
      </p>
    );
  }

  return (
    <div>
      <style>{`
        .pac-container { z-index: 9999 !important; border-radius: 8px; margin-top: 4px; }
      `}</style>
      <PageHeader
        title="Cities"
        description="Cities available for shop and zone mapping."
        actions={<Button onClick={handleAddCity}>Add City</Button>}
      />
      <DirectoryMetrics
        items={[{ label: "Total cities", value: citiesData.length, tone: "brand" }]}
      />
      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectorySearch
              id="city-search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by city or country…"
            />
          </DirectoryToolbar>
        }
      >
        <Table
          columns={columns}
          rows={visibleCities}
          rowKey={(row) => row.id}
          empty="No cities yet"
        />
      </DirectoryTableWrap>

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.cityName || "City"}
        onClose={() => setViewRow(null)}
        fields={[
          { label: "City ID", value: viewRow?.cityId },
          { label: "City", value: viewRow?.cityName },
          { label: "Country", value: viewRow?.countryName },
          { label: "Status", value: viewRow?.status ? "Active" : "Inactive" },
        ]}
      />

      <Modal
        open={cityModal.open}
        title={cityModal.isEdit ? "Edit City" : "Add City"}
        onClose={closeCityModal}
        primaryLabel={
          isAddingCity || isEditingCity
            ? cityModal.isEdit
              ? "Updating…"
              : "Adding…"
            : cityModal.isEdit
              ? "Update"
              : "Add City"
        }
        primaryDisabled={isAddingCity || isEditingCity}
        onPrimary={handleSubmit(onSubmitCity)}
        secondaryLabel="Cancel"
      >
        <div style={{ display: "grid", gap: 16 }}>
          <Controller
            name="countryId"
            control={control}
            rules={{ required: "Please select a country" }}
            render={({ field: { onChange, value } }) => {
              const selectedCountry = countries.find((c) => String(c.id) === String(value));
              const countryCode = selectedCountry?.shortName?.toLowerCase() || null;
              if (countryCode !== selectedCountryCode) setSelectedCountryCode(countryCode);

              return (
                <Field label="Country" error={errors.countryId?.message}>
                  <Select
                    value={value}
                    onChange={(next) => {
                      if (cityModal.isEdit) return;
                      onChange(next);
                      setValue("name", "");
                      setValue("lat", "");
                      setValue("lng", "");
                      if (cityInputRef.current) cityInputRef.current.value = "";
                    }}
                    options={countryOptions}
                    placeholder="Select Country"
                    disabled={cityModal.isEdit}
                  />
                </Field>
              );
            }}
          />
          <Controller
            name="name"
            control={control}
            rules={{ required: "City name is required" }}
            render={({ field: { onChange, value } }) => (
              <Field label="City name" error={errors.name?.message}>
                {isLoaded && selectedCountryCode ? (
                  <Autocomplete
                    onLoad={(autocomplete) => {
                      cityAutocompleteRef.current = autocomplete;
                      if (autocomplete && selectedCountryCode) {
                        autocomplete.setComponentRestrictions({ country: selectedCountryCode });
                        autocomplete.setTypes(["(cities)"]);
                      }
                    }}
                    onPlaceChanged={handleCityPlaceChanged}
                    key={selectedCountryCode}
                  >
                    <input
                      ref={cityInputRef}
                      id="cityName"
                      className="jd-input"
                      placeholder="Enter city name"
                      defaultValue={value || ""}
                      onChange={(e) => {
                        onChange(e.target.value);
                        if (cityInputRef.current) cityInputRef.current.value = e.target.value;
                      }}
                      autoComplete="off"
                    />
                  </Autocomplete>
                ) : (
                  <Input
                    value={value || ""}
                    placeholder={
                      !selectedCountryCode
                        ? "Please select a country first"
                        : mapsError
                          ? "Type city name (Maps unavailable)"
                          : "Loading Google Maps..."
                    }
                    disabled={!selectedCountryCode || (!isLoaded && !mapsError)}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              </Field>
            )}
          />
        </div>
      </Modal>

      <Modal
        open={deleteModal.open}
        title="Delete City"
        description="Are you sure you want to delete this city? This action cannot be undone."
        onClose={() => setDeleteModal({ open: false, data: null })}
        primaryLabel={isDeletingCity ? "Deleting…" : "Delete"}
        primaryDisabled={isDeletingCity}
        onPrimary={handleDelete}
        secondaryLabel="Cancel"
        danger
      />
    </div>
  );
}
