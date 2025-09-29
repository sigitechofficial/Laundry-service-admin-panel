import { Box, Typography } from "@mui/material";
import { FiSearch } from "../../shared/icons/index";
export default function Search({
  onChange,
  bgColor = "white",
  border = "1px solid #D0D5DD",
  boxShadow = "0px 1px 2px rgba(16, 24, 40, 0.08)",
}) {
  return (
    <Box
      onChange={onChange}
      // width="320px"
      // height="44px"
      borderRadius="8px"
      border={border}
      p="10px 14px"
      display={"flex"}
      alignItems={"center"}
      gap={"10px"}
      fontFamily="Inter"
      bgcolor={bgColor}
      boxShadow={boxShadow}
    >
      <Typography component={"span"} color="grey.400">
        <FiSearch size={"22px"} />
      </Typography>
      <input
        className="w-full h-full border-none outline-none bg-transparent"
        type="search"
        placeholder="Search"
      />
    </Box>
  );
}
