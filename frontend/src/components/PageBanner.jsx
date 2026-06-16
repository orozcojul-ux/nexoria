import React from "react";

import PixelBanner from "@/components/PixelBanner";

import { getPageBannerConfig } from "@/lib/page-banners.config";



const BANNER_ART_HEIGHT = 180;



/**

 * Bannière visuelle (texte intégré dans l'image) + sous-titre optionnel en dessous.

 */

export default function PageBanner({

  pageKey,

  image,

  pixelTheme,

  imagePosition,

  kicker,

  title,

  subtitle,

  children,

  testid,

}) {

  const cfg = pageKey ? getPageBannerConfig(pageKey) : { theme: pixelTheme || "violet", image: null, position: "50% 20%" };

  const src = image ?? cfg.image;

  const theme = pixelTheme || cfg.theme || "violet";

  const focus = imagePosition || cfg.position || "50% 20%";

  const hasArtImage = Boolean(src);



  return (

    <header
      className="page-banner-block"
      data-page-key={pageKey || undefined}
      data-testid={testid || `page-banner-${pageKey || "custom"}`}
    >

      <div className={`page-banner-visual ${hasArtImage ? "page-banner-visual--art" : ""}`}>

        <div className="page-banner-art">

          {hasArtImage ? (

            <>

              <img

                src={src}

                alt=""

                className="page-banner-img"

                loading="eager"

                style={{ objectPosition: focus }}

              />

              <div className="page-banner-watermark-guard" aria-hidden />

            </>

          ) : (

            <PixelBanner theme={theme} width={1200} height={BANNER_ART_HEIGHT} className="page-banner-pixel" />

          )}

          <div className="page-banner-dust" aria-hidden />

        </div>

        {hasArtImage && <div className="page-banner-bottom-overlay" aria-hidden />}

        {!hasArtImage && <div className="page-banner-bottom-strip" aria-hidden />}

      </div>



      {hasArtImage ? (

        (subtitle || children) && (

          <div className="page-banner-heading page-banner-heading--compact">

            {subtitle && <p className="page-banner-subtitle">{subtitle}</p>}

            {children}

          </div>

        )

      ) : (

        (kicker || title || subtitle || children) && (

          <div className="page-banner-heading">

            {kicker && <div className="page-banner-kicker">{kicker}</div>}

            {title && <h1 className="page-banner-title">{title}</h1>}

            {subtitle && <p className="page-banner-subtitle">{subtitle}</p>}

            {children}

          </div>

        )

      )}

    </header>

  );

}


