import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { ClerkProvider, SignIn, SignUp, Show } from "@clerk/react";
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
import { useMe } from "@/hooks/useMe";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(222, 47%, 11%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInputBackground: "hsl(0, 0%, 100%)",
    colorText: "hsl(222, 47%, 11%)",
    colorTextSecondary: "hsl(215, 20%, 35%)",
    colorInputText: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(222, 20%, 25%)",
    borderRadius: "0.625rem",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontFamilyButtons: "system-ui, -apple-system, sans-serif",
    fontSize: "0.95rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "shadow-xl border border-slate-200 rounded-2xl w-full overflow-hidden bg-white",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: { color: "hsl(222, 47%, 11%)", fontWeight: 700 },
    headerSubtitle: { color: "hsl(215, 20%, 35%)" },
    socialButtonsBlockButtonText: { color: "hsl(222, 47%, 11%)" },
    formFieldLabel: { color: "hsl(222, 47%, 11%)" },
    footerActionLink: { color: "hsl(222, 47%, 11%)", fontWeight: 600 },
    footerActionText: { color: "hsl(215, 20%, 35%)" },
    dividerText: { color: "hsl(215, 20%, 45%)" },
    identityPreviewEditButton: { color: "hsl(222, 47%, 11%)" },
    formFieldSuccessText: { color: "hsl(142, 70%, 30%)" },
    alertText: { color: "hsl(0, 60%, 35%)" },
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border border-slate-200 hover:bg-slate-50",
    formButtonPrimary: "bg-slate-900 hover:bg-slate-800 text-white",
    formFieldInput: "border border-slate-200",
    footerAction: "py-3",
    dividerLine: "bg-slate-200",
  },
};

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

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
  return (
    <>
      <Show when="signed-in"><ProtectedAppShell /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: { start: { title: "Stitching ERP", subtitle: "Sign in to continue" } },
        signUp: { start: { title: "Create your account", subtitle: "Welcome to Stitching ERP" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Switch>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={HomeGate} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
