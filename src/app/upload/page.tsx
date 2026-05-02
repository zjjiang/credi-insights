import { ImageDropzone } from "@/components/upload/ImageDropzone";

export default function UploadPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col p-4">
      <h1 className="mb-6 text-xl font-semibold">上传账单截图</h1>
      <ImageDropzone />
    </div>
  );
}
