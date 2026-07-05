import { SignUp } from "@clerk/react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4">
      <SignUp
        routing="hash"
        signInUrl="/sign-in"
        forceRedirectUrl="/explorer"
      />
    </div>
  );
}
