import { Home, MessageCircle, Settings } from "lucide-react";
import { createRoot } from "react-dom/client";
import BottomNavBar from "@/components/ui/bottom-nav-bar";

const items = [
  { label: "Dashboard", icon: Home, href: "/dashboard" },
  { label: "Complaints", icon: MessageCircle, href: "/complaints" },
  { label: "Settings", icon: Settings, href: "/settings" },
] as const;

/** React owns only the navigation host; the existing pages keep their DOM lifecycle. */
export function mountBottomNavigation(host: HTMLElement): (path: string) => void {
  const root = createRoot(host);
  return (path) => {
    root.render(
      <BottomNavBar
        items={items}
        activeIndex={Math.max(
          0,
          items.findIndex((item) => item.href === path),
        )}
        stickyBottom
      />,
    );
  };
}
