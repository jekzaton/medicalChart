"use client";
import React, { useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // lock scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
  }, [isOpen]);

  if (!isOpen) return null;

  const contentClasses = isFullscreen
    ? "w-full h-full"
    : "relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900";

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* modal */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};
