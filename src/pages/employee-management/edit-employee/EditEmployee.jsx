import { Box, Typography } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { IoChevronBackOutline } from "../../../shared/icons/index";
import { useEffect } from "react";
import {
  useUpdateAdminEmployeeMutation,
  useGetAdminEmployeesQuery,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";
import ButtonBlue from "../../../components/ui/ButtonBlue";
import ButtonWhite from "../../../components/ui/ButtonWhite";
import { Delay } from "../../../components/shared/Loaders";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import FormInputField from "../../../components/ui/FormInputField";

const editEmployeeSchema = yup.object().shape({
  firstName: yup.string().required("First name is required").min(2, "At least 2 characters"),
  lastName: yup.string().required("Last name is required").min(2, "At least 2 characters"),
  email: yup.string().required("Email is required").email("Enter a valid email"),
  phoneNum: yup.string().required("Phone is required"),
  roleId: yup.number().typeError("Role ID must be a number").required("Role ID is required"),
});

const defaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNum: "",
  roleId: "",
};

export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading: isFetching } = useGetAdminEmployeesQuery(undefined, { skip: !id });
  const adminEmployees = data?.data?.adminEmployees ?? [];
  const employee = adminEmployees.find((e) => String(e.id) === String(id));

  const [updateEmployee, { isLoading }] = useUpdateAdminEmployeeMutation();
  const { success, error } = useToaster();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(editEmployeeSchema),
    defaultValues,
  });

  const onSubmit = async (data) => {
    const body = {
      employeeId: Number(id),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNum: data.phoneNum,
      roleId: Number(data.roleId),
    };
    const res = await updateEmployee(body);
    if (res?.data?.status === "1") {
      success(res?.data?.message ?? "Employee updated.");
      navigate(-1);
    } else {
      error(res?.error?.data?.message ?? res?.data?.message ?? "Failed to update employee.");
    }
  };

  useEffect(() => {
    if (employee) {
      reset({
        firstName: employee.firstName ?? "",
        lastName: employee.lastName ?? "",
        email: employee.email ?? "",
        phoneNum: employee.phoneNum ?? "",
        roleId: employee.roleId ?? "",
      });
    }
  }, [employee, reset]);

  if (isFetching) return <Delay />;
  if (!employee) {
    return (
      <Box className="w-full">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="flex items-center justify-center p-1 rounded-lg hover:bg-grey50">
          <IoChevronBackOutline size={24} />
        </button>
        <Typography>Employee not found.</Typography>
      </Box>
    );
  }

  return (
    <Box className="w-full">
      <Box className="flex items-center gap-x-5 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex items-center justify-center p-1 rounded-lg hover:bg-grey50 transition-colors"
        >
          <IoChevronBackOutline size={24} />
        </button>
        <Typography variant="h4" sx={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "Switzer, sans-serif", color: "#101828", letterSpacing: "-0.02em" }}>
          Edit Employee
        </Typography>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Box className="w-full grid grid-cols-2 gap-5 !pt-10">
          <Box className="bg-white rounded-xl !p-7 !space-y-5">
            <FormInputField title="First Name" label="First Name" placeholder="First Name" name="firstName" register={register} error={errors.firstName} />
            <FormInputField title="Last Name" label="Last Name" placeholder="Last Name" name="lastName" register={register} error={errors.lastName} />
            <FormInputField title="Phone Number" label="Phone Number" placeholder="Phone Number" name="phoneNum" register={register} error={errors.phoneNum} />
          </Box>
          <Box className="bg-white rounded-xl !p-7 !space-y-5">
            <FormInputField title="Email" label="Email" type="email" placeholder="Email" name="email" register={register} error={errors.email} />
            <FormInputField title="Role ID" label="Role ID" placeholder="e.g. 6" name="roleId" type="number" register={register} error={errors.roleId} />
          </Box>
        </Box>
        <Box className="w-full flex justify-end gap-5 !pt-10 !pr-5">
          <ButtonWhite text="Cancel" onClick={() => navigate(-1)} size="medium" />
          <ButtonBlue text="Update" type="submit" isLoading={isLoading} size="medium" />
        </Box>
      </form>
    </Box>
  );
}
