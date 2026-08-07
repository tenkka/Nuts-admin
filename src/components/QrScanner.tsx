"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import jsQR from "jsqr";
import { Alert, Button, Space, Typography } from "antd";
import { CameraOutlined, ReloadOutlined } from "@ant-design/icons";

const { Text } = Typography;

type Status = "idle" | "starting" | "scanning" | "error";

export interface QrScannerHandle {
  /** 让扫码器回到可以重新开始的状态（比如上一次解码出来的内容业务上无效） */
  restart: () => void;
  /** 扫到的内容业务上不合法时，用这个展示原因，样式和摄像头访问失败一致 */
  showError: (message: string) => void;
}

/**
 * 摄像头扫码的通用壳子：负责 getUserMedia + jsQR 逐帧解码这部分机械活，
 * 解码到内容后只是把原始文本丢给 onDecode，具体格式是不是合法由调用方判断——
 * 会员码（NUTS|openid|ts）和核销码（NUTS_REDEEM|orderId）用的是同一个组件。
 */
const QrScanner = forwardRef<
  QrScannerHandle,
  {
    onDecode: (text: string) => void;
    description?: string;
  }
>(function QrScanner({ onDecode, description }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => stopCamera, []);

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data) {
      stopCamera();
      setStatus("idle");
      onDecodeRef.current(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const startScan = async () => {
    setErrorMsg(null);
    setStatus("starting");
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("scanning");
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? `无法访问摄像头：${err.message}` : "无法访问摄像头"
      );
    }
  };

  useImperativeHandle(ref, () => ({
    restart: () => {
      stopCamera();
      setErrorMsg(null);
      setStatus("idle");
    },
    showError: (message: string) => {
      stopCamera();
      setErrorMsg(message);
      setStatus("error");
    },
  }));

  return (
    <div>
      {description && (
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          {description}
        </Text>
      )}

      {errorMsg && (
        <Alert
          type="error"
          showIcon
          title="扫码失败"
          description={errorMsg}
          style={{ marginBottom: 16 }}
        />
      )}

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          aspectRatio: "4 / 3",
          background: "#000",
          borderRadius: 8,
          overflow: "hidden",
          display: status === "scanning" || status === "starting" ? "block" : "none",
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <Space style={{ marginTop: 16 }}>
        {status !== "scanning" && status !== "starting" && (
          <Button type="primary" icon={<CameraOutlined />} onClick={startScan}>
            开始扫码
          </Button>
        )}
        {(status === "scanning" || status === "starting") && (
          <Button
            onClick={() => {
              stopCamera();
              setStatus("idle");
            }}
          >
            停止扫码
          </Button>
        )}
        {status === "error" && (
          <Button icon={<ReloadOutlined />} onClick={startScan}>
            重新扫码
          </Button>
        )}
      </Space>
    </div>
  );
});

export default QrScanner;
