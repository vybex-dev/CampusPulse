import { Zap } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export const metadata = { title: "Electricity" };

export default function ElectricityPage() {
  return (
    <PlaceholderPage
      title="Electricity"
      description="Hourly load against what each room should draw, given its timetable."
      preview="A hierarchy tree, the usage chart with expected band and the timetable strip will appear here."
      icon={Zap}
    />
  );
}
