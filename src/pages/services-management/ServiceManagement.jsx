import Layout from "../../components/shared/Layout";
import { Box, Typography } from "@mui/material";
import Search from "../../components/ui/Search";
import FiltersButton from "../../components/ui/FiltersButton";
import ServicesCard from "./ServicesCard";
import PreferencesCard from "./PreferencesCard";
import ConfigureService from "./ConfigureService";
import ItemCategoriesCard from "./ItemCategoriesCard";

export default function ServiceManagement() {
  const content = (
    <Box width="100%">
      <Box className="flex gap-y-6 flex-col md:flex-row md:items-center justify-between !mb-8">
        <Typography variant="h5">Services Management</Typography>

        <Box className="flex items-center gap-[30px] max-md:justify-between">
          <Search />
          <FiltersButton />
        </Box>
      </Box>

      <Box className="w-full flex flex-col 2xl:flex-row gap-6 2xl:gap-12">
        <Box className="flex w-full 2xl:w-[398px] flex-col md:flex-row 2xl:flex-col gap-6 2xl:gap-12">
          <ServicesCard />

          <PreferencesCard />
        </Box>

        <Box className="flex flex-1 flex-col gap-y-6 2xl:gap-y-12">
          <ConfigureService />

          <ItemCategoriesCard />
        </Box>
      </Box>
    </Box>
  );

  return <Layout content={content} />;
}
