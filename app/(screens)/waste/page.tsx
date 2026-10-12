import { Recycle } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export const metadata = { title: "Waste Lab" };

export default function WasteLabPage() {
  return (
    <PlaceholderPage
      title="Waste Lab"
      description="Photograph or upload an item to find out what it is and which bin it belongs in."
      preview="Take photo, Upload image, the result card and the block leaderboard will appear here."
      icon={Recycle}
    />
  );
}
