import VendorOrderDetail from "@/components/vendor/VendorOrderDetail";

export default async function VendorOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VendorOrderDetail key={id} id={id} />;
}
