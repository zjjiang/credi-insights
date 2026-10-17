"use client";

import { useRef, useState } from "react";
import { Alert, Button } from "antd";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";

interface MsgDropzoneProps {
  onUpload: () => void;
}

export function MsgDropzone({ onUpload }: MsgDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    if (!file.name.endsWith(".msg")) {
      setError("请选择 .msg 文件");
      return;
    }
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const json = await res.json();
    setUploading(false);
    if (json.success) {
      onUpload();
    } else {
      setError(json.error ?? "上传失败");
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".msg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />

      {error && (
        <div
          className="fixed bottom-24 left-4 right-4 z-40"
          onClick={() => setError("")}
        >
          <Alert type="error" showIcon message={error} />
        </div>
      )}

      <Button
        type="primary"
        shape="circle"
        icon={
          uploading ? (
            <LoadingOutlined spin style={{ fontSize: 24 }} />
          ) : (
            <PlusOutlined style={{ fontSize: 24 }} />
          )
        }
        style={{ width: 56, height: 56 }}
        className="fixed bottom-20 right-4 z-50 shadow-lg"
        disabled={uploading}
        onClick={() => !uploading && inputRef.current?.click()}
        aria-label="上传账单"
      />
    </>
  );
}
