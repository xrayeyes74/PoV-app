import { SignIn } from "@clerk/react";

export default function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4">
      <SignIn
        routing="hash"
        signUpUrl="/sign-up"
        forceRedirectUrl="/explorer"
      />
    </div>
  );
}
