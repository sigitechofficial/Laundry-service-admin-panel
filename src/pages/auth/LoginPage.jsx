import { Box, Checkbox, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import ButtonBlue from "../../components/ui/ButtonBlue";
import ButtonWhite from "../../components/ui/ButtonWhite";
import {
  useAdminLoginMutation,
  useZoneAdminLoginMutation,
} from "../../store/services/api";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { FALLBACK_DV_TOKEN, loginSchema } from "./constant";
import useToaster from "../../components/ui/Toaster";
import { useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "../../shared/icons/index";
import { setLoginStatus } from "../../hooks/useAuth";
import { requestDeviceToken } from "../../utilities/requestFCMToken";
import {
  persistAdminLoginSession,
  persistZoneAdminLoginSession,
} from "../../utilities/authStorage";

export default function LoginPage() {
  const { success, error } = useToaster();
  const [seePassword, setSeePassword] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");
  const [adminLogin, { isLoading: adminLoginLoading }] =
    useAdminLoginMutation();
  const [zoneAdminLogin, { isLoading: zoneAdminLoginLoading }] =
    useZoneAdminLoginMutation();
  const isLoading =
    role === "manager" ? zoneAdminLoginLoading : adminLoginLoading;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: localStorage.getItem("rememberedEmail") || "",
      password: "",
      rememberMe: !!localStorage.getItem("rememberedEmail"),
    },
  });

  const formValues = watch();

  const handleLogin = (role) => {
    navigate(`/auth/login?role=${role}`);
  };

  const handleSubmitData = async (data) => {
    try {
      if (data.rememberMe) {
        localStorage.setItem("rememberedEmail", data.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      const rawDvToken = await requestDeviceToken();
      const dvToken =
        rawDvToken && String(rawDvToken).trim()
          ? String(rawDvToken).trim()
          : FALLBACK_DV_TOKEN;

      let res;
      if (role === "manager") {
        res = await zoneAdminLogin({
          email: data.email,
          password: data.password,
          dvToken,
        }).unwrap();
      } else {
        res = await adminLogin({
          email: data.email,
          password: data.password,
          dvToken,
        }).unwrap();
      }

      if (res.status === "1") {
        const payload = res.data;
        if (role === "manager") {
          persistZoneAdminLoginSession(payload);
        } else {
          persistAdminLoginSession(payload);
        }
        setLoginStatus(true);
        success("Login successful 🎉");
        navigate("/");
      } else {
        error("Invalid credentials, please try again.");
      }
    } catch (err) {
      error(err?.data?.message || "Something went wrong, please try again.");
    }
  };

  return (
    <Box className="w-full h-full min-h-screen bg-blue100 flex justify-center items-center relative overflow-hidden">
      <Box
        className={`w-full  ${role ? "max-w-[850px]" : "max-w-[939px]"
          } min-h-[500px] bg-white rounded-xl flex flex-col items-center !py-9 gap-y-12 transition-all duration-300 relative z-10`}
      >
        <Box pt={"8px"}>
          <img
            className="h-16 2xl:h-24 mx-auto"
            src="/images/logo1.png"
            alt="logo"
          />
        </Box>

        {!role ? (
          <div className="flex w-full justify-center gap-x-16">
            <Box
              onClick={() => handleLogin("admin")}
              className="bg-grey100 rounded-xl w-full max-w-[280px] 2xl:max-w-[320px] flex flex-col items-center gap-y-5 !py-10 cursor-pointer"
            >
              <img src="/images/admin.png" alt="" />

              <Typography variant="h5">Login as Admin</Typography>
            </Box>
            <Box
              onClick={() => handleLogin("manager")}
              className="bg-grey100 rounded-xl  w-full max-w-[280px] 2xl:max-w-[320px] flex flex-col items-center gap-y-5 !py-10 cursor-pointer"
            >
              <img src="/images/zoneAdmin.png" alt="" />

              <Typography variant="h5">Login as Zone manager </Typography>
            </Box>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(handleSubmitData)}
            className="w-full !px-24 font-Inter !space-y-7"
          >
            {/* Email */}
            <div className="flex flex-col gap-y-3">
              <label htmlFor="email" className="text-grey40">
                Email
              </label>

              <input
                {...register("email")}
                type="email"
                placeholder="Email"
                className="outline-none border border-grey30 rounded-lg !px-5 h-[52px] font-medium"
              />

              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-y-3">
              <label htmlFor="password" className="text-grey40">
                Password
              </label>

              <Box className="relative w-full">
                <input
                  {...register("password")}
                  type={seePassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full outline-none border border-grey30 rounded-lg !px-5 h-[52px] font-medium"
                />

                <button
                  type="button"
                  onClick={() => setSeePassword(!seePassword)}
                  className="absolute right-5 bottom-4 cursor-pointer"
                >
                  {seePassword ? (
                    <AiOutlineEyeInvisible size={"20px"} />
                  ) : (
                    <AiOutlineEye size={"20px"} />
                  )}
                </button>
              </Box>

              {errors.password && (
                <p className="text-red-500 text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <Checkbox
                {...register("rememberMe")}
                size="medium"
                sx={{
                  color: "black",
                  "&.Mui-checked": { color: "blue.100" },
                }}
                checked={formValues.rememberMe}
              />

              <Typography variant="body1">Remember Me</Typography>
            </div>

            {/* Buttons */}
            <Box className="flex items-center justify-end gap-x-5">
              <ButtonWhite
                text="Cancel"
                width={"150px"}
                onClick={() => navigate("/auth/login")}
              />

              <ButtonBlue
                type="submit"
                text="Login"
                width={"200px"}
                isLoading={isLoading}
              />
            </Box>
          </form>
        )}
      </Box>

      <div className="absolute top-1/6 w-[500px] h-[800px] rotate-45 bg-blue50/20 shadow-particle -right-[230px] z-0"></div>

      <div className="absolute top-0 -left-[500px] w-[800px] h-[500px] rotate-45 bg-blue50/20 shadow-particle z-0"></div>

      <div className="absolute -bottom-[400px] left-[250px] w-[500px] h-[500px] rotate-[50deg] bg-blue50/20 shadow-particle z-0"></div>
    </Box>
  );
}
