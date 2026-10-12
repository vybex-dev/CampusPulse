import { FileText } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export const metadata = { title: "Impact Report" };

export default function ImpactReportPage() {
  return (
    <PlaceholderPage
      title="Impact Report"
      description="Money, carbon, native units and actions, combined in one score."
      preview="The Campus Impact Score, verified savings and the method footer will appear here."
      icon={FileText}
    />
  );
}
