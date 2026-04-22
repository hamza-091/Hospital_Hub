export const PKR_FORMATTER = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function formatPKR(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return PKR_FORMATTER.format(Number.isFinite(amount) ? amount : 0);
}
