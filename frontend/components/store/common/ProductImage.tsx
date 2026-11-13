"use client";

import { ImageOff } from "lucide-react";

type ProductImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

export default function ProductImage({ src, alt, className = "" }: ProductImageProps) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-[var(--cream-2)] ${className}`}>
        <ImageOff className="h-8 w-8 text-[var(--border-strong)]" strokeWidth={1.5} />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
}
