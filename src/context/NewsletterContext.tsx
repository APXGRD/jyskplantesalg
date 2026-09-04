"use client";

import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

export type CustomerType = "privat" | "erhverv";

export interface GeneratedNewsletter {
  heading: string;
  bodyText: string;
  image: { productId: string; imageUrl: string; altText: string };
  cta: { text: string; url: string };
}

interface NewsletterContextValue {
  selectedProductIds: string[];
  setSelectedProductIds: Dispatch<SetStateAction<string[]>>;
  toggleProduct: (id: string) => void;
  customerType: CustomerType;
  setCustomerType: (type: CustomerType) => void;
  instructions: string;
  setInstructions: (text: string) => void;
  result: GeneratedNewsletter | null;
  setResult: (result: GeneratedNewsletter | null) => void;
}

const NewsletterContext = createContext<NewsletterContextValue | null>(null);

export function NewsletterProvider({ children }: { children: ReactNode }) {
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType>("privat");
  const [instructions, setInstructions] = useState("");
  const [result, setResult] = useState<GeneratedNewsletter | null>(null);

  function toggleProduct(id: string) {
    setSelectedProductIds((current) =>
      current.includes(id) ? current.filter((productId) => productId !== id) : [...current, id],
    );
  }

  const value = useMemo<NewsletterContextValue>(
    () => ({
      selectedProductIds,
      setSelectedProductIds,
      toggleProduct,
      customerType,
      setCustomerType,
      instructions,
      setInstructions,
      result,
      setResult,
    }),
    [selectedProductIds, customerType, instructions, result],
  );

  return <NewsletterContext.Provider value={value}>{children}</NewsletterContext.Provider>;
}

export function useNewsletter() {
  const context = useContext(NewsletterContext);
  if (!context) {
    throw new Error("useNewsletter skal bruges inden i en NewsletterProvider");
  }
  return context;
}
