import { Box, Typography } from "@mui/material";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import { generateStrings } from "./constants";

export default function ConfigurationsModal({ open, setModal, data, type }) {
  const handleClose = () => {
    setModal({ open: false, type: "", data: "" });
  };

  return (
    <ModalComponent
      open={open}
      title={generateStrings(type).title}
      onClose={handleClose}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
      primaryAction={{
        label: "Save",
        // onClick: handleSubmit(onSubmit),
        // isLoading: isAddCategoryLoading,
      }}
    >
      <Box className="w-full !space-y-5">
        <Typography variant="h6" fontFamily={"Switzer"} color="grey.80">
          {generateStrings(type).text}
        </Typography>

        <InputFieldModal
          title={generateStrings(type).label}
          placeholder={generateStrings(type).placeholder}
        />

        <Typography variant="subtitle2" fontFamily={"Switzer"} color="grey.80">
          {generateStrings(type).subtext}
        </Typography>
      </Box>
    </ModalComponent>
  );
}
