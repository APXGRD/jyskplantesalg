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
  // Fritekst-emne fra det nye "Emne (valgfrit)"-felt på Opsætnings-siden –
  // ADSKILT fra "instructions". Udfyldt betyder "find produkter automatisk
  // via tekstsøgning" i stedet for de manuelt valgte produkter på "Vælg
  // produkter"-siden (selectedProductIds ovenfor RØRES bevidst ikke af
  // dette – de to flows er sideordnede, ikke sammenblandede).
  topic: string;
  setTopic: (text: string) => void;
  // "Kun med billede"-kontakten ved siden af Emne-feltet – samme
  // komponent/stil som "Vælg produkter"-sidens tilsvarende filter (se
  // OnlyWithImageCheckbox.tsx). Default false, så eksisterende opførsel
  // (alle matchende produkter, uanset billede) forbliver uændret, medmindre
  // brugeren aktivt slår den til. Gemt sammen med topic, se
  // generate-newsletter/route.ts og searchCachedProductsByTopic.
  topicOnlyWithImage: boolean;
  setTopicOnlyWithImage: (value: boolean) => void;
  // Den valgte skabelon på Opsætnings-siden – null betyder "Standard layout"
  // (nuværende, faste blok-struktur). Selve skabelonens indhold hentes ikke
  // her, kun id'et, som sendes med til generate-newsletter/route.ts.
  selectedTemplateId: string | null;
  setSelectedTemplateId: Dispatch<SetStateAction<string | null>>;
  result: GeneratedNewsletter | null;
  // HELE det matchede produkt-sæt fra den SENESTE emne-søgnings-baserede
  // generering (ikke kun det ene produkt, billede-blokken endte med at
  // vise) – null, hvis det aktuelle resultat/blocks i stedet stammer fra
  // almindeligt manuelt produktvalg. Bruges af Edit-mode's billede-/
  // galleri-blok-kontroller (EditorBlockList.tsx) til at tilbyde hele
  // emne-udvalget som vælgbare produkter, ikke kun det oprindeligt viste.
  topicMatchedProductIds: string[] | null;
  // `presetBlocks`, hvis givet, bruges DIREKTE som blocks-listen i stedet for
  // at blive bygget her via createDefaultBlocks – det er sådan
  // skabelon-baseret generering fungerer, da generate-newsletter/route.ts i
  // så fald allerede har bygget den fulde blocks-liste server-side (se
  // opsaetning/page.tsx). `matchedProductIds`, hvis givet, er HELE
  // emne-søgningens træfliste (se generate-newsletter/route.ts) – sættes som
  // topicMatchedProductIds; udelades den, nulstilles topicMatchedProductIds
  // (almindeligt manuelt produktvalg).
  setResult: (
    result: GeneratedNewsletter | null,
    presetBlocks?: NewsletterBlock[],
    matchedProductIds?: string[],
  ) => void;
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
  topic: string;
  topicOnlyWithImage: boolean;
  selectedTemplateId: string | null;
  result: GeneratedNewsletter | null;
  topicMatchedProductIds: string[] | null;
  blocks: NewsletterBlock[];
}

const DEFAULT_PERSISTED_STATE: PersistedState = {
  selectedProductIds: [],
  customerType: "privat",
  instructions: "",
  topic: "",
  topicOnlyWithImage: false,
  selectedTemplateId: null,
  result: null,
  topicMatchedProductIds: null,
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
      topic: typeof parsed.topic === "string" ? parsed.topic : "",
      topicOnlyWithImage: typeof parsed.topicOnlyWithImage === "boolean" ? parsed.topicOnlyWithImage : false,
      selectedTemplateId: typeof parsed.selectedTemplateId === "string" ? parsed.selectedTemplateId : null,
      result: parsed.result ?? null,
      topicMatchedProductIds: Array.isArray(parsed.topicMatchedProductIds) ? parsed.topicMatchedProductIds : null,
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
  const [topic, setTopic] = useState(() => loadPersistedState().topic);
  const [topicOnlyWithImage, setTopicOnlyWithImage] = useState(
    () => loadPersistedState().topicOnlyWithImage,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    () => loadPersistedState().selectedTemplateId,
  );
  const [result, setResultState] = useState<GeneratedNewsletter | null>(() => loadPersistedState().result);
  const [topicMatchedProductIds, setTopicMatchedProductIds] = useState<string[] | null>(
    () => loadPersistedState().topicMatchedProductIds,
  );
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
    async (
      newResult: GeneratedNewsletter | null,
      presetBlocks?: NewsletterBlock[],
      matchedProductIds?: string[],
    ) => {
      setResultState(newResult);
      // Sat af generate-newsletter/route.ts, kun ved emne-søgning – HELE det
      // matchede sæt, ikke kun det ene produkt, billede-blokken viser (se
      // Edit-mode's billede-/galleri-blok-kontroller, som bruger denne til at
      // tilbyde hele udvalget). Nulstilles ved almindeligt manuelt
      // produktvalg (matchedProductIds er da undefined).
      setTopicMatchedProductIds(matchedProductIds ?? null);
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
        // Læser fra den lokale Supabase-cache (samme som "Vælg produkter"-
        // siden), IKKE det direkte, fuldt paginerede /api/shopify/products –
        // det sidste kan tage 20-30+ sekunder ved 900+ produkter, og blev
        // desuden allerede kaldt/vist på "Vælg produkter"-siden. At kalde det
        // IGEN her (og en tredje gang på selve Preview-siden) var den
        // væsentligste kilde til en langsomt opfattet app.
        const response = await fetch("/api/products/cached");
        const data = await response.json();
        const allProducts: ShopifyProduct[] = response.ok ? data.products : [];
        if (matchedProductIds) {
          // Emne-søgning: ÉT repræsentativt produkt til billede-blokken –
          // generate-newsletter/route.ts har allerede sat
          // newResult.image.productId til dette produkt, så
          // createDefaultBlocks's egen opslagslogik finder det korrekt her.
          // IKKE automatisk et galleri, selvom mange produkter matchede
          // emnet – kun ÉT element i selectedProducts sikrer det.
          const matchedProducts = allProducts.filter((product) => matchedProductIds.includes(product.id));
          const representative =
            matchedProducts.find((product) => product.id === newResult.image.productId) ?? matchedProducts[0];
          selectedProducts = representative ? [representative] : [];
        } else {
          selectedProducts = allProducts.filter((product) => selectedProductIds.includes(product.id));
        }
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
        topic,
        topicOnlyWithImage,
        selectedTemplateId,
        result,
        topicMatchedProductIds,
        blocks,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignoreres bevidst – se kommentaren ovenfor.
    }
  }, [
    selectedProductIds,
    customerType,
    instructions,
    topic,
    topicOnlyWithImage,
    selectedTemplateId,
    result,
    topicMatchedProductIds,
    blocks,
  ]);

  const value = useMemo<NewsletterContextValue>(
    () => ({
      selectedProductIds,
      setSelectedProductIds,
      toggleProduct,
      customerType,
      setCustomerType,
      instructions,
      setInstructions,
      topic,
      setTopic,
      topicOnlyWithImage,
      setTopicOnlyWithImage,
      selectedTemplateId,
      setSelectedTemplateId,
      result,
      topicMatchedProductIds,
      setResult,
      blocks,
      setBlocks,
    }),
    [
      selectedProductIds,
      customerType,
      instructions,
      topicOnlyWithImage,
      topic,
      selectedTemplateId,
      result,
      topicMatchedProductIds,
      blocks,
      setResult,
    ],
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
