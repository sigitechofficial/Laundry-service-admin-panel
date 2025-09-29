import { useSelector, useDispatch } from "react-redux";
import { Box, IconButton } from "@mui/material";
import { FiSearch, TbX } from "../../shared/icons/index";
import {
  setSearchValue,
  clearSearch,
  addToHistory,
} from "../../store/slices/searchSlice";

export default function SearchBar({ isDesktop }) {
  const dispatch = useDispatch();
  const { searchValue } = useSelector((state) => state.search);

  const handleSearchChange = (event) => {
    dispatch(setSearchValue(event.target.value));
  };

  const handleSearchSubmit = (event) => {
    if (event.key === "Enter" && searchValue.trim()) {
      dispatch(addToHistory(searchValue.trim()));
      console.log("Searching for:", searchValue);
    }
  };

  const handleClearSearch = () => {
    dispatch(clearSearch());
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      px={"16px"}
      height={isDesktop ? "52px" : "45px"}
      width="360px"
      borderRadius="4px"
      bgcolor="grey.60"
      fontFamily="inter"
    >
      <span>
        <FiSearch size={"22px"} />
      </span>
      <input
        className="w-full h-full !pl-3 outline-none"
        type="search"
        placeholder="Search..."
        value={searchValue}
        onChange={handleSearchChange}
        onKeyDown={handleSearchSubmit}
      />
      {searchValue && (
        <IconButton onClick={handleClearSearch}>
          <TbX size={"16px"} />
        </IconButton>
      )}
    </Box>
  );
}
