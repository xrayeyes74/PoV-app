import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, useAuth, useClerk } from "@clerk/react";
import { Clerk } from "@clerk/clerk-js";
import { dark } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TranslationProvider } from "@/i18n";
import NotFound from "@/pages/not-found";
import Explorer from "@/pages/explorer";
import CameraPage from "@/pages/camera";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import LandingPage from "@/pages/landing";

const queryClient = new QueryClient();
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const isDev = import.meta.env.DEV;

const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#00d1b2",
    colorForeground: "#f1f5f9",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#ef4444",
    colorBackground: "#0f172a",
    colorInput: "#1e293b",
    colorInputForeground: "#f1f5f9",
    colorNeutral: "#334155",
    fontFamily: "system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-[#0f172a] !rounded-none",
    footer: "!shadow-none !border-0 !bg-[#0f172a] !rounded-none",
    headerTitle: "text-white font-bold",
    headerSubtitle: "text-slate-400",
    formFieldLabel: "text-slate-300",
    footerActionLink: "text-[#00d1b2] hover:text-[#00d1b2]/80",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-500",
    formButtonPrimary: "bg-[#00d1b2] hover:bg-[#00bfa5] text-slate-900 font-semibold",
    formFieldInput: "bg-slate-800 border-slate-700 text-white",
    footerAction: "bg-slate-900",
    dividerLine: "bg-slate-700",
    alert: "bg-slate-800 border border-slate-700",
    otpCodeFieldInput: "bg-slate-800 border-slate-700 text-white",
    socialButtonsBlockButton__google: isDev ? "!hidden" : "",
    dividerRow: isDev ? "!hidden" : "",
    socialButtonsRoot: isDev ? "!hidden" : "",
  },
};

function HomeRoute() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect to="/explorer" />;
  return <LandingPage />;
}

function ExplorerRoute() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/" />;
  return <Explorer />;
}

function CameraRoute() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/" />;
  return <CameraPage />;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator />
      <TooltipProvider>
        <Switch>
          <Route path="/" component={HomeRoute} />
          <Route path="/explorer" component={ExplorerRoute} />
          <Route path="/camera" component={CameraRoute} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <TranslationProvider>
      <WouterRouter>
      <ClerkProvider
        publishableKey={clerkPubKey}
        appearance={clerkAppearance}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/explorer"
        signUpFallbackRedirectUrl="/explorer"
        localization={{
          signIn: {
            start: {
              title: "Bentornato",
              subtitle: "Accedi al tuo account PoV!",
            },
          },
          signUp: {
            start: {
              title: "Crea il tuo account",
              subtitle: "Inizia ad esplorare il mondo",
            },
          },
        }}
      >
        <AppRoutes />
      </ClerkProvider>
    </WouterRouter>
    </TranslationProvider>
  );
}

export default App;
