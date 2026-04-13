import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Trash2, Loader2, X } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ImageRecord {
  id: number;
  url: string;
  filename: string;
  sizeBytes: number | null;
  caption: string | null;
}

interface ImageUploadProps {
  entityType: string;
  entityId: number;
}

async function compressImage(file: File, maxSizeKB: number = 50): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      const maxDim = 800;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.7;
      const tryCompress = (): Blob => {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const binary = atob(dataUrl.split(",")[1]);
        const arr = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
        return new Blob([arr], { type: "image/jpeg" });
      };

      let blob = tryCompress();
      while (blob.size > maxSizeKB * 1024 && quality > 0.1) {
        quality -= 0.1;
        blob = tryCompress();
      }

      if (blob.size > maxSizeKB * 1024) {
        const ratio = Math.sqrt((maxSizeKB * 1024) / blob.size);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        blob = tryCompress();
      }

      resolve(blob);
    };
    img.src = url;
  });
}

export function ImageUpload({ entityType, entityId }: ImageUploadProps) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchImages = async () => {
    try {
      const data = await apiGet<ImageRecord[]>(`/images?entityType=${entityType}&entityId=${entityId}`);
      setImages(data);
    } catch {}
    setLoaded(true);
  };

  useEffect(() => { fetchImages(); }, [entityType, entityId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const sizeKB = (compressed.size / 1024).toFixed(1);

      const { uploadURL, objectPath } = await apiPost<{ uploadURL: string; objectPath: string }>("/storage/uploads/request-url", {
        name: file.name.replace(/\.[^.]+$/, ".jpg"),
        size: compressed.size,
        contentType: "image/jpeg",
      });

      await fetch(uploadURL, {
        method: "PUT",
        body: compressed,
        headers: { "Content-Type": "image/jpeg" },
      });

      const imageUrl = `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;

      await apiPost("/images", {
        entityType,
        entityId,
        url: imageUrl,
        filename: file.name,
        sizeBytes: compressed.size,
      });

      toast({ title: `Image uploaded (${sizeKB} KB)` });
      fetchImages();
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (id: number) => {
    try {
      await apiDelete(`/images/${id}`);
      setImages(images.filter(i => i.id !== id));
      toast({ title: "Image removed" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" id={`img-${entityType}-${entityId}`} />
        <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
          {uploading ? "Compressing & Uploading..." : "Add Image"}
        </Button>
        <span className="text-xs text-muted-foreground">Auto-compressed to under 50KB</span>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map(img => (
            <div key={img.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border cursor-pointer" onClick={() => setPreview(img.url)}>
              <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
              <button onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3 w-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate">
                {img.sizeBytes ? `${(img.sizeBytes / 1024).toFixed(0)}KB` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setPreview(null)}><X className="h-8 w-8" /></button>
          <img src={preview} alt="Preview" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}
    </div>
  );
}
