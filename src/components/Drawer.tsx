import React, { useState, useRef, useEffect, ReactNode } from "react";

interface DrawerProps {
  children: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  className?: string;
}

interface DrawerSummaryProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface DrawerContentProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Drawer Summary component - the clickable header that toggles the drawer
 */
export function DrawerSummary({
  children,
  className = "",
  onClick,
  disabled = false,
  ...props
}: DrawerSummaryProps & { "aria-expanded"?: boolean }) {
  const isExpanded = props["aria-expanded"] ?? false;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center justify-between p-4
        text-left font-medium text-gray-900
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-gray-50"
        }
        ${className}
      `}
      aria-expanded={!disabled ? isExpanded : undefined}
      {...props}
    >
      {children}
      <svg
        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
          isExpanded ? "rotate-180" : ""
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
}

/**
 * Drawer Content component - the collapsible content area
 */
export const DrawerContent = React.forwardRef<
  HTMLDivElement,
  DrawerContentProps
>(({ children, className = "", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`
          overflow-hidden
          transition-all duration-300 ease-in-out
          ${className}
        `}
      {...props}
    >
      <div className="p-4">{children}</div>
    </div>
  );
});

DrawerContent.displayName = "DrawerContent";

/**
 * Drawer component - similar to <details> and <summary> but with animated height
 *
 * @example
 * ```tsx
 * <Drawer defaultOpen={false} disabled={false}>
 *   <DrawerSummary>Click to expand</DrawerSummary>
 *   <DrawerContent>
 *     <p>This content will animate in and out</p>
 *   </DrawerContent>
 * </Drawer>
 * ```
 */
export default function Drawer({
  children,
  defaultOpen = false,
  disabled = false,
  className = "",
}: DrawerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [height, setHeight] = useState<number | "auto">(
    defaultOpen ? "auto" : 0
  );
  const contentRef = useRef<HTMLDivElement>(null);

  // Update height when isOpen changes
  useEffect(() => {
    if (!contentRef.current) return;

    if (isOpen) {
      // Set to actual height for animation
      const scrollHeight = contentRef.current.scrollHeight;
      setHeight(scrollHeight);
    } else {
      // Set to 0 for collapse animation
      setHeight(0);
    }
  }, [isOpen]);

  // Handle window resize to update height if open
  useEffect(() => {
    if (!isOpen || !contentRef.current) return;

    const handleResize = () => {
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  // Find DrawerSummary and DrawerContent from children
  const childrenArray = React.Children.toArray(children);
  const summary = childrenArray.find(
    (child) => React.isValidElement(child) && child.type === DrawerSummary
  ) as React.ReactElement<DrawerSummaryProps> | undefined;

  const content = childrenArray.find(
    (child) => React.isValidElement(child) && child.type === DrawerContent
  ) as React.ReactElement<DrawerContentProps> | undefined;

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Clone summary with onClick handler
  const summaryWithHandler = summary
    ? React.cloneElement(summary, {
        onClick: handleToggle,
        disabled: disabled || summary.props.disabled,
        "aria-expanded": !disabled ? isOpen : undefined,
      } as Partial<DrawerSummaryProps & { "aria-expanded": boolean }>)
    : null;

  return (
    <div
      className={`
        border border-gray-200 rounded-lg overflow-hidden
        ${disabled ? "opacity-60" : ""}
        ${className}
      `}
    >
      {summaryWithHandler}
      {content && (
        <div
          ref={contentRef}
          className={`
            overflow-hidden
            transition-all duration-300 ease-in-out
            ${content.props.className || ""}
          `}
          style={{
            height: typeof height === "number" ? `${height}px` : height,
            ...content.props.style,
          }}
        >
          <div className="p-4">{content.props.children}</div>
        </div>
      )}
    </div>
  );
}
