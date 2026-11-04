"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
] as const;

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // next-themes only knows the real theme on the client; render all buttons neutral on the server.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  return (
    <div className="flex gap-2">
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          variant={mounted && theme === o.value ? "default" : "outline"}
          onClick={() => setTheme(o.value)}
        >
          <o.icon />
          {o.label}
        </Button>
      ))}
    </div>
  );
}
