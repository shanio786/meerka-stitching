import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
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
import SignInPage from "@/pages/sign-in";
import { useMe } from "@/hooks/useMe";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { me, isLoading } = useMe();
  if (isLoading) return null;
  if (me?.role !== "admin") return <Redirect to="/" />;
  return <>{children}</>;
}

function ProtectedAppShell() {
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

        <Route path="/accounts">
          <AdminOnly><AccountsList /></AdminOnly>
        </Route>
        <Route path="/accounts/:masterId">
          <AdminOnly><AccountDetail /></AdminOnly>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function HomeGate() {
  const { me, isLoading } = useMe();
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!me?.signedIn) return <Redirect to="/sign-in" />;
  return <ProtectedAppShell />;
}

function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          <Route path="/sign-in" component={SignInPage} />
          <Route component={HomeGate} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRoutes />
    </WouterRouter>
  );
}

export default App;
