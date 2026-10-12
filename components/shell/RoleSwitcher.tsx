"use client";

import { useRouter } from "next/navigation";
import { Segmented } from "@/components/ui/Segmented";
import type { Role } from "@/lib/contract";
import { LANDING } from "@/lib/nav";
import { useUIStore } from "@/lib/store";

const OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "student", label: "Student" },
] as const satisfies readonly { value: Role; label: string }[];

export function RoleSwitcher() {
  const router = useRouter();
  const role = useUIStore((s) => s.role);
  const setRole = useUIStore((s) => s.setRole);

  return (
    <Segmented
      ariaLabel="Switch role"
      options={OPTIONS}
      value={role}
      onChange={(next) => {
        setRole(next);
        router.push(LANDING[next]);
      }}
    />
  );
}
