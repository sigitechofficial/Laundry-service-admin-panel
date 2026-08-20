import { useState, useEffect } from "react";
import { Field, Select } from "../../design-system";
import { useSelector } from "react-redux";
import { useGetAllServicesQuery } from "../../store/services/api";
import ConfigureServiceOptions from "./ConfigureServiceOptions";
import ConfigureModal from "./configure-modal/ConfigureModal";
import { EmptyHint, QueryState } from "./QueryState";
import { DirectoryFormCard, DirectoryStack } from "../directory-table/directoryTable";

export default function ConfigureService({ triggerConfigure }) {
  const servicesFromStore = useSelector((state) => state.apiData.services);
  const {
    data: servicesResponse,
    isLoading: isServicesLoading,
    isError: isServicesError,
    error: servicesQueryError,
    refetch: refetchServices,
  } = useGetAllServicesQuery();
  const services = servicesResponse?.data?.services || servicesFromStore || [];

  const serviceOptions = (services || []).map((service) => ({
    label: service.name,
    value: service.id,
  }));

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState({
    label: "",
    value: "",
  });

  useEffect(() => {
    if (triggerConfigure && triggerConfigure > 0 && !modalOpen) {
      setModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerConfigure]);

  const handleServiceChange = (value) => {
    const selected = serviceOptions.find(
      (opt) => String(opt.value) === String(value)
    );
    if (selected) setSelectedService(selected);
  };

  if (isServicesLoading || isServicesError) {
    return (
      <QueryState
        loading={isServicesLoading}
        error={servicesQueryError || isServicesError}
        onRetry={refetchServices}
        errorLabel="Could not load services. Please try again."
      />
    );
  }

  return (
    <DirectoryStack>
      <DirectoryFormCard
        title="Configure Service"
        hint="Select a service to link item categories and preference types."
      >
        <Field label="Configure Service">
          <Select
            value={selectedService.value}
            onChange={handleServiceChange}
            options={serviceOptions}
            placeholder={isServicesLoading ? "Loading services…" : "Select service"}
            disabled={isServicesLoading || !serviceOptions.length}
          />
        </Field>

        {!serviceOptions.length ? (
          <EmptyHint>
            No services available. Add a service before configuring categories and
            preferences.
          </EmptyHint>
        ) : null}
      </DirectoryFormCard>

      <ConfigureServiceOptions serviceId={selectedService.value} />

      <ConfigureModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </DirectoryStack>
  );
}
