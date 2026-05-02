"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImageDropzone() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    const url = URL.createObjectURL(selected);
    setPreview(url);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "上传失败");
      }
      const { data } = await res.json();
      router.push(`/uploads/${data.uploadId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-10 text-muted-foreground transition-colors active:bg-muted/60"
      >
        {preview ? (
          <img
            src={preview}
            alt="预览"
            className="max-h-60 w-full rounded-lg object-contain"
          />
        ) : (
          <>
            <ImagePlus className="h-12 w-12 opacity-40" />
            <span className="text-sm">点击选择图片或拍照</span>
          </>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="h-4 w-4" />
          拍照/选图
        </Button>
        <Button
          className="flex-1"
          disabled={!file || uploading}
          onClick={handleUpload}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              上传中...
            </>
          ) : (
            "上传账单"
          )}
        </Button>
      </div>
    </div>
  );
}
