"use client";

import { useState, type ReactNode } from "react";
import { Bell, Plus, Zap } from "lucide-react";
import { SampleModeBanner } from "@/components/shell/SampleModeBanner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Pill";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stat } from "@/components/ui/Stat";
import { TagPill } from "@/components/ui/TagPill";
import { useToast } from "@/components/ui/Toast";
import type { Range } from "@/lib/contract";

const SWATCHES: [string, string][] = [
  ["canvas", "bg-canvas"],
  ["surface", "bg-surface"],
  ["ink", "bg-ink"],
  ["ink secondary", "bg-ink-secondary"],
  ["ink tertiary", "bg-ink-tertiary"],
  ["brand", "bg-brand"],
  ["severity green", "bg-sev-green"],
  ["severity amber", "bg-sev-amber"],
  ["severity red", "bg-sev-red"],
  ["electricity", "bg-res-electricity"],
  ["water", "bg-res-water"],
  ["waste", "bg-res-waste"],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-6">
      <h2 className="text-section">{title}</h2>
      {children}
    </Card>
  );
}

export default function DesignPage() {
  const toast = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [range, setRange] = useState<Range>(7);
  const [replay, setReplay] = useState(0);

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Design system"
        description="Every primitive in one place, for visual review."
      />

      <Section title="Colour">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-2">
              <div
                className={`h-12 rounded-control border border-hairline ${cls}`}
              />
              <span className="text-caption text-ink-secondary">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="flex flex-col gap-3">
          <span className="text-display">60 Headline</span>
          <span className="text-title">32 Page title</span>
          <span className="text-section">20 Section title</span>
          <span className="text-body">
            15/24 Body text for explanations and controls.
          </span>
          <span className="text-caption text-ink-secondary">
            12 Caption for labels and tags
          </span>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={Plus}>
            Primary
          </Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" loading>
            Loading
          </Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button variant="secondary" icon={Bell} aria-label="Notifications" />
        </div>
      </Section>

      <Section title="Pills and tags">
        <div className="flex flex-wrap items-center gap-3">
          <Pill tone="green">Low</Pill>
          <Pill tone="amber">Medium</Pill>
          <Pill tone="red">High</Pill>
          <Pill tone="electricity">Electricity</Pill>
          <Pill tone="water">Water</Pill>
          <Pill tone="waste">Waste</Pill>
          <Pill icon={Zap}>Neutral</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TagPill tag="verified" />
          <TagPill tag="measured" />
          <TagPill tag="estimated" />
          <TagPill tag="projected" />
        </div>
      </Section>

      <Section title="Segmented">
        <Segmented
          ariaLabel="Range"
          value={range}
          onChange={setRange}
          options={[
            { value: 7, label: "7 days" },
            { value: 30, label: "30 days" },
          ]}
        />
      </Section>

      <Section title="Stat">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <Stat
            key={`a-${replay}`}
            label="Wasted this week"
            prefix="₹"
            value={21400}
            unit="avoidable"
            tag="estimated"
          />
          <Stat
            key={`b-${replay}`}
            label="Saved so far"
            prefix="₹"
            value={3168}
            unit="verified"
            tag="verified"
          />
          <Stat
            label="Campus Impact Score"
            value={58}
            unit="/ 100"
            tag="measured"
          />
          <Stat label="Loading state" value={null} loading />
        </div>
        <div>
          <Button size="sm" onClick={() => setReplay((n) => n + 1)}>
            Replay count-up
          </Button>
        </div>
      </Section>

      <Section title="Loading, empty and error">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="rounded-control border border-hairline">
          <EmptyState
            title="Everything looks efficient"
            description="No open anomalies for this range."
          />
        </div>
        <div className="rounded-control border border-hairline">
          <ErrorState onRetry={() => toast("Retrying…")} />
        </div>
        <SampleModeBanner force />
      </Section>

      <Section title="Drawer and toast">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setDrawerOpen(true)}>Open drawer</Button>
          <Button onClick={() => toast("Saved")}>Neutral toast</Button>
          <Button onClick={() => toast("Ticket created", "success")}>
            Success toast
          </Button>
          <Button onClick={() => toast("Could not reach the server", "error")}>
            Error toast
          </Button>
        </div>
      </Section>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Ticket details"
        footer={
          <Button variant="primary" onClick={() => setDrawerOpen(false)}>
            Done
          </Button>
        }
      >
        <p className="text-body text-ink-secondary">
          Side panel for a selected ticket. Press Escape or click outside to
          close.
        </p>
      </Drawer>
    </div>
  );
}
