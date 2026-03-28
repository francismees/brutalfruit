import Image from "next/image";

interface BrandLogoProps {
  variant?: "icon" | "wordmark";
  className?: string;
  color?: string;
  width?: number;
  height?: number;
}

export function BrandLogo({
  variant = "wordmark",
  className = "",
  width,
  height,
}: BrandLogoProps) {
  if (variant === "icon") {
    return (
      <Image
        src="/bf-logo-icon.svg"
        alt="Brutal Fruit"
        width={width || 40}
        height={height || 43}
        className={className}
        priority
      />
    );
  }

  return (
    <Image
      src="/bf-logo-wordmark.svg"
      alt="Brutal Fruit"
      width={width || 160}
      height={height || 25}
      className={className}
      priority
    />
  );
}
