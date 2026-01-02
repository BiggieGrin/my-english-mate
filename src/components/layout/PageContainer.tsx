import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
}

/**
 * PageContainer: Enforces consistent width and padding
 * Implements the "Border-Box Rule" for consistent spacing
 */
export const PageContainer = ({
  children,
  narrow = false,
  className = "",
}: PageContainerProps) => {
  const containerClass = narrow ? "page-container-narrow" : "page-container";

  return (
    <div className={`${containerClass} py-8 ${className}`}>
      {children}
    </div>
  );
};
