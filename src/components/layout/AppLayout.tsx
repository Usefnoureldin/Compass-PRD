import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Lightbulb, Ticket, CheckCircle2, Rocket, Menu, X, Users, ClipboardList, Palette, Building2, Layers, Bug, Sparkles, LogOut, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/Button";
import { ThemeToggle } from "../ui/ThemeToggle";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "../ui/Tooltip";
import { NotificationPopover } from "../notifications/NotificationPopover";
import { SaveIndicator } from "./SaveIndicator";
import { useAuth } from "../../context/AuthContext";

interface SidebarProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<SidebarProps> = ({ children }) => {
  const { pathname } = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const mainRef = React.useRef<HTMLElement>(null);
  const { user, signOut } = useAuth();
  const userLabel =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Workspace";
  const userEmail = user?.email ?? "";

  // Scroll to top on every route change
  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: MapIcon, label: "Plan", path: "/plan" },
    { icon: Sparkles, label: "Features", path: "/features" },
    { icon: Lightbulb, label: "Ideas", path: "/ideas" },
    { icon: ClipboardList, label: "Client Requirements", path: "/requirements" },
    { icon: Bug, label: "Bug Tracker", path: "/bugs" },
    { icon: Ticket, label: "Tickets", path: "/tickets" },
    { icon: Layers, label: "Sprints", path: "/sprints" },
    { icon: CheckCircle2, label: "QA", path: "/qa" },
    { icon: Rocket, label: "Releases", path: "/releases" },
    { icon: Building2, label: "Organizations", path: "/organizations" },
    { icon: Users, label: "Users", path: "/users" },
    { icon: Palette, label: "Design", path: "/design" },
  ];

  return (
    <div className="h-screen bg-background flex flex-col md:flex-row overflow-hidden transition-all duration-300">
      {/* Mobile Header */}
      {/* ... keeping the same ... */}
      {/* slide 48-64 same */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card z-20 shrink-0">
        <div className="flex items-center gap-2 font-bold text-xl text-foreground">
          <img src="/brand/logos/logomark/hostbase-logomark-full-color.svg" alt="Hostbase" className="w-8 h-8" />
          Compass
        </div>
        <div className="flex items-center gap-2">
          <NotificationPopover />
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu />
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {/* ... slide 67-94 same ... */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed inset-0 z-40 bg-background md:hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-bold text-lg">Menu</span>
              <Button variant="ghost" size="icon" onClick={closeMobileMenu}>
                <X />
              </Button>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink key={item.path} to={item.path} onClick={closeMobileMenu} className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            {/* Added User part to mobile menu for consistency */}
            <div className="mt-auto border-t p-3 pb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-teal-700 shrink-0"></div>
                <div className="flex flex-col leading-tight">
                  <span className="text-[13px] font-medium">{userLabel}</span>
                  <span className="text-[9px] text-muted-foreground">{userEmail || "Signed in"}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="scale-90">
                  <ThemeToggle />
                </div>
                <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 min-w-0 text-muted-foreground hover:text-foreground">
                  <LogOut size={16} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 234,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn("hidden md:flex flex-col border-r bg-muted/20 h-full shrink-0")}
      >
        <div className="p-4 relative flex flex-col h-full">
          {/* Collapse Toggle */}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-5 z-50 bg-card border shadow-md rounded-full p-1 text-muted-foreground hover:text-primary transition-colors">
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>

          <div className="flex items-center font-bold text-xl text-foreground mb-6 overflow-hidden shrink-0 h-8">
            <div className="w-12 shrink-0 flex items-center justify-center">
              <img src="/brand/logos/logomark/hostbase-logomark-full-color.svg" alt="Hostbase" className="w-8 h-8" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }} className="whitespace-nowrap overflow-hidden ml-2">
                  Compass
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar flex flex-col">
            <div className="space-y-1">
              {navItems
                .filter((item) => item.path !== "/design")
                .map((item) => {
                  const isActive = pathname === item.path;

                  const NavContent = (
                    <NavLink to={item.path} className={cn("flex items-center rounded-md text-sm font-medium transition-colors relative z-10 w-full h-10", isActive ? "text-primary" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground")}>
                      {isActive && <motion.div layoutId="sidebar-active-bg" className="absolute inset-0 bg-primary/10 rounded-lg" initial={false} transition={{ type: "spring", stiffness: 300, damping: 30 }} />}

                      <div className="shrink-0 w-12 flex items-center justify-center">
                        <item.icon size={20} />
                      </div>

                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }} className="whitespace-nowrap overflow-hidden ml-1">
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  );

                  return (
                    <div key={item.path} className="relative">
                      {isCollapsed ? (
                        <Tooltip content={item.label} side="right">
                          {NavContent}
                        </Tooltip>
                      ) : (
                        NavContent
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex-1" />

            {/* Design Link Stuck at Bottom (No divider) */}
            <div className="pt-1 mt-1">
              {navItems
                .filter((item) => item.path === "/design")
                .map((item) => {
                  const isActive = pathname === item.path;

                  const NavContent = (
                    <NavLink to={item.path} className={cn("flex items-center rounded-md text-sm font-medium transition-colors relative z-10 w-full h-10", isActive ? "text-primary" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground")}>
                      {isActive && <motion.div layoutId="sidebar-active-bg" className="absolute inset-0 bg-primary/10 rounded-lg" initial={false} transition={{ type: "spring", stiffness: 300, damping: 30 }} />}

                      <div className="shrink-0 w-12 flex items-center justify-center">
                        <item.icon size={20} />
                      </div>

                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }} className="whitespace-nowrap overflow-hidden ml-1">
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  );

                  return (
                    <div key={item.path} className="relative">
                      {isCollapsed ? (
                        <Tooltip content={item.label} side="right">
                          {NavContent}
                        </Tooltip>
                      ) : (
                        NavContent
                      )}
                    </div>
                  );
                })}
            </div>
          </nav>

          <div className="mt-auto border-t -mx-4 px-4 -mb-4 py-3">
            <div className="flex items-center">
              <div className="w-12 shrink-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-teal-700 shrink-0 shadow-sm"></div>
              </div>

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="flex items-center justify-between flex-1 ml-1 overflow-hidden">
                    <div className="flex flex-col whitespace-nowrap overflow-hidden gap-0.5 mt-0.5">
                      <span className="text-[13px] font-semibold truncate leading-none">{userLabel}</span>
                      <span className="text-[9px] text-muted-foreground truncate leading-none opacity-80">{userEmail || "Signed in"}</span>
                    </div>
                    <div className="flex items-center gap-0.5 -mr-1">
                      <div className="[&_button]:h-8 [&_button]:w-8 [&_button]:min-w-0 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">
                        <NotificationPopover />
                      </div>
                      <div className="[&_button]:h-8 [&_button]:w-8 [&_button]:min-w-0 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">
                        <ThemeToggle />
                      </div>
                      <Tooltip content="Sign out" side="top">
                        <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 min-w-0 text-muted-foreground hover:text-foreground">
                          <LogOut size={16} />
                        </Button>
                      </Tooltip>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {isCollapsed && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-3 flex flex-col items-center gap-2 justify-center">
                  <div className="[&_button]:h-8 [&_button]:w-8 [&_button]:min-w-0">
                    <NotificationPopover />
                  </div>
                  <div className="[&_button]:h-8 [&_button]:w-8 [&_button]:min-w-0">
                    <ThemeToggle />
                  </div>
                  <Tooltip content="Sign out" side="right">
                    <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 min-w-0 text-muted-foreground hover:text-foreground">
                      <LogOut size={16} />
                    </Button>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto bg-background/50 relative">
        <div key={pathname} className="w-full px-4 md:px-8 pb-4 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-in-out">
          {children}
        </div>
      </main>

      <SaveIndicator />
    </div>
  );
};
