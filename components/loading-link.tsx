"use client";

import { useTransition, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function LoadingLink({ href, children, className }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    event.preventDefault();
    if (!isPending) startTransition(() => router.push(href));
  }

  return (
    <Link href={href} className={className} onClick={navigate} aria-busy={isPending}>
      {children}
      {isPending && <span className="button-spinner" aria-hidden="true" />}
    </Link>
  );
}
