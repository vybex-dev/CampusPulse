import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

interface PlaceholderPageProps {
  title: string;
  description: string;
  preview: string;
  icon: LucideIcon;
}

export function PlaceholderPage({
  title,
  description,
  preview,
  icon,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-section">
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState icon={icon} title="Coming soon" description={preview} />
      </Card>
    </div>
  );
}
