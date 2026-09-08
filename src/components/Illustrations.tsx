export function FlowerCluster({ className = "" }: { className?: string }) {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" className={className} style={{ opacity: 0.55 }}>
      {/* Lavender stems */}
      <path d="M30 90 Q28 70 30 55" stroke="#AFA781" strokeWidth="1.5" fill="none"/>
      <path d="M45 90 Q42 65 44 48" stroke="#AFA781" strokeWidth="1.5" fill="none"/>
      <path d="M60 90 Q60 68 60 50" stroke="#AFA781" strokeWidth="1.5" fill="none"/>
      {/* Lavender buds */}
      {[28,30,32].map((x,i) => <ellipse key={i} cx={x} cy={55-i*6} rx="2.5" ry="3" fill="#93709E" opacity="0.7"/>)}
      {[42,44,46].map((x,i) => <ellipse key={i} cx={x} cy={48-i*6} rx="2.5" ry="3" fill="#93709E" opacity="0.6"/>)}
      {[58,60,62].map((x,i) => <ellipse key={i} cx={x} cy={50-i*6} rx="2.5" ry="3" fill="#93709E" opacity="0.8"/>)}
      {/* Small daisy */}
      {[0,45,90,135,180,225,270,315].map((angle, i) => (
        <ellipse key={i} cx={90 + Math.cos(angle * Math.PI/180) * 8} cy={35 + Math.sin(angle * Math.PI/180) * 8} rx="3.5" ry="2" fill="#E1C5D8"
          transform={`rotate(${angle}, ${90 + Math.cos(angle * Math.PI/180) * 8}, ${35 + Math.sin(angle * Math.PI/180) * 8})`}/>
      ))}
      <circle cx="90" cy="35" r="5" fill="#AFA781"/>
      {/* Small leaf */}
      <path d="M75 80 Q78 65 82 58 Q79 70 75 80" fill="#AFA781" opacity="0.5"/>
    </svg>
  );
}

export function SmallLeaves({ className = "" }: { className?: string }) {
  return (
    <svg width="60" height="50" viewBox="0 0 60 50" className={className} style={{ opacity: 0.4 }}>
      <path d="M10 45 Q15 25 25 15 Q20 30 10 45" fill="#AFA781"/>
      <path d="M20 45 Q30 28 40 20 Q32 33 20 45" fill="#93709E" opacity="0.6"/>
      <path d="M30 45 Q38 32 48 25 Q40 36 30 45" fill="#AFA781" opacity="0.7"/>
    </svg>
  );
}

export function WatercolorBlob({ color = "#E1C5D8", className = "" }: { color?: string; className?: string }) {
  return (
    <svg width="200" height="180" viewBox="0 0 200 180" className={className} style={{ opacity: 0.25 }}>
      <path d="M60 20 Q120 0 160 40 Q200 80 180 130 Q160 180 100 170 Q40 160 20 110 Q0 60 60 20Z"
        fill={color} style={{ filter: "blur(12px)" }}/>
    </svg>
  );
}

export function TinyBird({ className = "" }: { className?: string }) {
  return (
    <svg width="36" height="28" viewBox="0 0 36 28" className={className} style={{ opacity: 0.55 }}>
      <ellipse cx="20" cy="16" rx="10" ry="7" fill="#E1C5D8"/>
      <circle cx="28" cy="11" r="5" fill="#E1C5D8"/>
      <path d="M32 10 Q36 8 34 12" fill="#AFA781" stroke="#AFA781" strokeWidth="0.5"/>
      <circle cx="30" cy="10" r="1" fill="#56574D"/>
      <path d="M10 16 Q4 10 2 14" stroke="#E1C5D8" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M10 18 Q4 16 2 20" stroke="#E1C5D8" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function StarDots({ className = "" }: { className?: string }) {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" className={className} style={{ opacity: 0.3 }}>
      <circle cx="10" cy="10" r="2" fill="#93709E"/>
      <circle cx="30" cy="5" r="1.5" fill="#AFA781"/>
      <circle cx="55" cy="15" r="2.5" fill="#E1C5D8"/>
      <circle cx="70" cy="8" r="1" fill="#93709E"/>
      <circle cx="20" cy="45" r="1.5" fill="#AFA781"/>
      <circle cx="50" cy="50" r="2" fill="#93709E"/>
      <circle cx="72" cy="40" r="1" fill="#E1C5D8"/>
    </svg>
  );
}
