// lib/mock/mockShopifyData.ts
//
// Mock-data i SAMME FORM som det, Jysk Plantesalgs rigtige Shopify Admin API-kald
// skal returnere. "Multistammet" har bevidst 7 produkter her (i stedet for 1-2), så
// I kan teste "vælg hele kategorien"-flowet ved en skala, der minder om det rigtige
// katalog (900+ produkter) — med kun 1-2 pr. kategori ser I aldrig, om AI-teksten og
// Produktvisnings-blokken holder ved flere valgte produkter på én gang.
//
// Skift denne fil ud med en rigtig fetchShopifyProducts()-funktion, når access-
// token'en er på plads.

import { brand } from "@/config/brand";

export interface ShopifyProduct {
  id: string;
  title: string;
  price: number; // kr., inkl. moms
  imageUrl: string;
  url: string;
  productType: string; // matcher deres kategori-struktur (Multistammet, Tagklippet osv.)
  tags: string[];
  hasImage: boolean;
}

// Kategori-/collection-URL'er — bruges som CTA-mål, når flere produkter af SAMME type er
// valgt på én gang (fx "vælg hele Multistammet-kategorien"). Peger på Jysk Plantesalgs
// rigtige kategori-sider, i modsætning til produkternes individuelle "url"-felt.
export const collectionUrls: Record<string, string> = {
  Multistammet: "https://jyskplantesalg.dk/collections/multistammet",
  "Svævende hæk": "https://jyskplantesalg.dk/collections/svaevende-haek",
  Tagklippet: "https://jyskplantesalg.dk/collections/tagklippet",
  Busk: "https://jyskplantesalg.dk/collections/buske",
  Kugleformet: "https://jyskplantesalg.dk/collections/kugleformet",
  Søjleformet: "https://jyskplantesalg.dk/collections/sojleformet",
  Solitær: "https://jyskplantesalg.dk/collections/solitaer",
};

export const mockShopData = {
  storeName: brand.name,
  brandTone: brand.tone,
  products: [
    // ---- Multistammet: 7 produkter, til test af "vælg hele kategorien" ----
    {
      id: "1",
      title: "Acer palmatum 'Bloodgood' - Japansk ahorn, rød bladet - Multistammet",
      price: 49375,
      imageUrl: "https://picsum.photos/seed/acer-bloodgood/600/400",
      url: "https://jyskplantesalg.dk/collections/frontpage/products/acer-palmatum-bloodgood-multistammet_acer45",
      productType: "Multistammet",
      tags: ["japansk-ahorn", "roedbladet"],
      hasImage: true,
    },
    {
      id: "6",
      title: "Quercus robur - Stilkeg - Multistammet solitær",
      price: 28750,
      imageUrl: "https://picsum.photos/seed/quercus-robur/600/400",
      url: "https://jyskplantesalg.dk/collections/multistammet/products/quercus-robur-multistammet",
      productType: "Multistammet",
      tags: ["stilkeg", "solitaer"],
      hasImage: true,
    },
    {
      id: "7",
      title: "Betula pendula - Vortebirk - Multistammet",
      price: 18450,
      imageUrl: "https://picsum.photos/seed/betula-pendula/600/400",
      url: "https://jyskplantesalg.dk/collections/multistammet/products/betula-pendula-multistammet",
      productType: "Multistammet",
      tags: ["vortebirk"],
      hasImage: true,
    },
    {
      id: "8",
      title: "Amelanchier lamarckii - Kanadisk bærmispel - Multistammet",
      price: 12900,
      imageUrl: "https://picsum.photos/seed/amelanchier/600/400",
      url: "https://jyskplantesalg.dk/collections/multistammet/products/amelanchier-lamarckii-multistammet",
      productType: "Multistammet",
      tags: ["baermispel", "blomstrende"],
      hasImage: true,
    },
    {
      id: "9",
      title: "Cornus kousa - Kousa kornel - Multistammet",
      price: 15300,
      imageUrl: "https://picsum.photos/seed/cornus-kousa/600/400",
      url: "https://jyskplantesalg.dk/collections/multistammet/products/cornus-kousa-multistammet",
      productType: "Multistammet",
      tags: ["kornel", "blomstrende"],
      hasImage: true,
    },
    {
      id: "10",
      title: "Prunus serrulata 'Kanzan' - Japansk kirsebær - Multistammet",
      price: 21750,
      imageUrl: "https://picsum.photos/seed/prunus-kanzan/600/400",
      url: "https://jyskplantesalg.dk/collections/multistammet/products/prunus-serrulata-kanzan-multistammet",
      productType: "Multistammet",
      tags: ["kirsebaer", "blomstrende"],
      hasImage: true,
    },
    {
      id: "11",
      title: "Carpinus betulus - Avnbøg - Multistammet",
      price: 16800,
      imageUrl: "https://picsum.photos/seed/carpinus-multistammet/600/400",
      url: "https://jyskplantesalg.dk/collections/multistammet/products/carpinus-betulus-multistammet",
      productType: "Multistammet",
      tags: ["avnboeg"],
      hasImage: true,
    },

    // ---- Øvrige kategorier: 1-2 hver, som før ----
    {
      id: "2",
      title: "Malus toringo - Paradisæble - Svævende hæk",
      price: 11218.75,
      imageUrl: "https://picsum.photos/seed/malus-toringo/600/400",
      url: "https://jyskplantesalg.dk/collections/frontpage/products/malus-toringo-paradisaeble-svaevende-haek_malus10135",
      productType: "Svævende hæk",
      tags: ["paradisaeble", "blomstrende"],
      hasImage: true,
    },
    {
      id: "3",
      title: "Platanus hispanica - Platan - Tagklippet",
      price: 9875,
      imageUrl: "https://picsum.photos/seed/platanus/600/400",
      url: "https://jyskplantesalg.dk/collections/frontpage/products/platanus-hispanica-tagklippet_platanus10008",
      productType: "Tagklippet",
      tags: ["platan"],
      hasImage: true,
    },
    {
      id: "4",
      title: "Rhododendron catawbiense 'Grandiflorum'",
      price: 1495,
      imageUrl: "https://picsum.photos/seed/rhododendron/600/400",
      url: "https://jyskplantesalg.dk/collections/rhododendron/products/rhododendron-catawbiense-grandiflorum",
      productType: "Busk",
      tags: ["stedsegroen", "blomstrende"],
      hasImage: true,
    },
    {
      id: "5",
      title: "Buxus sempervirens - Buksbom - Kugleformet",
      price: 2250,
      imageUrl: "https://picsum.photos/seed/buksbom/600/400",
      url: "https://jyskplantesalg.dk/collections/kugleformet/products/buxus-sempervirens-kugleformet",
      productType: "Kugleformet",
      tags: ["buksbom", "stedsegroen"],
      hasImage: true,
    },
    {
      id: "12",
      title: "Carpinus betulus 'Fastigiata' - Avnbøg - Søjleformet",
      price: 6450,
      imageUrl: "https://picsum.photos/seed/carpinus-fastigiata/600/400",
      url: "https://jyskplantesalg.dk/collections/sojleformet/products/carpinus-betulus-fastigiata",
      productType: "Søjleformet",
      tags: ["avnboeg"],
      hasImage: true,
    },
    {
      id: "13",
      title: "Taxus baccata - Taks - Kugleformet",
      price: 3200,
      imageUrl: "https://picsum.photos/seed/taxus-baccata/600/400",
      url: "https://jyskplantesalg.dk/collections/kugleformet/products/taxus-baccata-kugleformet",
      productType: "Kugleformet",
      tags: ["taks", "stedsegroen"],
      hasImage: true,
    },
    {
      id: "14",
      title: "Pinus sylvestris 'Watereri' - Skovfyr - Naturlig form",
      price: 7900,
      imageUrl: "https://picsum.photos/seed/pinus-watereri/600/400",
      url: "https://jyskplantesalg.dk/collections/solitaer/products/pinus-sylvestris-watereri",
      productType: "Solitær",
      tags: ["skovfyr", "stedsegroen"],
      hasImage: true,
    },
  ] as ShopifyProduct[],
};

// Når det rigtige API er koblet på, laver I bare en funktion med denne signatur:
//
//   async function fetchShopifyProducts(filters?: { productType?: string; search?: string }) {
//     ... rigtigt Admin API-kald her ...
//     return { storeName, brandTone, products };
//   }
//
// og bruger dens resultat i stedet for mockShopData, alle andre steder i koden.
