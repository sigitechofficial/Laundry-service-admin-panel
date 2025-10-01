import { createSlice } from "@reduxjs/toolkit";
import { api } from "../services/api";
import { INITIAL_STATE_API } from "../slices/constants";

const apiDataSlice = createSlice({
  name: "apiData",
  initialState: INITIAL_STATE_API,
  extraReducers: (builder) => {
    builder.addMatcher(
      api.endpoints.getAllServices.matchFulfilled,
      (state, { payload }) => {
        state.services = payload.data.services;
      }
    );

    builder.addMatcher(
      api.endpoints.addService.matchFulfilled,
      (state, { payload }) => {
        if (payload?.data) {
          state.services.push(payload.data);
        }
      }
    );

    builder.addMatcher(
      api.endpoints.editService.matchFulfilled,
      (state, { meta }) => {
        const { id, body } = meta.arg.originalArgs;

        if (id) {
          state.services = state.services.map((service) =>
            service.id === id
              ? {
                  ...service,
                  name: body.get?.("name") ?? service.name,
                  description: body.get?.("description") ?? service.description,
                  image: body.get?.("serviceImg") ?? service.image,
                }
              : service
          );
        }
      }
    );

    builder.addMatcher(
      api.endpoints.deleteService.matchFulfilled,
      (state, { meta }) => {
        const deletedId = meta.arg.originalArgs;

        state.services = state.services.filter(
          (service) => service.id !== deletedId
        );
      }
    );

    builder.addMatcher(
      api.endpoints.getPreferences.matchFulfilled,
      (state, { payload }) => {
        state.preferences = payload.data;
      }
    );

    builder.addMatcher(
      api.endpoints.addPreference.matchFulfilled,
      (state, { payload }) => {
        state.preferences.push(payload.data.createPreferenceType);
      }
    );

    builder.addMatcher(
      api.endpoints.deletePreference.matchFulfilled,
      (state, { meta }) => {
        const deletedId = meta.arg.originalArgs;

        state.preferences = state.preferences.filter(
          (pref) => pref.id !== deletedId
        );
      }
    );

    builder.addMatcher(
      api.endpoints.editPreferenceType.matchFulfilled,
      (state, { meta }) => {
        const { id, name } = meta.arg.originalArgs;

        state.preferences = state.preferences.map((pref) => {
          return pref.id === id
            ? {
                ...pref,
                name,
              }
            : pref;
        });
      }
    );

    builder.addMatcher(
      api.endpoints.addPreferenceValue.matchFulfilled,
      (state, { payload, meta }) => {
        const prefId = meta.arg.originalArgs.preferenceTypeId;
        const newValue = payload?.data?.createdValues?.[0];

        if (!prefId || !newValue) return;

        const pref = state.preferences.find((p) => p.id === prefId);

        if (pref) {
          pref.preferenceValues.push(newValue);
        }
      }
    );

    builder.addMatcher(
      api.endpoints.deletePreferenceValue.matchFulfilled,
      (state, { meta }) => {
        const deletedId = meta.arg.originalArgs;

        state.preferences = state.preferences.map((pref) => {
          pref.preferenceValues = pref.preferenceValues.filter(
            (val) => val.id !== deletedId
          );

          return pref;
        });
      }
    );

    builder.addMatcher(
      api.endpoints.editPreferenceValue.matchFulfilled,
      (state, { meta }) => {
        const editedId = meta.arg.originalArgs.id;
        const updatedValue = meta?.arg.originalArgs.value;

        if (!editedId || !updatedValue) return;

        state.preferences = state.preferences.map((pref) => {
          return {
            ...pref,
            preferenceValues: pref.preferenceValues.map((val) =>
              val.id === editedId ? { ...val, value: updatedValue } : val
            ),
          };
        });
      }
    );

    builder.addMatcher(
      api.endpoints.getCategories.matchFulfilled,
      (state, { payload }) => {
        state.categories = payload.data;
      }
    );

    builder.addMatcher(
      api.endpoints.deleteCategory.matchFulfilled,
      (state, { meta }) => {
        const deletedId = meta.arg.originalArgs;
        state.categories = state.categories.filter(
          (cat) => cat.id !== deletedId
        );
      }
    );

    builder.addMatcher(
      api.endpoints.addCategory.matchFulfilled,
      (state, { payload }) => {
        state.categories.push(payload.data);
      }
    );

    builder.addMatcher(
      api.endpoints.getSubCategories.matchFulfilled,
      (state, { payload }) => {
        state.subCategories = payload.data;
      }
    );

    builder.addMatcher(
      api.endpoints.addSubCategory.matchFulfilled,
      (state, { payload }) => {
        if (payload?.data) {
          state.subCategories.push(payload.data[0]);
        }
      }
    );

    builder.addMatcher(
      api.endpoints.editSubCategory.matchFulfilled,
      (state, { meta }) => {
        const { subCatId, body } = meta.arg.originalArgs;
        const index = state.subCategories.findIndex(
          (item) => item.id === subCatId
        );

        if (index !== -1) {
          state.subCategories[index] = {
            ...state.subCategories[index],
            ...body,
          };
        }
      }
    );

    builder.addMatcher(
      api.endpoints.deleteSubCategory.matchFulfilled,
      (state, { meta }) => {
        const subCatId = meta.arg.originalArgs;
        state.subCategories = state.subCategories.filter(
          (sub) => sub.id !== subCatId
        );
      }
    );

    builder.addMatcher(
      api.endpoints.getAllCustomers.matchFulfilled,
      (state, { payload }) => {
        state.customers = payload.data.customers;
      }
    );
  },
});

export const {
  setServices,
  setPreferences,
  setCategories,
  setSubCategories,
  clearServices,
  clearPreferences,
  clearCategories,
  clearSubCategories,
} = apiDataSlice.actions;

export default apiDataSlice.reducer;
