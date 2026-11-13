import VendorProductForm from "@/components/vendor/VendorProductForm";

export default async function EditVendorProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VendorProductForm key={id} productId={id} />;
}
