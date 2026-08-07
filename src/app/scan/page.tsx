"use client";

import { useRef, useState } from "react";
import { Card, Typography } from "antd";
import AdminLayout from "@/components/AdminLayout";
import UserDetailModal, { UserRecord } from "@/components/UserDetailModal";
import QrScanner, { QrScannerHandle } from "@/components/QrScanner";
import { parseMemberCode } from "@/lib/memberCode";

const { Text } = Typography;

export default function ScanPage() {
  const scannerRef = useRef<QrScannerHandle>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [foundUser, setFoundUser] = useState<UserRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleDecoded = (text: string) => {
    const result = parseMemberCode(text);
    if ("error" in result) {
      scannerRef.current?.showError(result.error);
      return;
    }

    setLookingUp(true);
    fetch(`/api/users/lookup?openid=${encodeURIComponent(result.openid)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "查询用户失败");
        setFoundUser(body.user);
        setModalOpen(true);
      })
      .catch((err) => {
        scannerRef.current?.showError(
          err instanceof Error ? err.message : "查询用户失败"
        );
      })
      .finally(() => setLookingUp(false));
  };

  return (
    <AdminLayout>
      <h2 style={{ marginBottom: 24 }}>扫码查询</h2>

      <Card>
        <QrScanner
          ref={scannerRef}
          onDecode={handleDecoded}
          description="调用摄像头扫描用户小程序里的会员二维码，识别后自动校验有效期并弹出该用户的详细资料。"
        />
        {lookingUp && (
          <Text type="secondary" style={{ display: "block", marginTop: 12 }}>
            正在查询用户资料…
          </Text>
        )}
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
