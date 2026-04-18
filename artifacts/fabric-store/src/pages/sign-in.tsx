import { useState } from "react";
import { useLocation } from "wouter";
import { Scissors, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { setCachedMe, type Me } from "@/hooks/useMe";
import { useToast } from "@/hooks/use-toast";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast({ title: "Enter username and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const me = await apiPost<Me>("/auth/login", {
        username: username.trim(),
        password,
      });
      setCachedMe(me);
      setLocation("/");
    } catch (err) {
      toast({
        title: "Login failed",
        description: (err as Error).message || "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-2 bg-white" data-testid="sign-in-page">
      {/* Left: branding panel */}
      <div className="relative hidden md:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 text-white">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 backdrop-blur w-10 h-10 rounded-lg flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="text-lg font-semibold tracking-tight">Stitching ERP</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Manage your garment<br />business with ease
          </h1>
          <p className="mt-4 text-blue-100/90">
            Fabric store, cutting, stitching, overlock/button, QC, finishing
            and final store — all in one place. Make smarter decisions with
            real-time reports and the article tracker.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { v: "7", l: "Modules" },
              { v: "100%", l: "Live Tracking" },
              { v: "FIFO", l: "Pending Pool" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-white/10 backdrop-blur px-4 py-3 border border-white/10">
                <div className="text-2xl font-bold">{s.v}</div>
                <div className="text-[11px] text-blue-100/80">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-blue-100/70">
          © {new Date().getFullYear()} Devoria Tech
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-8">
            <div className="bg-blue-600 text-white w-9 h-9 rounded-lg flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold tracking-tight">Stitching ERP</div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" data-testid="sign-in-form">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  data-testid="input-username"
                  autoComplete="username"
                  autoFocus
                  className="pl-9"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  onClick={() => setShowForgot((v) => !v)}
                  data-testid="button-forgot-password"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  autoComplete="current-password"
                  className="pl-9"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {showForgot && (
              <div
                className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900"
                data-testid="forgot-password-info"
              >
                Contact the system administrator to reset your password:
                <br />
                <a href="tel:+923117597815" className="font-semibold underline">
                  +92 311 7597815
                </a>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
              data-testid="button-sign-in"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              Contact the system administrator to get an account
            </p>
          </form>

          <div className="mt-8 pt-5 border-t text-center text-[11px] text-muted-foreground">
            Support: Zeshan Ahmad
            <br />
            <a href="tel:+923117597815" className="hover:underline">+92 311 7597815</a>
          </div>
        </div>
      </div>
    </div>
  );
}
