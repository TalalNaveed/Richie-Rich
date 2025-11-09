"use client"

import { useState } from "react"

// Logo component with error handling
function PartnerLogo({ partner, size = "h-12" }: { partner: { name: string; logo: string | null; svg?: () => React.ReactElement }; size?: string }) {
  const [imageError, setImageError] = useState(false)

  if (!partner.logo || imageError) {
    if (partner.svg) {
      return (
        <div className={`${size} flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity text-muted-foreground group-hover:text-foreground`}>
          <partner.svg />
        </div>
      )
    }
    return (
      <span className="text-sm sm:text-base font-medium text-muted-foreground group-hover:text-foreground transition-colors px-4 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 border border-white/5 hover:border-white/10">
        {partner.name}
      </span>
    )
  }

  return (
    <img
      src={partner.logo}
      alt={partner.name}
      className={`${size} w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity`}
      onError={() => setImageError(true)}
    />
  )
}

// SVG Logos for companies without direct logo URLs
const LogoSVG = {
  KnotAPI: () => (
    <svg width="120" height="48" viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="32" fontSize="20" fontWeight="600" fill="currentColor">Knot API</text>
    </svg>
  ),
  Dedalus: () => (
    <svg width="120" height="48" viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="32" fontSize="20" fontWeight="600" fill="currentColor">Dedalus</text>
    </svg>
  ),
  PhotonAI: () => (
    <svg width="120" height="48" viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="32" fontSize="20" fontWeight="600" fill="currentColor">Photon AI</text>
    </svg>
  ),
  Chestnutforty: () => (
    <svg width="140" height="48" viewBox="0 0 140 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="32" fontSize="18" fontWeight="600" fill="currentColor">Chestnutforty</text>
    </svg>
  ),
}

export function Footer() {
  const partners = [
    { name: "HackPrinceton", logo: "/hplogo_nobg.png", url: "#", isMain: true },
    { name: "Knot API", logo: "https://logo.clearbit.com/knotapi.com", url: "https://knotapi.com", svg: LogoSVG.KnotAPI },
    { name: "Dedalus", logo: "/Dedalus.png", url: "https://www.dedaluslabs.ai/hackprinceton", svg: LogoSVG.Dedalus },
    { name: "Gemini", logo: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg", url: "https://deepmind.google/technologies/gemini/" },
    { name: "xAI", logo: "/xAI-logo.png", url: "https://x.ai/api" },
    { name: "X", logo: "https://abs.twimg.com/favicons/twitter.3.ico", url: "https://x.com" },
    { name: "Amazon", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg", url: "https://aws.amazon.com" },
    { name: "OpenAI", logo: "https://logo.clearbit.com/openai.com", url: "https://openai.com" },
    { name: "Capital One", logo: "https://logo.clearbit.com/capitalone.com", url: "https://capitalone.com" },
    { name: "Photon AI", logo: "/PhotonAI.png", url: "https://photon.ai", svg: LogoSVG.PhotonAI },
    { name: "Chestnutforty", logo: null, url: "#", svg: LogoSVG.Chestnutforty },
  ]

  const sponsorPartners = partners.filter(p => !p.isMain)
  
  // Duplicate sponsors for seamless loop
  const duplicatedSponsors = [...sponsorPartners, ...sponsorPartners]

  return (
    <footer className="w-full border-t border-white/10 dark:border-white/5 bg-gradient-to-b from-background/80 to-background/95 backdrop-blur-md mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center gap-8">
          <div className="w-full">
            {/* HackPrinceton Logo - Prominently displayed */}
            <div className="flex flex-col items-center mb-12">
              <a
                href="#"
                className="group flex items-center justify-center transition-all duration-300 hover:scale-105"
              >
                <img
                  src="/hplogo_nobg.png"
                  alt="HackPrinceton"
                  className="h-32 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </a>
              <p className="text-base sm:text-lg font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                Powered by
              </p>
            </div>

            {/* Sliding Sponsor Logos */}
            <div className="relative w-full overflow-hidden py-6">
              <div className="flex animate-scroll">
                {duplicatedSponsors.map((partner, index) => (
                  <a
                    key={`${partner.name}-${index}`}
                    href={partner.url}
                    target={partner.url !== "#" ? "_blank" : undefined}
                    rel={partner.url !== "#" ? "noopener noreferrer" : undefined}
                    className="group flex items-center justify-center transition-all duration-300 hover:scale-110 flex-shrink-0 mx-8"
                  >
                    <PartnerLogo partner={partner} size="h-20" />
                  </a>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  )
}

