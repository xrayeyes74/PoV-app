import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const isDev = import.meta.env.DEV;

export default function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 gap-3">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
      {isDev && (
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Accesso Google disponibile solo nell'app pubblicata.
        </p>
      )}
    </div>
  );
}
