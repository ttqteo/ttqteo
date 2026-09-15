"use client";

import { convertsToWebp, extensionFor } from "@/lib/image-format";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useState } from "react";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      // Đổi sang WebP. Để xuống 200KB, PNG phải nén mất dữ liệu nên chữ trong
      // ảnh chụp màn hình dễ mờ và vỡ màu; WebP giữ ảnh rõ hơn ở cùng dung
      // lượng. GIF và SVG để nguyên, xem lib/image-format.ts.
      const options = {
        maxSizeMB: 0.2, // < 200KB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: 0.85,
      };

      let fileToUpload = file;

      if (convertsToWebp(file.type)) {
        try {
          fileToUpload = await imageCompression(file, options);
        } catch (error) {
          console.error("Image compression failed, using original file", error);
          // Fallback to original file
        }
      }

      // Theo loại thật của nội dung: tên gốc vẫn là `image.png` sau khi đổi.
      const fileExt = extensionFor(fileToUpload.type);
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(filePath, fileToUpload);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("blog-images").getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage, isUploading };
}
