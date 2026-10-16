import { PoweredByVybex } from "@/components/ui/PoweredByVybex";

/** Slim footer for the in-app screens. Hidden when printing the report. */
export function AppFooter() {
  return (
    <footer className="no-print border-t border-hairline">
      <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-2 px-page py-5 text-caption text-ink-tertiary sm:flex-row">
        <p>
          © {new Date().getFullYear()} CampusPulse. Released under the MIT License.
          Demo data is simulated.
        </p>
        <PoweredByVybex />
      </div>
    </footer>
  );
}
