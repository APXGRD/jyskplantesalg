// src/lib/unsubscribeUrl.ts
//
// Den FASTE, generiske afmeldings-URL, brugt i footeren på ALLE
// nyhedsbreve (samme link uanset modtager – "Kopiér nyhedsbrev"-
// arbejdsgangen sender ikke individuelle emails med et personligt
// afmeldings-token pr. modtager). Peger på den offentlige, login-fri
// /afmeld-side (src/app/afmeld/page.tsx). Bruges KUN klient-side
// (NewsletterCard.tsx's Preview og newsletterExport.ts's kopierede HTML/
// tekst, begge kørt i browseren via Preview-siden) – window.location.origin
// er derfor altid tilgængelig i praksis; den relative fallback er kun en
// sikkerhedsforanstaltning.
export function getUnsubscribeUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/afmeld`;
  }
  return "/afmeld";
}
