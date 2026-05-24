import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, Camera, Compass, Sparkles } from "lucide-react";
import { useT } from "@/i18n";
import { LanguageSelector } from "@/i18n";

export default function LandingPage() {
  const { t } = useT();

  const features = [
    {
      icon: <MapPin className="h-5 w-5 text-primary" />,
      title: t.landing.feature_streetview_title,
      desc: t.landing.feature_streetview_desc,
    },
    {
      icon: <Camera className="h-5 w-5 text-primary" />,
      title: t.landing.feature_camera_title,
      desc: t.landing.feature_camera_desc,
    },
    {
      icon: <Compass className="h-5 w-5 text-primary" />,
      title: t.landing.feature_compass_title,
      desc: t.landing.feature_compass_desc,
    },
    {
      icon: <Sparkles className="h-5 w-5 text-primary" />,
      title: t.landing.feature_ai_title,
      desc: t.landing.feature_ai_desc,
    },
  ];

  return (
    <div className="min-h-[100dvh] text-foreground flex flex-col" style={{ background: "linear-gradient(to bottom, #0047ab, #000000)" }}>
      {/* Language selector */}
      <div className="flex justify-end p-4">
        <LanguageSelector />
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        <div className="mb-6 flex items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-3xl font-black text-slate-900">P</div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-3">
          PoV<span className="text-primary">!</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-sm mb-10 leading-relaxed">
          {t.landing.tagline}
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/sign-up">
            <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base h-12">
              {t.landing.cta_signup}
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" className="w-full text-base h-12 border-white/20 hover:bg-white/5">
              {t.landing.cta_login}
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-16 grid grid-cols-1 gap-4 max-w-md mx-auto w-full">
        {features.map((f) => (
          <div key={f.title} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mt-0.5 shrink-0">{f.icon}</div>
            <div>
              <p className="font-semibold text-sm">{f.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
