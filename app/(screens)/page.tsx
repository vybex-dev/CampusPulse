import { LayoutDashboard } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export const metadata = { title: "Command Center" };

export default function CommandCenterPage() {
  return (
    <PlaceholderPage
      title="Command Center"
      description="See where the campus wastes electricity, water and waste-handling effort this week."
      preview="Four headline cards, the six-block campus map and a live alert feed will appear here."
      icon={LayoutDashboard}
    />
  );
}
