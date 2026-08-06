import { Box, Typography, Checkbox, Collapse } from "@mui/material";
import { useGetServiceWitPreferencesQuery } from "../../store/services/api";
import { MiniLoader } from "../../components/shared/Loaders";
import { formatGbp } from "../../utils/formatGbp";

export default function ConfigureServiceOptions({ serviceId }) {
  const { data, isLoading } = useGetServiceWitPreferencesQuery(serviceId, {
    skip: !serviceId,
  });

  // const [checkedItems, setCheckedItems] = useState({});

  // const handleCheckboxChange = (catId, subName) => {
  //   setCheckedItems((prev) => ({
  //     ...prev,
  //     [`${catId}-${subName}`]: !prev[`${catId}-${subName}`],
  //   }));
  // };

  return isLoading ? (
    <Box className="flex items-center justify-center h-24">
      <MiniLoader />
    </Box>
  ) : (
    <Box className="bg-white rounded-xl grid lg:grid-cols-2 gap-4 !p-5">
      <Box>
        {/* Header */}
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            fontSize: "16px",
            color: "#101828",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Available Preference
        </Typography>

        <Collapse in={true}>
          <Box className="!py-5">
            {/* Tops Section */}

            {serviceId ? (
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {data?.data?.preferencesData.map((item, idx) => (
                  <Box
                    key={item?.id ?? item?.preferenceTypeId ?? idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Checkbox
                      checked={
                        item?.status === undefined ? true : Boolean(item.status)
                      }
                      size="medium"
                      disabled
                      sx={{
                        color: "black",
                        "&.Mui-checked": { color: "blue.100" },
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "18px",
                        color: "#374151",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {item?.name || item?.preferenceType?.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <div className="flex items-center justify-center h-20 font-Inter">
                Select Service
              </div>
            )}
          </Box>
        </Collapse>
      </Box>

      <Box className="lg:!pl-5 lg:border-l border-gray-300">
        {/* Header */}

        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            fontSize: "16px",
            color: "#101828",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Applicable Item Types
        </Typography>

        {/* Content */}
        {serviceId ? (
          <Collapse in={true}>
            <Box sx={{ p: "20px" }}>
              {data?.data?.serviceCategoriesData?.map((serviceCat) => (
                <Box key={serviceCat?.id} sx={{ mb: "24px" }}>
                  {/* Category Title */}
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      fontSize: "18px",
                      color: "#374151",
                      mb: "12px",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {serviceCat?.category?.name}
                  </Typography>

                  {/* SubCategories */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {serviceCat.category.subCategories.map((sub, idx) => (
                      <Box
                        key={sub?.id ?? `${serviceCat?.id}-${sub?.name}-${idx}`}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Checkbox
                          checked={sub.status}
                          // onChange={() =>
                          //   handleCheckboxChange(serviceCat.id, sub.name)
                          // }
                          size="medium"
                          sx={{
                            color: "black",
                            "&.Mui-checked": { color: "blue.100" },
                          }}
                          disabled={true}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "18px",
                            color: "#374151",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {sub.name} – {formatGbp(sub.price)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Collapse>
        ) : (
          <div className="flex items-center justify-center h-32 font-Inter">
            Select Service
          </div>
        )}
      </Box>
    </Box>
  );
}
