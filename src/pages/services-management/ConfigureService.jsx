import { useState } from "react";
import ConfigureServiceOptions from "./ConfigureServiceOptions";
import SelectField from "../../components/ui/SelectField";
import { Box, IconButton, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { TbPencil } from "../../shared/icons/index";
import ConfigureModal from "./configure-modal/ConfigureModal";

export default function ConfigureService() {
  const services = useSelector((state) => state.apiData.services);

  const SERVICE_OPTIONS = services?.map((service) => ({
    label: service.name,
    value: service.id,
  }));

  const [modalOpen, setModalOpen] = useState(false);

  const [selectedService, setSelectedService] = useState({
    label: "",
    value: "",
  });

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
          Configure Service{" "}
        </Typography>

        <IconButton onClick={() => setModalOpen(true)} size="small">
          <TbPencil size="20px" />
        </IconButton>
      </Box>

      <SelectField
        title=""
        value={selectedService.value}
        onChange={handleServiceChange}
        options={SERVICE_OPTIONS}
        placeholder="Select service"
        fullWidth
        bgcolor={"white"}
      />

      <ConfigureServiceOptions serviceId={selectedService.value} />

      <ConfigureModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </Box>
  );
}
