import Image from "next/image";
import { brand } from "@/lib/brand";

/** Uses the supplied artwork without redrawing or altering the source file. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-artwork ${className}`}>
      <Image
        src="/brand/logo.jpg"
        alt={`Logo ${brand.name}`}
        width={2160}
        height={2160}
        sizes="(max-width: 700px) 80px, 120px"
        className="brand-artwork-image"
      />
    </span>
  );
}
