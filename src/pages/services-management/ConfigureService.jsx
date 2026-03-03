import { useState, useEffect } from "react";
import ConfigureServiceOptions from "./ConfigureServiceOptions";
import SelectField from "../../components/ui/SelectField";
import { Box, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import ConfigureModal from "./configure-modal/ConfigureModal";
import { useGetAllServicesQuery } from "../../store/services/api";

export default function ConfigureService({ triggerConfigure }) {
  const servicesFromStore = useSelector((state) => state.apiData.services);
  const { data: servicesResponse, isLoading: isServicesLoading } =
    useGetAllServicesQuery();
  const services = servicesResponse?.data?.services || servicesFromStore || [];

  const SERVICE_OPTIONS = services?.map((service) => ({
    label: service.name,
    value: service.id,
  }));

  const [modalOpen, setModalOpen] = useState(false);

  const [selectedService, setSelectedService] = useState({
    label: "",
    value: "",
  });

  // Handle external trigger to open modal
  useEffect(() => {
    if (triggerConfigure && triggerConfigure > 0 && !modalOpen) {
      setModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerConfigure]);

  const handleServiceChange = (event) => {
    const selected = SERVICE_OPTIONS.find(
      (opt) => opt.value === event.target.value
    );

    if (selected) {
      setSelectedService(selected);
    }
  };

  return (
    <Box
      className="flex flex-1 flex-col gap-6 rounded-3xl !p-6"
      bgcolor={"grey.60"}
      border="1px solid #D0D5DD"
    >
      <Box className="flex gap-2 items-center">
        <Typography variant="body2" fontFamily={"SF Pro"} color="grey.40">
          Configure Service
        </Typography>
      </Box>

      <SelectField
        title=""
        value={selectedService.value}
        onChange={handleServiceChange}
        options={SERVICE_OPTIONS}
        placeholder={isServicesLoading ? "Loading services..." : "Select service"}
        fullWidth
        bgcolor={"white"}
        disabled={isServicesLoading || !SERVICE_OPTIONS?.length}
      />

      <ConfigureServiceOptions serviceId={selectedService.value} />

      <ConfigureModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </Box>
  );
}
