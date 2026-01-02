import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, BarChart3, Home } from "lucide-react";

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell: The global layout wrapper
 * Ensures the "One-Incher Rule" - first inch is identical across all pages
 */
export const AppShell = ({ children }: AppShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show shell on auth pages
  const isAuthPage = ["/", "/auth", "/register"].includes(location.pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Global Header - Level 4 Elevation (sticky) */}
      <header className="sticky top-0 z-50 bg-card border-b border-border elevation-2">
        <div className="page-container">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo/Brand */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  EM
                </span>
              </div>
              <span className="font-semibold text-foreground hidden sm:inline">
                English Mate
              </span>
            </div>

            {/* Right: Navigation Actions */}
            <nav className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">דף הבית</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile")}
                className="gap-2"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">פרופיל</span>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
    </div>
  );
};
