"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Loader2 } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description: React.ReactNode; // ✅ รองรับ JSX
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}

export default function ConfirmModal({
  open,
  onClose,
  title = "ยืนยันการทำรายการ?",
  description = "การกระทำนี้ไม่สามารถย้อนกลับได้",
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  onConfirm,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose}>
      <div className="text-center">
        {/* Icon */}
        <div className="mb-4 text-5xl text-orange-400">⚠️</div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          {title}
        </h2>

        {/* Description */}
        <div className="mt-2 text-sm text-gray-500">{description}</div>

        {/* Actions */}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300 disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-50"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
