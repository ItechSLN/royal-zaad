"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";

interface ImageUploadProps {
    label?: string;
    files: File[];
    onChange: (files: File[]) => void;
    maxFiles?: number;
}

export default function ImageUpload({
    label = "Images",
    files,
    onChange,
    maxFiles = 10,
}: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (selected: FileList | null) => {
        if (!selected) return;
        const newFiles = [...files, ...Array.from(selected)].slice(
            0,
            maxFiles
        );
        onChange(newFiles);
    };

    const removeImage = (index: number) => {
        onChange(files.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium">
                {label}
            </label>

            <div className="cursor-pointer rounded-[2px] border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center transition hover:border-[var(--border-strong)] hover:bg-[var(--info-bg)]"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                }}
            >
                <ImagePlus
                    size={40}
                    className="mx-auto mb-4 text-gray-500"
                />

                <p className="font-medium">
                    Drag & Drop your images here
                </p>

                <p className="mt-1 text-sm text-gray-500">
                    or click to browse
                </p>

                <button
                    type="button"
                    className="mt-5 rounded border border-dashed border-gray-300 px-5 py-2 text-black hover:bg-[var(--cream-2)] cursor-pointer"
                >
                    Select Images
                </button>

                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>

            {files.length > 0 && (
                <div>
                    <p className="mb-3 text-sm font-medium">
                        Selected Images
                    </p>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                        {files.map((file, index) => (
                            <div
                                key={index}
                                className="group relative overflow-hidden rounded-[2px] border"
                            >
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt=""
                                    className="h-40 w-full object-cover"
                                />

                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition group-hover:opacity-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}