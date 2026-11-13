type PriceTagProps = {
  price: string | number;
  compareAtPrice?: string | number | null;
  size?: "sm" |"md" |"lg";
};

const SIZE_CLASSES = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

const COMPARE_SIZE_CLASSES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export default function PriceTag({ price, compareAtPrice, size = "md" }: PriceTagProps) {
  const numericPrice = Number(price);
  const numericCompare = compareAtPrice ? Number(compareAtPrice) : null;
  const onSale = numericCompare !== null && numericCompare > numericPrice;

  return (
    <div className="flex items-baseline gap-2">
      <span className={`font-semibold text-[var(--ink)] ${SIZE_CLASSES[size]}`}>
        ${numericPrice.toFixed(2)}
      </span>
      {onSale && (
        <span className={`text-[var(--ink-muted)] line-through ${COMPARE_SIZE_CLASSES[size]}`}>
          ${numericCompare!.toFixed(2)}
        </span>
      )}
    </div>
  );
}
