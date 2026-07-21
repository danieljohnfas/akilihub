"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  
  // To avoid hydration mismatch errors, we delay rendering the button state until mounted
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-5 w-5 opacity-0" />
      </Button>
    );
  }

  const currentTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(currentTheme === "light" ? "dark" : "light")}
      aria-label="Toggle theme"
    >
      {currentTheme === "dark" ? (
        <Moon className="h-5 w-5 text-zinc-400 hover:text-zinc-100 transition-colors" />
      ) : (
        <Sun className="h-5 w-5 text-zinc-600 hover:text-zinc-900 transition-colors" />
      )}
    </Button>
  );
}
