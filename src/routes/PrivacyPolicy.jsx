import { Button, PageHeader } from "../design-system";
import { DirectoryFormCard } from "../pages/directory-table/directoryTable";

const PUBLIC_PRIVACY_URL = "https://www.justdrycleans.com/privacy-policy";

export default function PrivacyPolicy() {
  return (
    <div>
      <PageHeader
        title="Privacy Policy"
        description="How Just Dry handles personal data for customers, shops, and admin operators."
        actions={
          <Button
            onClick={() => window.open(PUBLIC_PRIVACY_URL, "_blank", "noopener,noreferrer")}
          >
            Open public policy
          </Button>
        }
      />
      <DirectoryFormCard
        title="Public policy"
        hint="The customer-facing Privacy Policy is published on the website. Admin sessions process the same order, account, and operational records, plus staff access logs needed to run the platform."
      >
        <p style={{ margin: 0, lineHeight: 1.6, color: "#5c6673", fontSize: 13.5 }}>
          Open the public document for the full legal text. This admin screen does not host a
          separate policy copy.
        </p>
      </DirectoryFormCard>
    </div>
  );
}
