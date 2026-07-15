"use client";
import { useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { compressImages } from "@/lib/upload";

export default function ImageUploadButton({ images, setImages, max = 4 }: { images: string[]; setImages: (imgs: string[]) => void; max?: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    const compressed = await compressImages(files);
    setImages([...images, ...compressed].slice(0, max));
    setLoading(false);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden
        onChange={(e) => handleFiles(e.target.files)} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={loading || images.length >= max}
        className="text-muted hover:accent transition-colors disabled:opacity-40" title="画像を添付">
        <ImageIcon size={18} />
      </button>
      {images.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative w-20 h-20">
              <img src={img} className="w-full h-full object-cover rounded-lg" alt="" />
              <button type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 text-white">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {loading && <span className="text-xs text-muted ml-2">アップロード中...</span>}
    </div>
  );
}
