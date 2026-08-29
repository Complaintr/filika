"use client";

import {
  CreditCard,
  Home,
  LineChart,
  type LucideIcon,
  MessageCircle,
  Trophy,
  User,
} from "lucide-react";
import Link from "next/link";
import { type CSSProperties, type MouseEvent, useState } from "react";
import { cn } from "@/lib/utils";

export interface BottomNavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
}

const navItems: readonly BottomNavItem[] = [
  { label: "Home", icon: Home },
  { label: "Portfolio", icon: LineChart },
  { label: "Transactions", icon: CreditCard },
  { label: "Messages", icon: MessageCircle },
  { label: "Rewards", icon: Trophy },
  { label: "Profile", icon: User },
];

export type BottomNavBarProps = {
  className?: string;
  defaultIndex?: number;
  stickyBottom?: boolean;
  items?: readonly BottomNavItem[];
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  ariaLabel?: string;
};

export function BottomNavBar({
  className,
  defaultIndex = 0,
  stickyBottom = false,
  items = navItems,
  activeIndex: controlledIndex,
  onActiveIndexChange,
  ariaLabel = "Primary navigation",
}: BottomNavBarProps) {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const requestedIndex = controlledIndex ?? selectedIndex;
  const activeIndex = Number.isInteger(requestedIndex)
    ? Math.max(0, Math.min(requestedIndex, items.length - 1))
    : 0;
  const dimensions = { "--nav-items": Math.max(1, items.length) } as CSSProperties;

  if (items.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn("filika-ui bottom-nav", stickyBottom && "bottom-nav--fixed", className)}
      data-many-items={items.length > 4 ? "true" : undefined}
      style={dimensions}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = activeIndex === index;
        const onClick = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          if (controlledIndex === undefined) setSelectedIndex(index);
          onActiveIndexChange?.(index);
        };
        const contents = (
          <>
            <span className="bottom-nav-icon" aria-hidden="true">
              <Icon size={20} strokeWidth={1.75} />
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </>
        );
        return item.href ? (
          <Link
            key={item.href}
            href={item.href}
            className="bottom-nav-item"
            data-active={isActive}
            onClick={onClick}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            title={item.label}
          >
            {contents}
          </Link>
        ) : (
          <button
            key={item.label}
            className="bottom-nav-item"
            data-active={isActive}
            onClick={onClick}
            aria-label={item.label}
            aria-pressed={isActive}
            title={item.label}
            type="button"
          >
            {contents}
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNavBar;
