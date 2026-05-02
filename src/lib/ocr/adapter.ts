import type { OcrAdapter } from "./types";
import { MockOcrAdapter } from "./mock";
import { BaiduOcrAdapter } from "./baidu";

export function getOcrAdapter(): OcrAdapter {
  const provider = process.env.OCR_PROVIDER ?? "mock";
  if (provider === "baidu") {
    const apiKey = process.env.BAIDU_OCR_API_KEY;
    const secretKey = process.env.BAIDU_OCR_SECRET_KEY;
    if (!apiKey || !secretKey) {
      throw new Error(
        "BAIDU_OCR_API_KEY and BAIDU_OCR_SECRET_KEY must be set when OCR_PROVIDER=baidu",
      );
    }
    return new BaiduOcrAdapter(apiKey, secretKey);
  }
  return new MockOcrAdapter();
}
