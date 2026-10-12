import type { Role } from "@/lib/contract";

export type NavIcon =
  | "dashboard"
  | "electricity"
  | "water"
  | "waste"
  | "tickets"
  | "simulator"
  | "report";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  roles: readonly Role[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/dashboard",
    label: "Command Center",
    icon: "dashboard",
    roles: ["admin"],
  },
  {
    href: "/electricity",
    label: "Electricity",
    icon: "electricity",
    roles: ["admin", "staff"],
  },
  { href: "/water", label: "Water", icon: "water", roles: ["admin", "staff"] },
  {
    href: "/waste",
    label: "Waste Lab",
    icon: "waste",
    roles: ["admin", "staff", "student"],
  },
  {
    href: "/tickets",
    label: "Action Queue",
    icon: "tickets",
    roles: ["admin", "staff"],
  },
  {
    href: "/simulator",
    label: "What-If Simulator",
    icon: "simulator",
    roles: ["admin"],
  },
  {
    href: "/report",
    label: "Impact Report",
    icon: "report",
    roles: ["admin", "student"],
  },
];

export const LANDING: Record<Role, string> = {
  admin: "/dashboard",
  staff: "/tickets",
  student: "/waste",
};

export function navFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
