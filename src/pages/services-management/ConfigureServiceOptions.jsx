import { useGetServiceWitPreferencesQuery } from "../../store/services/api";
import { formatAmount } from "../../utilities/formatters";
import { QueryState } from "./QueryState";
import {
  DirectoryDotPill,
  DirectoryFormCard,
  DirectoryFormGrid,
} from "../directory-table/directoryTable";

const ROW = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minHeight: 40,
};

const EMPTY = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 80,
  color: "#5c6673",
  fontSize: 13.5,
};

export default function ConfigureServiceOptions({ serviceId }) {
  const { data, isLoading, isError, error, refetch } = useGetServiceWitPreferencesQuery(
    serviceId,
    {
      skip: !serviceId,
    }
  );

  if (isLoading || isError) {
    return (
      <QueryState
        loading={isLoading}
        error={error || isError}
        onRetry={refetch}
        errorLabel="Could not load service configuration. Please try again."
      />
    );
  }

  return (
    <DirectoryFormGrid>
      <DirectoryFormCard title="Available preferences">
        {serviceId ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(data?.data?.preferencesData || []).map((item, idx) => {
              const active =
                item?.status === undefined ? true : Boolean(item.status);
              return (
                <label key={item?.id ?? item?.preferenceTypeId ?? idx} style={ROW}>
                  <input type="checkbox" checked={active} disabled readOnly />
                  <span>{item?.name || item?.preferenceType?.name}</span>
                </label>
              );
            })}
            {(data?.data?.preferencesData || []).length === 0 ? (
              <div style={EMPTY}>No preferences linked</div>
            ) : null}
          </div>
        ) : (
          <div style={EMPTY}>Select a service</div>
        )}
      </DirectoryFormCard>

      <DirectoryFormCard title="Applicable item types">
        {serviceId ? (
          <div>
            {(data?.data?.serviceCategoriesData || []).length === 0 ? (
              <div style={EMPTY}>No item types linked</div>
            ) : null}
            {(data?.data?.serviceCategoriesData || []).map((serviceCat) => (
              <div key={serviceCat?.id} style={{ marginBottom: 16 }}>
                <strong style={{ display: "block", marginBottom: 8, color: "#0e131c" }}>
                  {serviceCat?.category?.name}
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(serviceCat?.category?.subCategories || []).map((sub, idx) => (
                    <label
                      key={sub?.id ?? `${serviceCat?.id}-${sub?.name}-${idx}`}
                      style={ROW}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(sub.status)}
                        disabled
                        readOnly
                      />
                      <span>
                        {sub.name} – {formatAmount(sub.price, null, { applyDefault: true })}
                      </span>
                      <DirectoryDotPill tone={sub.status ? "success" : "neutral"}>
                        {sub.status ? "Active" : "Inactive"}
                      </DirectoryDotPill>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...EMPTY, minHeight: 128 }}>Select a service</div>
        )}
      </DirectoryFormCard>
    </DirectoryFormGrid>
  );
}
