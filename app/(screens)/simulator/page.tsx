import { SlidersHorizontal } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export const metadata = { title: "What-If Simulator" };

export default function SimulatorPage() {
  return (
    <PlaceholderPage
      title="What-If Simulator"
      description="Drag the sliders to see the projected score and monthly savings."
      preview="Four sliders and a live projected score gauge will appear here."
      icon={SlidersHorizontal}
    />
  );
}
