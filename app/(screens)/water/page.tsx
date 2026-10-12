import { Droplets } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export const metadata = { title: "Water" };

export default function WaterPage() {
  return (
    <PlaceholderPage
      title="Water"
      description="Night-flow leak detection and tank overflow checks for every block."
      preview="The flow chart with its shaded night window, tank levels and per-capita bars will appear here."
      icon={Droplets}
    />
  );
}
