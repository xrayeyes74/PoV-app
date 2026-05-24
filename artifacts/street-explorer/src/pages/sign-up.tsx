import { SignUp } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const isDev = import.meta.env.DEV;

export default function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 gap-3">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
      {isDev && (
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Registrazione con Google disponibile solo nell'app pubblicata.
        </p>
      )}
    </div>
  );
}
