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
import ArticleTracker from "@/pages/articles/tracker";
import Reports from "@/pages/reports";
import MastersList from "@/pages/masters/index";
import CuttingJobs from "@/pages/cutting/index";
import CuttingDetail from "@/pages/cutting/detail";
import StitchingJobs from "@/pages/stitching/index";
import StitchingDetail from "@/pages/stitching/detail";
import QCEntries from "@/pages/qc/index";
import OverlockButton from "@/pages/overlock-button/index";
import FinishingEntries from "@/pages/finishing/index";
import FinalStore from "@/pages/final-store/index";
import AccountsList from "@/pages/accounts/index";
import AccountDetail from "@/pages/accounts/detail";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        
        <Route path="/articles" component={ArticlesList} />
        <Route path="/articles/new" component={ArticleForm} />
        <Route path="/articles/:id/track" component={ArticleTracker} />
        <Route path="/articles/:id" component={ArticleDetail} />
        
        <Route path="/reports" component={Reports} />

        <Route path="/masters" component={MastersList} />

        <Route path="/cutting" component={CuttingJobs} />
        <Route path="/cutting/:id" component={CuttingDetail} />

        <Route path="/stitching" component={StitchingJobs} />
        <Route path="/stitching/:id" component={StitchingDetail} />

        <Route path="/qc" component={QCEntries} />
        <Route path="/overlock-button" component={OverlockButton} />
        <Route path="/finishing" component={FinishingEntries} />
        <Route path="/final-store" component={FinalStore} />

        <Route path="/accounts" component={AccountsList} />
        <Route path="/accounts/:masterId" component={AccountDetail} />
        
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
