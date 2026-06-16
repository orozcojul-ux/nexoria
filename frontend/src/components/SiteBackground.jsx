import React from "react";



const BG_URL = `${process.env.PUBLIC_URL || ""}/assets/backgrounds/nexoria-bg.webp`;



/** Fond global Nexoria — suit le thème actif via variables CSS. */

export default function SiteBackground({ variant = "app" }) {

  const veilOpacity = variant === "landing" ? 0.72 : 0.82;



  return (

    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden transition-all duration-700" aria-hidden data-testid="site-background">

      <div

        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-all duration-700"

        style={{ backgroundImage: `url(${BG_URL})`, filter: "hue-rotate(var(--nx-bg-hue, 0deg)) saturate(var(--nx-bg-sat, 1))" }}

      />

      <div

        className="absolute inset-0 transition-all duration-700"

        style={{ background: `var(--nx-body-bg)`, opacity: veilOpacity }}

      />

      <div

        className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full blur-[120px] transition-all duration-700"

        style={{ background: "var(--nx-aurora-a)" }}

      />

      <div

        className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full blur-[120px] transition-all duration-700"

        style={{ background: "var(--nx-aurora-b)" }}

      />

      <div

        className="absolute top-1/3 right-1/4 w-1/3 h-1/3 rounded-full blur-[100px] transition-all duration-700 opacity-60"

        style={{ background: "var(--nx-aurora-c)" }}

      />

    </div>

  );

}

