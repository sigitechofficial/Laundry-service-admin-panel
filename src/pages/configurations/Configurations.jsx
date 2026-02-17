import { Box, Typography } from "@mui/material";
import { BsCardList } from "../../shared/icons/index";
import { useGetAllCustomersQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import StatCard from "../../components/ui/StatCard";
import { useState } from "react";
import ConfigurationsModal from "./ConfigurationsModal";

export default function Configurations() {
  const { isLoading } = useGetAllCustomersQuery();
  const [modal, setModal] = useState({ open: "", type: "", data: "" });

  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-11">
            <Box className="flex items-center gap-x-5 justify-between">
              <Box className="flex items-center gap-x-5">
                <Typography color="blue.50">
                  <BsCardList size="24px" color="blue.50" />
                </Typography>

                <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                  Configurations
                </Typography>
              </Box>
            </Box>

            <Box className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
              <StatCard
                title="Cancellation policy"
                bgColor="bg-white"
                titleColor="#000000B2"
                onClick={() =>
                  setModal({ open: true, type: "Cancellation policy" })
                }
              />
              <StatCard
                title="Reschedule Policy"
                bgColor="bg-white"
                titleColor="#000000B2"
                onClick={() => {
                  setModal({ open: true, type: "Reschedule Policy" });
                }}
              />
              <StatCard
                title="Schedule policy"
                bgColor="bg-white"
                titleColor="#000000B2"
                onClick={() =>
                  setModal({ open: true, type: "Schedule policy" })
                }
              />
              <StatCard
                title="no show policy"
                bgColor="bg-white"
                titleColor="#000000B2"
                onClick={() => setModal({ open: true, type: "No show policy" })}
              />
            </Box>

            <ConfigurationsModal
              open={modal.open}
              setModal={setModal}
              data={modal.data}
              type={modal.type}
            />
          </div>
  );
}
