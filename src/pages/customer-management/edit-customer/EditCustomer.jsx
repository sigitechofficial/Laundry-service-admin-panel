import { Box, Typography } from "@mui/material";
import Layout from "../../../components/shared/Layout";
import InputFieldBordered from "../../../components/ui/InputFieldBordered";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import {
  useEditCustomerMutation,
  useGetAllCustomersQuery,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";
import ButtonBlue from "../../../components/ui/ButtonBlue";
import ButtonWhite from "../../../components/ui/ButtonWhite";
import { Delay } from "../../../components/shared/Loaders";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import { editCustomerDefaultValues, editCustomerSchema } from "../constants";
import FormInputField from "../../../components/ui/FormInputField";

export default function EditCustomer() {
  const { id } = useParams();

  const customer = useSelector((state) =>
    state?.apiData?.customers?.find((item) => item.id == id)
  );

  const { isLoading: isFetchingCustomers } = useGetAllCustomersQuery(
    undefined,
    {
      skip: !id || customer?.id,
    }
  );

  const [updateCustomer, { isLoading }] = useEditCustomerMutation();

  const { success, error } = useToaster();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(editCustomerSchema),
    defaultValues: editCustomerDefaultValues,
  });

  const onSubmit = async (data) => {
    const body = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNum: data.phoneNum,
      status: data.status,
      password: data.password,
      confirmPassword: data.confirmPassword,
    };

    let res = await updateCustomer({ id, body });

    if (res?.data?.status === "1") {
      success(res?.data?.message);
      // window.history.back();
    } else {
      error(res?.data?.error || "Failed to update customer");
    }
  };

  useEffect(() => {
    if (customer) {
      reset({
        firstName: customer?.firstName || "",
        lastName: customer?.lastName || "",
        email: customer?.email || "",
        phoneNum: customer?.phoneNum || "",
        password: customer?.password || "",
        confirmPassword: customer?.confirmPassword || "",
        status: customer?.status || "",
      });
    }
  }, [customer, reset]);

  return (
    <Layout
      content={
        isFetchingCustomers ? (
          <Delay />
        ) : (
          <Box className="w-full">
            <Typography>Customer Update</Typography>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Box className="w-full grid grid-cols-2 gap-5 !pt-10">
                <Box className="bg-white rounded-xl !p-7 !space-y-5">
                  <FormInputField
                    title="First Name"
                    label="First Name"
                    placeholder="First Name"
                    name="firstName"
                    register={register}
                    error={errors.firstName}
                  />

                  <FormInputField
                    title="Last Name"
                    label="Last Name"
                    placeholder="Last Name"
                    name="lastName"
                    register={register}
                    error={errors.lastName}
                  />

                  <FormInputField
                    title="Phone Number"
                    label="Phone Number"
                    placeholder="Phone Number"
                    name="phoneNum"
                    register={register}
                    error={errors.phoneNum}
                  />
                </Box>

                <Box className="bg-white rounded-xl !p-7 !space-y-5">
                  <FormInputField
                    title="Email"
                    label="Email"
                    type="email"
                    placeholder="Email"
                    name="email"
                    register={register}
                    error={errors.email}
                  />

                  <FormInputField
                    title="Password"
                    label="Password"
                    type="password"
                    placeholder="Password"
                    name="password"
                    register={register}
                    error={errors.password}
                  />

                  <FormInputField
                    title="Confirm Password"
                    label="Confirm Password"
                    type="password"
                    placeholder="Confirm Password"
                    name="confirmPassword"
                    register={register}
                    error={errors.confirmPassword}
                  />
                </Box>
              </Box>

              <Box className="w-full flex justify-end gap-5 !pt-10 !pr-5">
                <ButtonWhite
                  text="cancel"
                  onClick={() => window.history.back()}
                />

                <ButtonBlue text="update" type="submit" isLoading={isLoading} />
              </Box>
            </form>
          </Box>
        )
      }
    />
  );
}
