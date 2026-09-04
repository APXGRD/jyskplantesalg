// lib/mock/mockShopifyData.ts
//
// Mock-data i SAMME FORM som det, Jysk Plantesalgs rigtige Shopify Admin API-kald
// skal returnere. Baseret på deres faktiske kategorier og prisniveau (specialist i
// store solitærtræer, ikke almindelige buketter) — skift den ud med en rigtig
// fetchShopifyProducts()-funktion, når access-token'en er på plads.

export interface ShopifyProduct {
  id: string;
  title: string;
  subtitle: string;
  price: number; // kr., inkl. moms
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
