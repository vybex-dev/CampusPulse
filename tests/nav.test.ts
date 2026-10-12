import { describe, expect, it } from "vitest";
import { LANDING, NAV_ITEMS, isActive, navFor } from "@/lib/nav";

const ROUTES = [
  "/",
  "/electricity",
  "/water",
  "/waste",
  "/tickets",
  "/simulator",
  "/report",
];

describe("role navigation", () => {
  it("admin sees all seven screens", () => {
    expect(navFor("admin").map((i) => i.href)).toEqual(ROUTES);
  });

  it("staff lands on the Action Queue and has no admin-only screens", () => {
    expect(LANDING.staff).toBe("/tickets");
    const hrefs = navFor("staff").map((i) => i.href);
    expect(hrefs).toContain("/tickets");
    expect(hrefs).not.toContain("/");
    expect(hrefs).not.toContain("/simulator");
  });

  it("student lands on the Waste Lab and sees only Waste Lab and Impact Report", () => {
    expect(LANDING.student).toBe("/waste");
    expect(navFor("student").map((i) => i.href)).toEqual(["/waste", "/report"]);
  });

  it("every nav item and landing target is a real route", () => {
    for (const item of NAV_ITEMS) expect(ROUTES).toContain(item.href);
    for (const href of Object.values(LANDING)) expect(ROUTES).toContain(href);
  });

  it("marks the root active only on an exact match", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/water", "/")).toBe(false);
    expect(isActive("/water", "/water")).toBe(true);
  });
});
