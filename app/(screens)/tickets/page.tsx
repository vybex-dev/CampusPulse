import { Ticket } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export const metadata = { title: "Action Queue" };

export default function ActionQueuePage() {
  return (
    <PlaceholderPage
      title="Action Queue"
      description="Every finding becomes a ticket with an owner, a status and a daily cost."
      preview="A five-column ticket board and the verification card will appear here."
      icon={Ticket}
    />
  );
}
