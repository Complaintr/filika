"use client";

import { motion, useReducedMotion } from "framer-motion";
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

const MotionLink = motion.create(Link);

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
  const prefersReducedMotion = useReducedMotion();
  const requestedIndex = controlledIndex ?? selectedIndex;
  const activeIndex = Number.isInteger(requestedIndex)
    ? Math.max(0, Math.min(requestedIndex, items.length - 1))
    : 0;
  const transition = {
    type: "tween" as const,
    duration: prefersReducedMotion ? 0 : 0.22,
    ease: [0.22, 1, 0.36, 1] as const,
  };
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
            <span className="bottom-nav-label" aria-hidden="true">
              <span>{item.label}</span>
            </span>
          </>
        );
        // Animate the one reserved label slot explicitly. A fixed basis keeps
        // the right-most item inside the shell while routes exchange focus.
        const animation = {
          flexBasis: isActive
            ? "calc(var(--nav-item-size) + var(--nav-label-space))"
            : "var(--nav-item-size)",
        };
        return item.href ? (
          <MotionLink
            key={item.href}
            href={item.href}
            initial={false}
            animate={animation}
            transition={transition}
            className="bottom-nav-item"
            data-active={isActive}
            onClick={onClick}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            title={item.label}
          >
            {contents}
          </MotionLink>
        ) : (
          <motion.button
            key={item.label}
            initial={false}
            animate={animation}
            transition={transition}
            className="bottom-nav-item"
            data-active={isActive}
            onClick={onClick}
            aria-label={item.label}
            aria-pressed={isActive}
            title={item.label}
            type="button"
          >
            {contents}
          </motion.button>
        );
      })}
    </nav>
  );
}

export default BottomNavBar;
