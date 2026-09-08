"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { CustomerType } from "@/lib/format";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { createDefaultBlocks, type NewsletterBlock } from "@/lib/newsletterBlocks";

export type { CustomerType };

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
  // Blok-listen for Preview/Edit-mode – ligger her (i stedet for som lokal
  // state i preview/page.tsx), så den overlever navigation væk fra og tilbage
  // til Preview-siden, ligesom resten af context'en allerede gjorde.
  blocks: NewsletterBlock[];
  setBlocks: Dispatch<SetStateAction<NewsletterBlock[]>>;
}

const NewsletterContext = createContext<NewsletterContextValue | null>(null);

// Fast localStorage-nøgle for hele udkastet. Ændres denne, mister eksisterende
// brugere deres gemte udkast ved næste deploy – gør det kun bevidst.
const STORAGE_KEY = "jysk-newsletter-draft";

interface PersistedState {
  selectedProductIds: string[];
  customerType: CustomerType;
  instructions: string;
  result: GeneratedNewsletter | null;
  blocks: NewsletterBlock[];
}

const DEFAULT_PERSISTED_STATE: PersistedState = {
  selectedProductIds: [],
  customerType: "privat",
  instructions: "",
  result: null,
  blocks: [],
};

// Fejler stille (privat browsing, fyldt kvote, korrupt/uventet JSON-form) og
// falder tilbage til tom/default state i stedet for at kaste en fejl, der
// ville vælte hele appen.
function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") {
    return DEFAULT_PERSISTED_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PERSISTED_STATE;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_PERSISTED_STATE;
    }
    return {
      selectedProductIds: Array.isArray(parsed.selectedProductIds) ? parsed.selectedProductIds : [],
      customerType: parsed.customerType === "erhverv" ? "erhverv" : "privat",
      instructions: typeof parsed.instructions === "string" ? parsed.instructions : "",
      result: parsed.result ?? null,
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
    };
  } catch {
    return DEFAULT_PERSISTED_STATE;
  }
}

export function NewsletterProvider({ children }: { children: ReactNode }) {
  // NewsletterProvider rendres kun på klienten (se
  // ClientOnlyNewsletterProvider.tsx, ssr:false) – der er derfor ingen
  // server-rendret HTML at være uenig med, og disse lazy-initializers må
  // trygt læse localStorage synkront ved allerførste render, FØR noget andet
  // (inkl. alle sider, der bruger context'en) renderes.
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    () => loadPersistedState().selectedProductIds,
  );
  const [customerType, setCustomerType] = useState<CustomerType>(() => loadPersistedState().customerType);
  const [instructions, setInstructions] = useState(() => loadPersistedState().instructions);
  const [result, setResultState] = useState<GeneratedNewsletter | null>(() => loadPersistedState().result);
  const [blocks, setBlocks] = useState<NewsletterBlock[]>(() => loadPersistedState().blocks);

  function toggleProduct(id: string) {
    setSelectedProductIds((current) =>
      current.includes(id) ? current.filter((productId) => productId !== id) : [...current, id],
    );
  }

  // Sætter både resultatet OG genopbygger blok-listen ud fra det – samme
  // opførsel som det tidligere lokale `useState(() => result ? createDefaultBlocks(...) : [])`
  // i preview/page.tsx havde ved første mount, blot nu ved selve
  // genererings-tidspunktet i stedet for ved Preview-siden mount (så et nyt
  // resultat altid giver en frisk blok-liste, uanset om Preview-siden er
  // mountet endnu). Slår selv de valgte produkter op mod Shopifys rigtige
  // katalog (i stedet for mock-data) – fejler opslaget, bygges blokkene
  // stadig, blot uden produktdata, i stedet for at blokere hele
  // genereringsflowet.
  const setResult = useCallback(
    async (newResult: GeneratedNewsletter | null) => {
      setResultState(newResult);
      if (!newResult) {
        setBlocks([]);
        return;
      }
      let selectedProducts: ShopifyProduct[] = [];
      try {
        const response = await fetch("/api/shopify/products");
        const data = await response.json();
        const allProducts: ShopifyProduct[] = response.ok ? data : [];
        selectedProducts = allProducts.filter((product) => selectedProductIds.includes(product.id));
      } catch {
        // Ignoreres bevidst – se kommentaren ovenfor.
      }
      setBlocks(createDefaultBlocks(newResult, customerType, selectedProducts));
    },
    [selectedProductIds, customerType],
  );

  // Gemmer HELE udkastet til localStorage, hver gang noget i det ændrer sig.
  // try/catch fordi localStorage kan fejle (privat browsing, fyldt kvote) –
  // fejler den, fortsætter appen bare uden persistering i stedet for at gå ned.
  useEffect(() => {
    try {
      const payload: PersistedState = { selectedProductIds, customerType, instructions, result, blocks };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignoreres bevidst – se kommentaren ovenfor.
    }
  }, [selectedProductIds, customerType, instructions, result, blocks]);

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
      blocks,
      setBlocks,
    }),
    [selectedProductIds, customerType, instructions, result, blocks, setResult],
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
