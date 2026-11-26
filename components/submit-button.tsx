"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  nativeSubmit?: boolean;
};

export function SubmitButton({
  children,
  className = "button",
  disabled = false,
  loading = false,
  loadingText = "Saving…",
  nativeSubmit = false,
}: Props) {
  const { pending } = useFormStatus();
  const [nativePending, setNativePending] = useState(false);
  const isLoading = pending || loading || nativePending;

  return (
    <button
      className={className}
      type="submit"
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      onClick={(event) => {
        if (nativeSubmit && event.currentTarget.form?.checkValidity()) {
          setNativePending(true);
        }
      }}
    >
      {isLoading ? loadingText : children}
      {isLoading && <span className="button-loader" aria-hidden="true" />}
    </button>
  );
}
