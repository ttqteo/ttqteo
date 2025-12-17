"use client";

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
      // Compression options
      const options = {
        maxSizeMB: 0.2, // < 200KB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      let fileToUpload = file;

      try {
        // Try to compress
        fileToUpload = await imageCompression(file, options);
      } catch (error) {
        console.error("Image compression failed, using original file", error);
        // Fallback to original file
      }

      const fileExt = fileToUpload.name.split(".").pop();
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
