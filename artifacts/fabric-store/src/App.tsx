import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import ArticlesList from "@/pages/articles/index";
import ArticleForm from "@/pages/articles/form";
import ArticleDetail from "@/pages/articles/detail";
import GrnList from "@/pages/grn/index";
import GrnForm from "@/pages/grn/form";
import Inventory from "@/pages/inventory";
import Templates from "@/pages/templates";
import Reports from "@/pages/reports";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        
        <Route path="/articles" component={ArticlesList} />
        <Route path="/articles/new" component={ArticleForm} />
        <Route path="/articles/:id" component={ArticleDetail} />
        
        <Route path="/grn" component={GrnList} />
        <Route path="/grn/new" component={GrnForm} />
        
        <Route path="/inventory" component={Inventory} />
        <Route path="/templates" component={Templates} />
        <Route path="/reports" component={Reports} />
        
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
