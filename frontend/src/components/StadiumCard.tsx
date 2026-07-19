import React, { useEffect, useRef, useState } from 'react';

export interface Stadium {
  id: string | null;
  name: string;
  city: string;
  country: string;
  isLive: boolean;
  notable?: string;
}

interface StadiumCardProps {
  stadium: Stadium;
  isSelected?: boolean;
  onClick?: () => void;
  index: number;
  hideBadge?: boolean;
  externalUrl?: string;
}

const StadiumCard: React.FC<StadiumCardProps> = ({
  stadium,
  isSelected = false,
  onClick,
  index,
  hideBadge = false,
  externalUrl,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [clickAnim, setClickAnim] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    if (mediaQuery.matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleClick = () => {
    if (externalUrl) {
      window.open(externalUrl, '_blank');
      return;
    }
    if (onClick) {
      setClickAnim(true);
      onClick();
      setTimeout(() => {
        setClickAnim(false);
      }, 350);
    }
  };

  const delay = prefersReducedMotion ? 0 : index * 60;

  // Base card styles
  const baseClasses =
    'flex flex-col bg-turf-surface text-floodlight rounded-lg p-4 border transition-all duration-150 ease-in-out cursor-pointer select-none';
  
  // Selection and border styles
  const borderClasses = isSelected
    ? 'border-scoreboard-amber'
    : externalUrl
    ? 'border-floodlight/10 hover:border-scoreboard-amber/40 active:border-scoreboard-amber/60'
    : 'border-floodlight/10 hover:border-scoreboard-amber/40';
  
  // Hover transitions
  const hoverClasses = prefersReducedMotion
    ? ''
    : 'hover:-translate-y-[2px] active:translate-y-0';

  // Intersection animations
  const revealClasses = prefersReducedMotion
    ? 'opacity-100 translate-y-0'
    : isVisible
    ? 'opacity-100 translate-y-0 transition-all duration-[400ms] ease-out'
    : 'opacity-0 translate-y-3';

  // Click animation flashes
  const clickAnimClass = clickAnim && !stadium.isLive ? 'animate-border-flash-muted' : '';

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className={`${baseClasses} ${borderClasses} ${hoverClasses} ${revealClasses} ${clickAnimClass}`}
      style={{
        transitionDelay: isVisible && !prefersReducedMotion ? `${delay}ms` : undefined,
      }}
    >
      {/* Badge row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-sage-muted font-mono tracking-wide uppercase">
          {stadium.country}
        </span>
        {!hideBadge && (
          stadium.isLive ? (
            <span
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-scoreboard-amber/10 border border-scoreboard-amber/20 text-scoreboard-amber ${
                clickAnim ? 'animate-badge-glow' : ''
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-scoreboard-amber animate-live-pulse" />
              Live in Copilot
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium tracking-wider uppercase bg-sage-muted/10 border border-sage-muted/20 text-sage-muted">
              Coming soon
            </span>
          )
        )}
      </div>

      {/* Stadium details */}
      <h3 className="font-bold text-sm tracking-tight line-clamp-1">{stadium.name}</h3>
      <p className="text-xs text-sage-muted mt-0.5 line-clamp-1">{stadium.city}</p>
      
      {stadium.notable && (
        <p className="text-xs text-sage-muted/80 mt-2.5 italic border-t border-floodlight/5 pt-2">
          {stadium.notable}
        </p>
      )}

      {externalUrl && (
        <div className="text-xs text-scoreboard-amber font-semibold mt-3.5 flex items-center gap-1 hover:underline">
          Learn more ↗
        </div>
      )}
    </div>
  );
};

export default StadiumCard;
