import React from 'react';
import StadiumCard, { Stadium } from './StadiumCard';
import footballImage from '../../football.jpg';

interface HeroLandingProps {
  stadiums: Stadium[];
  onStadiumClick: (stadium: Stadium) => void;
  onEnterChat: () => void;
}

interface LegendaryStadium {
  name: string;
  city: string;
  country: string;
  notable: string;
  wikipediaUrl: string;
}

const LEGENDARY_STADIUMS: LegendaryStadium[] = [
  {
    name: 'Camp Nou',
    city: 'Barcelona',
    country: 'Spain',
    notable: "Home of FC Barcelona, one of Europe's largest club stadiums",
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Camp_Nou',
  },
  {
    name: 'Maracanã',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    notable: 'Hosted the 1950 and 2014 World Cup finals',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Maracan%C3%A3_Stadium',
  },
  {
    name: 'Wembley Stadium',
    city: 'London',
    country: 'England',
    notable: "England's national stadium, hosted the 1966 World Cup final",
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Wembley_Stadium',
  },
  {
    name: 'Santiago Bernabéu',
    city: 'Madrid',
    country: 'Spain',
    notable: 'Home of Real Madrid, host of the 1982 World Cup final',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Santiago_Bernab%C3%A9u_Stadium',
  },
  {
    name: 'Old Trafford',
    city: 'Manchester',
    country: 'England',
    notable: "Home of Manchester United, one of football's most storied clubs",
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Old_Trafford',
  },
];

interface WinnersRow {
  year: string;
  champion: string;
  isSpecial?: boolean;
}

const WINNERS_HISTORY: WinnersRow[] = [
  { year: '1930', champion: 'Uruguay' },
  { year: '1934', champion: 'Italy' },
  { year: '1938', champion: 'Italy' },
  { year: '1942', champion: 'Not held (World War II)', isSpecial: true },
  { year: '1946', champion: 'Not held (World War II)', isSpecial: true },
  { year: '1950', champion: 'Uruguay' },
  { year: '1954', champion: 'West Germany' },
  { year: '1958', champion: 'Brazil' },
  { year: '1962', champion: 'Brazil' },
  { year: '1966', champion: 'England' },
  { year: '1970', champion: 'Brazil' },
  { year: '1974', champion: 'West Germany' },
  { year: '1978', champion: 'Argentina' },
  { year: '1982', champion: 'Italy' },
  { year: '1986', champion: 'Argentina' },
  { year: '1990', champion: 'West Germany' },
  { year: '1994', champion: 'Brazil' },
  { year: '1998', champion: 'France' },
  { year: '2002', champion: 'Brazil' },
  { year: '2006', champion: 'Italy' },
  { year: '2010', champion: 'Spain' },
  { year: '2014', champion: 'Germany' },
  { year: '2018', champion: 'France' },
  { year: '2022', champion: 'Argentina' },
  { year: '2026', champion: 'Final: July 19, 2026 — result pending', isSpecial: true },
];

const HeroLanding: React.FC<HeroLandingProps> = ({
  stadiums,
  onStadiumClick,
  onEnterChat,
}) => {
  // Group 16 World Cup stadiums by country
  const groupedStadiums = stadiums.reduce<Record<string, Stadium[]>>((acc, stadium) => {
    // Sree Kanteerava is not an official WC26 venue, filter it out or group it under India
    if (stadium.id === 'kanteerav') {
      if (!acc['India (Bonus Venue)']) acc['India (Bonus Venue)'] = [];
      acc['India (Bonus Venue)'].push(stadium);
    } else {
      const key = stadium.country;
      if (!acc[key]) acc[key] = [];
      acc[key].push(stadium);
    }
    return acc;
  }, {});

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      id="hero-scroll-root"
      className="text-floodlight min-h-screen overflow-y-auto"
      style={{
        backgroundImage: `linear-gradient(var(--overlay-hero), var(--overlay-hero)), url(${footballImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        scrollPaddingTop: '64px',
      }}
    >
      {/* ── Sticky Navigation Bar ───────────────────────────── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between gap-4 px-6 h-16 border-b"
        style={{
          backgroundColor: 'var(--pitch-charcoal)',
          borderColor: 'var(--turf-surface)',
        }}
      >
        {/* Wordmark */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl select-none">⚽</span>
          <span className="font-bold text-sm tracking-tight text-floodlight leading-tight">
            Fan Copilot
          </span>
        </div>

        {/* Anchor links */}
        <div className="flex items-center gap-1 sm:gap-4 flex-wrap justify-center">
          <button
            onClick={() => scrollTo('section-about')}
            className="text-xs sm:text-sm text-sage-muted hover:text-scoreboard-amber transition-colors font-medium whitespace-nowrap px-1 py-1 cursor-pointer"
          >
            About Sport
          </button>
          <button
            onClick={() => scrollTo('section-history')}
            className="text-xs sm:text-sm text-sage-muted hover:text-scoreboard-amber transition-colors font-medium whitespace-nowrap px-1 py-1 cursor-pointer"
          >
            World Cup History
          </button>
          <button
            onClick={() => scrollTo('section-venues')}
            className="text-xs sm:text-sm text-sage-muted hover:text-scoreboard-amber transition-colors font-medium whitespace-nowrap px-1 py-1 cursor-pointer"
          >
            Tournament &amp; Venues
          </button>
        </div>

        {/* CTA — Chat button */}
        <button
          onClick={onEnterChat}
          className="flex-shrink-0 inline-flex items-center gap-1.5 bg-scoreboard-amber text-pitch-charcoal px-4 py-2 rounded-lg font-bold text-xs sm:text-sm hover:bg-scoreboard-amber/90 active:scale-95 transition-all shadow-[3px_3px_0px_rgba(255,176,0,0.2)] cursor-pointer"
        >
          Chat →
        </button>
      </nav>

      <div className="max-w-5xl mx-auto space-y-24 px-6 py-12">
        
        {/* Section 1: Intro Banner */}
        <section className="text-center space-y-6 pt-8">
          {/* Rotating Football */}
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            {/* Spotlight Glow */}
            <div className="absolute w-44 h-44 bg-scoreboard-amber/15 rounded-full blur-2xl animate-pulse" />
            
            {/* Ball Body: Z-axis flat spinning wrapper */}
            <div className="w-36 h-36 relative animate-rotate-ball">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <clipPath id="ball-clip">
                    <circle cx="50" cy="50" r="48" />
                  </clipPath>
                </defs>
                
                {/* Base circle background */}
                <circle cx="50" cy="50" r="48" fill="#f0f4f8" stroke="#ffb000" strokeWidth="2" />
                
                {/* Clipped soccer pattern */}
                <g clipPath="url(#ball-clip)">
                  {/* Center pentagon */}
                  <polygon points="50,30 70,45 62,70 38,70 30,45" fill="#152214" stroke="#ffb000" strokeWidth="1.5" />
                  
                  {/* Cropped outer pentagons */}
                  {/* Top pentagon */}
                  <polygon points="50,5 65,-10 35,-10" fill="#152214" stroke="#ffb000" strokeWidth="1.5" />
                  {/* Top-Right pentagon */}
                  <polygon points="90,15 105,25 90,40" fill="#152214" stroke="#ffb000" strokeWidth="1.5" />
                  {/* Bottom-Right pentagon */}
                  <polygon points="85,85 75,105 100,105" fill="#152214" stroke="#ffb000" strokeWidth="1.5" />
                  {/* Bottom-Left pentagon */}
                  <polygon points="15,85 25,105 0,105" fill="#152214" stroke="#ffb000" strokeWidth="1.5" />
                  {/* Top-Left pentagon */}
                  <polygon points="10,15 -5,25 10,40" fill="#152214" stroke="#ffb000" strokeWidth="1.5" />
                  
                  {/* Seam lines */}
                  <line x1="50" y1="30" x2="50" y2="5" stroke="#ffb000" strokeWidth="1.5" />
                  <line x1="70" y1="45" x2="90" y2="35" stroke="#ffb000" strokeWidth="1.5" />
                  <line x1="62" y1="70" x2="80" y2="90" stroke="#ffb000" strokeWidth="1.5" />
                  <line x1="38" y1="70" x2="20" y2="90" stroke="#ffb000" strokeWidth="1.5" />
                  <line x1="30" y1="45" x2="10" y2="35" stroke="#ffb000" strokeWidth="1.5" />
                </g>
              </svg>
              
              {/* Spotlight lighting overlay */}
              <div 
                className="absolute inset-0 rounded-full pointer-events-none" 
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.6) 80%)'
                }}
              />
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-scoreboard-amber">
            The Beautiful Game
          </h2>
          <p className="text-base md:text-lg text-sage-muted max-w-xl mx-auto font-medium">
            Football is the world's most-watched sport — and 2026 brings its biggest tournament yet.
          </p>
        </section>

        {/* Section 2: About Football */}
        <section id="section-about" className="bg-turf-surface/20 border border-floodlight/5 rounded-lg p-8 space-y-8 shadow-sm">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h3 className="text-lg font-bold tracking-wider text-scoreboard-amber uppercase font-mono">
              About the Sport
            </h3>
            <p className="text-sm md:text-base text-floodlight/90 leading-relaxed">
              Football is played and watched by more people than any other sport on Earth. Its modern rules were codified in England in 1863, and today it's organized globally by FIFA, football's international governing body, with member associations across every continent.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="bg-turf-surface/40 border border-floodlight/10 rounded-lg p-4 text-center">
              <span className="block text-2xl md:text-3xl font-bold font-mono text-scoreboard-amber">
                1863
              </span>
              <span className="text-xs text-sage-muted font-medium mt-1 block">
                Modern rules codified
              </span>
            </div>
            <div className="bg-turf-surface/40 border border-floodlight/10 rounded-lg p-4 text-center">
              <span className="block text-2xl md:text-3xl font-bold font-mono text-scoreboard-amber">
                211+
              </span>
              <span className="text-xs text-sage-muted font-medium mt-1 block">
                FIFA member associations
              </span>
            </div>
            <div className="bg-turf-surface/40 border border-floodlight/10 rounded-lg p-4 text-center">
              <span className="block text-2xl md:text-3xl font-bold font-mono text-scoreboard-amber">
                1930
              </span>
              <span className="text-xs text-sage-muted font-medium mt-1 block">
                First World Cup (Uruguay)
              </span>
            </div>
            <div className="bg-turf-surface/40 border border-floodlight/10 rounded-lg p-4 text-center">
              <span className="block text-2xl md:text-3xl font-bold font-mono text-scoreboard-amber">
                48
              </span>
              <span className="text-xs text-sage-muted font-medium mt-1 block">
                Teams at World Cup 2026
              </span>
            </div>
          </div>
        </section>

        {/* Section 3: World Cup Winners */}
        <section id="section-history" className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-scoreboard-amber">
              World Cup History
            </h3>
            <p className="text-xs text-sage-muted font-mono uppercase tracking-wider">
              Champions Through the Ages (1930 – 2026)
            </p>
          </div>

          <div className="max-w-md mx-auto bg-turf-surface border border-floodlight/10 rounded-lg overflow-hidden shadow-md">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-pitch-charcoal border-b border-floodlight/10 text-xs font-mono text-sage-muted uppercase tracking-wider">
                    <th className="px-4 py-3">Year</th>
                    <th className="px-4 py-3">Champion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-floodlight/5">
                  {WINNERS_HISTORY.map((row) => {
                    const isUpcoming = row.year === '2026';
                    return (
                      <tr
                        key={row.year}
                        className={
                          isUpcoming
                            ? 'bg-scoreboard-amber/15 text-scoreboard-amber font-semibold border-y border-scoreboard-amber/30'
                            : row.isSpecial
                            ? 'bg-pitch-charcoal/30 text-sage-muted italic'
                            : 'hover:bg-turf-surface/80'
                        }
                      >
                        <td className="px-4 py-3 font-mono font-medium">{row.year}</td>
                        <td className="px-4 py-3">
                          {isUpcoming ? (
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-scoreboard-amber animate-live-pulse" />
                              {row.champion}
                            </span>
                          ) : (
                            row.champion
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <p className="text-center text-xs text-sage-muted max-w-md mx-auto leading-relaxed">
            Brazil leads all nations with 5 titles. Argentina enters 2026 as the defending champion.
          </p>
        </section>

        {/* Section 4: Stadiums Showcase */}
        <section id="section-venues" className="space-y-12">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-scoreboard-amber">
              Tournament & Legendary Venues
            </h3>
            <p className="text-xs text-sage-muted font-mono uppercase tracking-wider">
              Explore Host Cities & Iconic Arenas
            </p>
          </div>

          {/* Sub-section 4a: WC2026 Official Venues */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-floodlight tracking-wide uppercase border-b border-floodlight/10 pb-2">
              World Cup 2026 Official Venues (Chat-Enabled)
            </h4>
            
            <div className="space-y-8">
              {Object.entries(groupedStadiums).map(([country, items]) => (
                <div key={country} className="space-y-4">
                  <h5 className="text-xs font-bold text-sage-muted tracking-wider uppercase font-mono">
                    {country}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {items.map((stadium, idx) => (
                      <StadiumCard
                        key={stadium.name}
                        stadium={stadium}
                        onClick={() => onStadiumClick(stadium)}
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-section 4b: Iconic Stadiums of the World */}
          <div className="space-y-6 pt-4">
            <h4 className="text-sm font-bold text-floodlight tracking-wide uppercase border-b border-floodlight/10 pb-2">
              Legendary Stadiums — Not Part of the 2026 Tournament
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {LEGENDARY_STADIUMS.map((stadium, idx) => (
                <StadiumCard
                  key={stadium.name}
                  stadium={{
                    id: null,
                    name: stadium.name,
                    city: stadium.city,
                    country: stadium.country,
                    isLive: false,
                    notable: stadium.notable,
                  }}
                  index={idx}
                  hideBadge={true}
                  externalUrl={stadium.wikipediaUrl}
                />
              ))}
            </div>
          </div>

          {/* CTA at the very bottom */}
          <div className="text-center pt-8">
            <button
              onClick={onEnterChat}
              className="inline-flex items-center gap-2 bg-scoreboard-amber text-pitch-charcoal px-8 py-4 rounded-lg font-bold text-base hover:bg-scoreboard-amber/90 active:scale-98 transition-all shadow-[4px_4px_0px_rgba(255,176,0,0.2)] hover:shadow-[2px_2px_0px_rgba(255,176,0,0.15)] cursor-pointer"
            >
              Chat with Fan Copilot →
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default HeroLanding;
