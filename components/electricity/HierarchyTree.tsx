"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Layers,
  DoorOpen,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  MOCK_HIERARCHY,
  type CampusHierarchyNode,
} from "@/lib/mocks";
import { cn } from "@/lib/cn";

interface HierarchyTreeProps {
  selectedMeterId: string;
  onSelectMeter: (meterId: string, nodeName: string, roomCode: string) => void;
}

export function HierarchyTree({
  selectedMeterId,
  onSelectMeter,
}: HierarchyTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    CAMPUS: true,
    "AB-A": true,
    "A-F2": true,
  });

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: CampusHierarchyNode, level = 0) => {
    const isExpanded = expandedNodes[node.id] ?? false;
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = node.meterId === selectedMeterId;

    const Icon =
      node.kind === "campus"
        ? Building2
        : node.kind === "block"
          ? Building2
          : node.kind === "floor"
            ? Layers
            : DoorOpen;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            }
            if (node.meterId) {
              onSelectMeter(node.meterId, node.name, node.code);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (hasChildren) toggleNode(node.id);
              if (node.meterId) onSelectMeter(node.meterId, node.name, node.code);
            }
          }}
          className={cn(
            "group flex cursor-pointer items-center justify-between rounded-control px-2.5 py-1.5 text-body transition-colors",
            isSelected
              ? "bg-brand text-surface font-medium"
              : "text-ink hover:bg-ink/[0.04]",
            level > 0 && "ml-3",
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {hasChildren ? (
              <button
                type="button"
                aria-label={`Toggle ${node.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                className="p-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                )}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}

            <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />

            <span className="truncate text-caption">
              {node.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {node.hasAnomaly && (
              <AlertCircle
                className={cn(
                  "h-3.5 w-3.5",
                  isSelected ? "text-surface" : "text-sev-red",
                )}
                aria-label="Active issue detected"
              />
            )}
            {node.meterId && (
              <span
                className={cn(
                  "font-mono text-[10px]",
                  isSelected ? "text-surface/80" : "text-ink-tertiary",
                )}
              >
                {node.code}
              </span>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col border-l border-hairline pl-1">
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="border-b border-hairline pb-3">
        <h3 className="flex items-center gap-2 text-section text-ink">
          <Zap className="h-4 w-4 text-res-electricity" />
          Meters & Rooms
        </h3>
        <p className="mt-1 text-caption text-ink-secondary">
          Browse campus submeters by building and room.
        </p>
      </div>

      <div className="flex max-h-[720px] flex-col gap-1 overflow-y-auto pr-1">
        {renderNode(MOCK_HIERARCHY)}
      </div>
    </Card>
  );
}
