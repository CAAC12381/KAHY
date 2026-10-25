export default function BrandMark({ size = "small", className = "" }: { size?: "small" | "medium" | "large"; className?: string }) {
  return (
    <span
      className={`kahy-guide kahy-guide--${size} ${className}`}
      role="img"
      aria-label="Logo de KAHY"
      style={{ backgroundImage: `url("${import.meta.env.BASE_URL}assets/kahy-logo-v2-272.jpg")` }}
    />
  );
}
