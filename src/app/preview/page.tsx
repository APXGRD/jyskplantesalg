"use client";

import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Sidebar } from "@/components/Sidebar";
import { useNewsletter } from "@/context/NewsletterContext";

export default function PreviewPage() {
  const { result } = useNewsletter();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar active="preview" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <PageHeader title="Preview / Rediger" subtitle="Sådan ser det genererede nyhedsbrev ud" />

        <div className="flex-1 overflow-y-auto p-8">
          {!result ? (
            <div className="flex max-w-xl flex-col gap-2 rounded-xl border border-border bg-white p-6">
              <p className="text-sm font-semibold text-ink">Intet nyhedsbrev genereret endnu</p>
              <p className="text-sm text-ink-muted">
                Gå til{" "}
                <Link href="/opsaetning" className="font-medium text-ink underline">
                  Opsætning
                </Link>{" "}
                for at vælge målgruppe og generere nyhedsbrevet.
              </p>
            </div>
          ) : (
            <div className="max-w-xl overflow-hidden rounded-xl border border-border bg-white">
              <div className="relative h-56 w-full bg-surface-active">
                <Image
                  src={result.image.imageUrl}
                  alt={result.image.altText}
                  fill
                  sizes="576px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col gap-3 p-6">
                <h2 className="text-xl font-semibold text-ink">{result.heading}</h2>
                <p className="text-sm leading-relaxed text-ink-muted">{result.bodyText}</p>
                <a
                  href={result.cta.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-fit items-center rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
                >
                  {result.cta.text}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
