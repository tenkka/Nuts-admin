"use client";

import { Modal } from "antd";
import RedeemVerifyPanel from "./RedeemVerifyPanel";

export default function RedeemVerifyModal({
  open,
  onClose,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  return (
    <Modal
      title="扫码核销"
      open={open}
      onCancel={onClose}
      destroyOnHidden
      footer={null}
    >
      <RedeemVerifyPanel onCompleted={onCompleted} />
    </Modal>
  );
}
