"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  nativeSubmit?: boolean;
};

export function SubmitButton({
  children,
  className = "button",
  disabled = false,
  loading = false,
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
      {children}
      {isLoading && <span className="button-spinner" aria-hidden="true" />}
    </button>
  );
}
