import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  FileBox, 
  Warehouse, 
  BookTemplate, 
  BarChart3,
  Menu,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

const sidebarLinks = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Articles", href: "/articles", icon: Package },
  { name: "GRN", href: "/grn", icon: FileBox },
  { name: "Inventory", href: "/inventory", icon: Warehouse },
  { name: "Templates", href: "/templates", icon: BookTemplate },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavLinks = () => (
    <nav className="space-y-1 p-4" data-testid="sidebar-nav">
      {sidebarLinks.map((link) => {
        const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
        return (
          <Link key={link.href} href={link.href}>
            <div
              data-testid={`nav-link-${link.name.toLowerCase()}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              <link.icon className={`h-5 w-5 ${isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70"}`} />
              {link.name}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden" data-testid="app-layout">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <div className="bg-primary text-primary-foreground w-8 h-8 flex items-center justify-center rounded-md">
              FS
            </div>
            FabricStore
          </div>
        </div>
        <ScrollArea className="flex-1">
          <NavLinks />
        </ScrollArea>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-4 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <div className="h-16 flex items-center px-6 border-b border-sidebar-border bg-sidebar">
                  <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
                    <div className="bg-primary text-primary-foreground w-8 h-8 flex items-center justify-center rounded-md">
                      FS
                    </div>
                    FabricStore
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-4rem)] bg-sidebar">
                  <NavLinks />
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <div className="font-bold text-lg text-primary md:hidden tracking-tight">FabricStore</div>
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border-2 border-background"></span>
            </Button>
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-medium text-sm">
              AD
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
          <div className="max-w-7xl mx-auto w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
