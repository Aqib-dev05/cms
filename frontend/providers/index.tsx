"use client";

import { Provider as ReduxProvider } from "react-redux";
import { ThemeProvider } from "next-themes";
import { store } from "@/store";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "./query-provider";
import { SocketProvider } from "./socket-provider";
import { AccentSync, StoreHydrator } from "./store-hydrator";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryProvider>
          <TooltipProvider delayDuration={150}>
            <StoreHydrator />
            <AccentSync />
            <SocketProvider />
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
