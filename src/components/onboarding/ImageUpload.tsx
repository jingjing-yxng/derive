"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";

interface ImageUploadProps {
  sessionId: string;
  onContentAdded: () => void;
}

export function ImageUpload({ sessionId, onContentAdded }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      setError("");

      try {
        for (const file of acceptedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("sessionId", sessionId);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Upload failed");
          }
        }
        onContentAdded();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [sessionId, onContentAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxSize: 10 * 1024 * 1024,
    disabled: uploading,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`flex cursor-pointer items-center gap-4 rounded-[24px] border-2 border-dashed px-5 py-4 transition-all ${
          isDragActive
            ? "border-lavender-400 bg-lavender-50"
            : "border-lavender-200 hover:border-lavender-400/50 hover:bg-lavender-50/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isDragActive ? "bg-lavender-100" : "bg-n-100"}`}>
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-lavender-400" />
          ) : (
            <Upload className="h-5 w-5 text-lavender-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-n-700">
            {isDragActive ? "Drop images here" : "Drag & drop screenshots here"}
          </p>
          <p className="mt-0.5 text-[13px] text-n-500">or click to browse &middot; PNG, JPG, WebP up to 10MB</p>
        </div>
      </div>
      {error && (
        <p className="rounded-[16px] bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
}
