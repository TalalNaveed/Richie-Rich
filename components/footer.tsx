"use client"

import { useState } from "react"

// Logo component with error handling
function PartnerLogo({ partner, size = "h-12" }: { partner: { name: string; logo: string | null; svg?: () => React.ReactElement; invertInDark?: boolean; invertInLight?: boolean; removeBackground?: boolean }; size?: string }) {
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

  // Determine inversion class
  let invertClass = ''
  if (partner.invertInDark) {
    invertClass = 'dark:invert'
  } else if (partner.invertInLight) {
    invertClass = 'invert dark:invert-0'
  }

  // Enhanced background removal for Knot
  const bgRemovalClass = partner.removeBackground 
    ? 'mix-blend-darken dark:mix-blend-lighten' 
    : 'mix-blend-multiply dark:mix-blend-screen'

  return (
    <img
      src={partner.logo}
      alt={partner.name}
      className={`${size} w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity ${bgRemovalClass} ${invertClass}`}
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
    { name: "Knot API", logo: "/knot.avif", url: "https://knotapi.com", removeBackground: true },
    { name: "Dedalus", logo: "/Dedalus.png", url: "https://www.dedaluslabs.ai/hackprinceton" },
    { name: "Gemini", logo: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg", url: "https://deepmind.google/technologies/gemini/" },
    { name: "xAI", logo: "/xAI-Logo.png", url: "https://x.ai/api", invertInDark: true },
    { name: "X", logo: "/X.png", url: "https://x.com", invertInLight: true },
    { name: "Amazon", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg", url: "https://aws.amazon.com", invertInDark: true },
    { name: "OpenAI", logo: "/chatgpt.png", url: "https://openai.com", invertInDark: true },
    { name: "Capital One", logo: "/capital_one.svg", url: "https://capitalone.com" },
    { name: "Photon AI", logo: "/PhotonAI.png", url: "https://photon.ai", invertInDark: true },
    { name: "Chestnutforty", logo: null, url: "#", svg: LogoSVG.Chestnutforty, invertInDark: true },
  ]

  const sponsorPartners = partners.filter(p => !p.isMain)
  
  // Duplicate sponsors once for continuous scroll
  const infiniteSponsors = [...sponsorPartners, ...sponsorPartners]

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
                  className="h-32 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity mix-blend-multiply dark:mix-blend-screen"
                />
              </a>
              <p className="text-base sm:text-lg font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                Powered by
              </p>
            </div>

            {/* Sliding Sponsor Logos - Infinite Seamless Scroll */}
            <div className="relative w-full overflow-hidden py-6">
              <div className="flex animate-scroll-infinite">
                {infiniteSponsors.map((partner, index) => (
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

