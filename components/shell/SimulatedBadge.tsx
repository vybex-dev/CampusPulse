import { FlaskConical } from "lucide-react";
import { Pill } from "@/components/ui/Pill";

export function SimulatedBadge() {
  return (
    <Pill icon={FlaskConical} className="border border-hairline bg-surface">
      Simulated data
    </Pill>
  );
}
