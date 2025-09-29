import {
  Box,
  Grid,
  IconButton,
  Typography,
  useMediaQuery,
} from "@mui/material";
import {
  VscBellDot,
  AiOutlineUser,
  TbChevronDown,
  TbMenu2,
} from "../../shared/icons/index";
import { breakPoints, sidebarHide } from "../../shared/constants";
import { useDispatch } from "react-redux";
import { toggleSidebar } from "../../store/slices/uiSlice";
import SearchBar from "../ui/SearchBar";

export default function Header() {
  // const isMobile = useMediaQuery("(max-width:640px)");
  // const isLaptop = useMediaQuery(breakPoints.laptop);
  const isDesktop = useMediaQuery(breakPoints.desktop);
  const isFullWidth = useMediaQuery(sidebarHide);

  const dispatch = useDispatch();
  // const open = useSelector((state) => state.ui.sidebarOpen);

  const handleToggleSidebar = () => dispatch(toggleSidebar());

  return (
    <Box
      position={"fixed"}
      zIndex={100}
      width="100%"
      height={isDesktop ? "80px" : "60px"}
      bgcolor="grey.10"
      display="flex"
      alignItems="center"
      borderBottom="1px solid rgba(0, 0, 0, 0.20)"
    >
      <Grid width="100%" container alignItems="center">
        <Grid item xs={4} display="flex" sx={{ flex: 1 }}>
          <Box
            height={isDesktop ? "59px" : "45px"}
            width={isDesktop ? "320px" : "280px"}
          >
            <img
              className="w-full h-full object-contain"
              src="/images/logo.png"
              alt=""
            />
          </Box>
        </Grid>

        <Grid
          item
          xs={4}
          display="flex"
          justifyContent="center"
          sx={{ flex: 1 }}
        >
          <SearchBar showHistory={true} isDesktop={isDesktop} />
        </Grid>

        <Grid
          item
          xs={4}
          display="flex"
          justifyContent="flex-end"
          sx={{ flex: 1 }}
          gap={"16px"}
        >
          {!isFullWidth ? (
            <Box
              display="flex"
              justifyContent="flex-end"
              sx={{ flex: 1 }}
              gap={"16px"}
              pr="60px"
            >
              <Box display="flex" alignItems="center">
                <IconButton>
                  <VscBellDot size="24px" color="black" />
                </IconButton>
              </Box>

              <Box display="flex" alignItems="center" gap={"10px"}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  width={"40px"}
                  height={"40px"}
                  borderRadius={"100%"}
                  bgcolor="blue.300"
                >
                  <AiOutlineUser size="24px" color="white" />
                </Box>

                <Box>
                  <Typography variant="body1" color="black" fontWeight={600}>
                    Zeeshan N
                  </Typography>
                  <Typography variant="subtitle2" color="grey.20" pt="3px">
                    Admin
                  </Typography>
                </Box>

                <IconButton>
                  <TbChevronDown size="24px" />
                </IconButton>
              </Box>
            </Box>
          ) : (
            <IconButton className="!mr-14">
              <TbMenu2 onClick={handleToggleSidebar} size="24px" />
            </IconButton>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
