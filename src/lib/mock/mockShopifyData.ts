// lib/mock/mockShopifyData.ts
//
// Mock-data i SAMME FORM som det, Jysk Plantesalgs rigtige Shopify Admin API-kald
// skal returnere. Baseret på deres faktiske kategorier og prisniveau (specialist i
// store solitærtræer, ikke almindelige buketter) — skift den ud med en rigtig
// fetchShopifyProducts()-funktion, når access-token'en er på plads.
//
// NB: imageUrl er placeholder-billeder til AI-genereringen og preview'et. Selve
// "Vælg produkter"-tabellen viser bevidst IKKE disse billeder (kun et generisk
// ikon), da de ikke er rigtige produktfotos – se ProductRow.tsx.

export interface ShopifyProduct {
  id: string;
  title: string;
  subtitle: string;
  price: number; // kr., inkl. moms
  imageUrl: string;
  url: string;
  productType: string; // matcher deres kategori-struktur (Multistammet, Tagklippet osv.)
  tags: string[];
  hasImage: boolean;
}

export const mockShopData = {
  storeName: "Jysk Plantesalg",
  brandTone:
    "vidende, professionel og jordnær – med fokus på kvalitet og ekspertise i store solitærtræer",
  products: [
    {
      id: "1",
      title: "Acer palmatum 'Bloodgood'",
      subtitle: "Japansk ahorn – Multistammet",
      price: 49375,
      imageUrl: "https://picsum.photos/seed/acer-bloodgood/600/400",
      url: "https://jyskplantesalg.dk/collections/frontpage/products/acer-palmatum-bloodgood-multistammet_acer45",
      productType: "Multistammet",
      tags: ["japansk-ahorn", "roedbladet"],
      hasImage: true,
    },
    {
      id: "2",
      title: "Malus toringo",
      subtitle: "Paradisæble – Svævende hæk",
      price: 11218,
      imageUrl: "https://picsum.photos/seed/malus-toringo/600/400",
      url: "https://jyskplantesalg.dk/collections/frontpage/products/malus-toringo-paradisaeble-svaevende-haek_malus10135",
      productType: "Hæk",
      tags: ["paradisaeble", "blomstrende"],
      hasImage: true,
    },
    {
      id: "3",
      title: "Platanus hispanica",
      subtitle: "Platan – Tagklippet",
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
      subtitle: "Stor stedsegrøn busk",
      price: 1495,
      imageUrl: "https://picsum.photos/seed/rhododendron/600/400",
      url: "https://jyskplantesalg.dk/collections/rhododendron/products/rhododendron-catawbiense-grandiflorum",
      productType: "Busk",
      tags: ["stedsegroen", "blomstrende"],
      hasImage: true,
    },
    {
      id: "5",
      title: "Buxus sempervirens",
      subtitle: "Buksbom – Kugleformet",
      price: 2250,
      imageUrl: "https://picsum.photos/seed/buksbom/600/400",
      url: "https://jyskplantesalg.dk/collections/kugleformet/products/buxus-sempervirens-kugleformet",
      productType: "Kugleformet",
      tags: ["buksbom", "stedsegroen"],
      hasImage: true,
    },
    {
      id: "6",
      title: "Carpinus betulus 'Fastigiata'",
      subtitle: "Avnbøg – Søjleformet",
      price: 6450,
      imageUrl: "https://picsum.photos/seed/carpinus-fastigiata/600/400",
      url: "https://jyskplantesalg.dk/collections/frontpage/products/carpinus-betulus-fastigiata-soejleformet",
      productType: "Søjleformet",
      tags: ["avnboeg"],
      hasImage: true,
    },
    {
      id: "7",
      title: "Taxus baccata",
      subtitle: "Taks – Kugleformet",
      price: 3200,
      imageUrl: "https://picsum.photos/seed/taxus-baccata/600/400",
      url: "https://jyskplantesalg.dk/collections/kugleformet/products/taxus-baccata-kugleformet",
      productType: "Kugleformet",
      tags: ["taks", "stedsegroen"],
      hasImage: true,
    },
    {
      id: "8",
      title: "Quercus robur",
      subtitle: "Stilkeg – Multistammet solitær",
      price: 28750,
      imageUrl: "https://picsum.photos/seed/quercus-robur/600/400",
      url: "https://jyskplantesalg.dk/collections/frontpage/products/quercus-robur-multistammet-solitaer",
      productType: "Multistammet",
      tags: ["eg", "solitaer"],
      hasImage: true,
    },
    {
      id: "9",
      title: "Pinus sylvestris 'Watereri'",
      subtitle: "Skovfyr – Naturlig form",
      price: 7900,
      imageUrl: "https://picsum.photos/seed/pinus-watereri/600/400",
      url: "https://jyskplantesalg.dk/collections/frontpage/products/pinus-sylvestris-watereri",
      productType: "Solitær",
      tags: ["skovfyr", "stedsegroen"],
      hasImage: true,
    },
    {
      id: "10",
      title: "Fagus sylvatica 'Purpurea'",
      subtitle: "Rødbøg – Tagklippet form",
      price: 14375,
      imageUrl: "https://picsum.photos/seed/fagus-purpurea/600/400",
      url: "https://jyskplantesalg.dk/collections/frontpage/products/fagus-sylvatica-purpurea-tagklippet",
      productType: "Tagklippet",
      tags: ["boeg", "roedbladet"],
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
