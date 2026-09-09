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
import { useBrandSettings } from "@/context/BrandSettingsContext";

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
  // Den valgte skabelon på Opsætnings-siden – null betyder "Standard layout"
  // (nuværende, faste blok-struktur). Selve skabelonens indhold hentes ikke
  // her, kun id'et, som sendes med til generate-newsletter/route.ts.
  selectedTemplateId: string | null;
  setSelectedTemplateId: Dispatch<SetStateAction<string | null>>;
  result: GeneratedNewsletter | null;
  // `presetBlocks`, hvis givet, bruges DIREKTE som blocks-listen i stedet for
  // at blive bygget her via createDefaultBlocks – det er sådan
  // skabelon-baseret generering fungerer, da generate-newsletter/route.ts i
  // så fald allerede har bygget den fulde blocks-liste server-side (se
  // opsaetning/page.tsx).
  setResult: (result: GeneratedNewsletter | null, presetBlocks?: NewsletterBlock[]) => void;
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
  selectedTemplateId: string | null;
  result: GeneratedNewsletter | null;
  blocks: NewsletterBlock[];
}

const DEFAULT_PERSISTED_STATE: PersistedState = {
  selectedProductIds: [],
  customerType: "privat",
  instructions: "",
  selectedTemplateId: null,
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
      selectedTemplateId: typeof parsed.selectedTemplateId === "string" ? parsed.selectedTemplateId : null,
      result: parsed.result ?? null,
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
    };
  } catch {
    return DEFAULT_PERSISTED_STATE;
  }
}

export function NewsletterProvider({ children }: { children: ReactNode }) {
  // Bruges som starttilstand for FRISKE nyhedsbreve (se setResult herunder)
  // – ProviderTræet sidder allerede inden i BrandSettingsProvider (se
  // layout.tsx), så denne kan trygt bruges her.
  const brand = useBrandSettings();

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    () => loadPersistedState().selectedTemplateId,
  );
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
  //
  // Er `presetBlocks` givet (skabelon-baseret generering – se
  // opsaetning/page.tsx), bruges den direkte i stedet: generate-newsletter/
  // route.ts har i så fald allerede bygget hele blocks-listen server-side ud
  // fra skabelonens struktur, og der er intet grund til at bygge den igen
  // (eller lave endnu et /api/shopify/products-kald) her.
  const setResult = useCallback(
    async (newResult: GeneratedNewsletter | null, presetBlocks?: NewsletterBlock[]) => {
      setResultState(newResult);
      if (!newResult) {
        setBlocks([]);
        return;
      }
      if (presetBlocks) {
        setBlocks(presetBlocks);
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
      setBlocks(
        createDefaultBlocks(newResult, customerType, selectedProducts, {
          primaryColor: brand.colors[0],
          primaryFont: brand.primaryFont,
        }),
      );
    },
    [selectedProductIds, customerType, brand.colors, brand.primaryFont],
  );

  // Gemmer HELE udkastet til localStorage, hver gang noget i det ændrer sig.
  // try/catch fordi localStorage kan fejle (privat browsing, fyldt kvote) –
  // fejler den, fortsætter appen bare uden persistering i stedet for at gå ned.
  useEffect(() => {
    try {
      const payload: PersistedState = {
        selectedProductIds,
        customerType,
        instructions,
        selectedTemplateId,
        result,
        blocks,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignoreres bevidst – se kommentaren ovenfor.
    }
  }, [selectedProductIds, customerType, instructions, selectedTemplateId, result, blocks]);

  const value = useMemo<NewsletterContextValue>(
    () => ({
      selectedProductIds,
      setSelectedProductIds,
      toggleProduct,
      customerType,
      setCustomerType,
      instructions,
      setInstructions,
      selectedTemplateId,
      setSelectedTemplateId,
      result,
      setResult,
      blocks,
      setBlocks,
    }),
    [selectedProductIds, customerType, instructions, selectedTemplateId, result, blocks, setResult],
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
