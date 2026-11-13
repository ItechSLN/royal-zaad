'use client';

import { toast } from "sonner";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getProductById, Product } from "@/services/product.service";

export default function ProductDetail() {
    const [product, setProduct] = useState<Product | null>(null);
    const params = useParams();
    const productId = params.id as string;

    const fetchProduct = async (id: string) => {
        try {
            const data = await getProductById(id);
            setProduct(data);
        } catch (error: any) {
            toast.error(error?.message || "An error occurred while fetching the product.");
        }
    };

    useEffect(() => {
        if (productId) {
            fetchProduct(productId);
        }
    }, [productId]);

    if (!product) {
        return <div className="p-10 font-body text-[11.5px] text-[var(--ink-muted)]">Loading...</div>;
    }

    const primaryImage = product.images?.find((image) => image.isPrimary) ?? product.images?.[0];

    return (
        <div className="space-y-6">
            <div className="flex gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end justify-between">
                <div>
                    <Link href="/admin/products" className="text-sm font-medium text-[var(--gold-deep)] hover:text-[var(--ink)]">
                        <p>&larr; Back to products</p>
                    </Link>
                </div>
                <div>
                    <Link href={`/admin/products/${product.id}/edit`} className="rounded-[2px] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--cream)] transition hover:-translate-y-0.5 hover:bg-[var(--charcoal)]">
                        Edit Product
                    </Link>
                </div>
            </div>

            <div className="rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-8">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                    <div className="flex flex-col items-center lg:w-52">
                        {primaryImage ? (
                            <img
                                src={primaryImage.url}
                                alt={product.name}
                                className="h-52 w-52 rounded-[2px] border object-cover"
                            />
                        ) : (
                            <div className="flex h-52 w-52 items-center justify-center rounded-[2px] bg-[var(--cream-2)] font-body text-[11.5px] text-[var(--ink-muted)]">
                                No image
                            </div>
                        )}

                        <span
                            className={`mt-4 rounded-full px-3 py-1 text-sm font-medium ${
                                product.isActive
                                    ? "bg-[var(--success-bg)] text-[var(--success)]"
                                    :"bg-[var(--danger-bg)] text-[var(--danger)]"
                            }`}
                        >
                            {product.isActive ? "Active" :"Inactive"}
                        </span>
                    </div>

                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-[var(--ink)]">
                            {product.name}
                        </h1>

                        <p className="mt-2 text-[var(--ink-muted)]">
                            {product.shortDescription}
                        </p>

                        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <p className="font-body text-[11.5px] text-[var(--ink-muted)]">SKU</p>
                                <p className="font-medium">{product.sku}</p>
                            </div>

                            <div>
                                <p className="font-body text-[11.5px] text-[var(--ink-muted)]">Category</p>
                                <span className="rounded-full bg-[var(--cream-2)] px-3 py-1 text-sm">
                                    {product.category?.name ?? "—"}
                                </span>
                            </div>

                            <div>
                                <p className="font-body text-[11.5px] text-[var(--ink-muted)]">Price</p>
                                <p className="font-medium">${Number(product.price).toFixed(2)}</p>
                            </div>

                            {product.compareAtPrice && (
                                <div>
                                    <p className="font-body text-[11.5px] text-[var(--ink-muted)]">Compare At Price</p>
                                    <p className="font-medium">${Number(product.compareAtPrice).toFixed(2)}</p>
                                </div>
                            )}

                            <div>
                                <p className="font-body text-[11.5px] text-[var(--ink-muted)]">Featured</p>
                                <p className="font-medium">{product.isFeatured ? "Yes" :"No"}</p>
                            </div>
                        </div>

                        {product.description && (
                            <div className="mt-6">
                                <p className="font-body text-[11.5px] text-[var(--ink-muted)]">Description</p>
                                <p className="mt-1 whitespace-pre-line">{product.description}</p>
                            </div>
                        )}

                        {product.images && product.images.length > 0 && (
                            <div className="mt-6">
                                <p className="mb-3 font-body text-[11.5px] text-[var(--ink-muted)]">Images</p>
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                                    {product.images.map((image) => (
                                        <img
                                            key={image.id}
                                            src={image.url}
                                            alt=""
                                            className="h-32 w-full rounded-[2px] border object-cover"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
