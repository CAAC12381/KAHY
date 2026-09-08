export default function BrandMark({ size = "small", className = "" }: { size?: "small" | "medium" | "large"; className?: string }) {
  return <span className={`kahy-guide kahy-guide--${size} ${className}`} role="img" aria-label="Logo original de KAHY" />;
}
