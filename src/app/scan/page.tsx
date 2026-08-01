"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Alert, Button, Card, Space, Typography } from "antd";
import { CameraOutlined, ReloadOutlined } from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";
import UserDetailModal, { UserRecord } from "@/components/UserDetailModal";
import { parseMemberCode } from "@/lib/memberCode";

const { Paragraph, Text } = Typography;

type Status = "idle" | "starting" | "scanning" | "error";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [foundUser, setFoundUser] = useState<UserRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
      handleDecoded(code.data);
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

  const handleDecoded = (text: string) => {
    stopCamera();
    const result = parseMemberCode(text);
    if ("error" in result) {
      setStatus("error");
      setErrorMsg(result.error);
      return;
    }

    setLookingUp(true);
    fetch(`/api/users/lookup?openid=${encodeURIComponent(result.openid)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "查询用户失败");
        setFoundUser(body.user);
        setModalOpen(true);
        setStatus("idle");
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "查询用户失败");
      })
      .finally(() => setLookingUp(false));
  };

  return (
    <AdminLayout>
      <h2 style={{ marginBottom: 24 }}>扫码查询</h2>

      <Card>
        <Paragraph type="secondary">
          调用摄像头扫描用户小程序里的会员二维码，识别后自动校验有效期并弹出该用户的详细资料。
        </Paragraph>

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
          {lookingUp && <Text type="secondary">正在查询用户资料…</Text>}
        </Space>
      </Card>

      <UserDetailModal
        user={foundUser}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdated={(updated) => setFoundUser(updated)}
        onDeleted={() => {
          setModalOpen(false);
          setFoundUser(null);
        }}
      />
    </AdminLayout>
  );
}
