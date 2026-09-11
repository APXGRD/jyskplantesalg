// src/lib/searchWords.ts
//
// Renser en fritekst (Opsætnings-sidens samlede "Beskriv dit nyhedsbrev"-felt)
// ned til de meningsfulde søgeord – ÉN central kilde, genbrugt BÅDE af selve
// produktmatchningen (searchCachedProductsByTopic, cachedProducts.ts) OG af
// CTA-knappens søgeside-fallback-link (resolveCtaLink, ctaLink.ts), så de to
// aldrig kan komme ud af trit (fx knappen linkende til noget andet, end det
// der faktisk blev søgt efter). Ren tekstbehandling, INGEN Supabase-/
// server-afhængighed – importerbar fra BÅDE server (generate-newsletter/
// route.ts, cachedProducts.ts) og klient (EditorBlockList.tsx, via ctaLink.ts).

// Danske "fyld-ord" – relevante for sætningsstrukturen ("lav en nyhedsbrev
// omkring ahorn"), ikke for selve søgningen. Fjernes fra teksten, FØR den
// splittes op og bruges til matchning, så en hel, naturlig sætning giver
// samme resultat som en ren søgning på blot det/de meningsfulde ord ("ahorn").
//
// "professionel"/"tone"/"erhvervskunder"/"privatkunder"/"fokus"/"vidende" er
// tilføjet, efter Opsætnings-sidens Emne- og instruks-felter blev
// konsolideret til ÉT samlet felt ("Beskriv dit nyhedsbrev") – feltet kan nu
// indeholde en FULD tone-/målgruppe-instruks (fx "...i en professionel tone
// til vores erhvervskunder om...") OGSÅ når det bruges til søgning (ingen
// produkter manuelt valgt), ikke kun et kort emneord som før. Uden disse
// ville almindelige instruks-ord ende med at indgå i selve produktsøgningen
// og kunne give falske træf via en tilfældig substring (fx "tone" matcher
// plante-slægtsnavnet "Cotoneaster").
const DANISH_STOP_WORDS = new Set([
  "lav",
  "en",
  "et",
  "om",
  "omkring",
  "vores",
  "nyhedsbrev",
  "til",
  "for",
  "med",
  "og",
  "på",
  "i",
  "den",
  "det",
  "de",
  "skriv",
  "generer",
  "professionel",
  "tone",
  "erhvervskunder",
  "privatkunder",
  "fokus",
  "vidende",
]);

// Fjerner den mest almindelige danske bøjningsendelse fra ET enkelt ord –
// afsluttende "er", ellers afsluttende "s" eller "e" – FØR det sammenlignes.
// Anvendes på BÅDE søgeordene (extractSearchWordCandidates herunder) OG de
// enkelte ord i title/productType/tags (tokenizeAndNormalize i
// cachedProducts.ts), så fx
// "ahorns"/"blommetræer" i søgeteksten matcher "Ahorn"/"Blommetræ" i
// kataloget, og omvendt en flertals-titel matcher et entals-søgeord – ÉN
// generel regel i stedet for hardcodede specialtilfælde pr. ordpar. Kun ord
// længere end 3 tegn normaliseres, så et kort ord ikke bliver meningsløst
// kort/tomt (og for at undgå at korte, allerede entydige ord som "eg" eller
// "ny" ændres). Ingen fuld dansk stemming – kun denne ene, brede regel.
export function normalizeWord(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("er")) return word.slice(0, -2);
  if (word.endsWith("s") || word.endsWith("e")) return word.slice(0, -1);
  return word;
}

// Et enkelt søgeords to former: den OPRINDELIGE, u-normaliserede stavemåde
// (som skrevet i feltet, fx "ahorns"/"blommetræer") og den normaliserede
// form, selve produktmatchningen sammenligner med (normalizeWord, fx
// "ahorn"/"blommetræ"). At holde begge former ved hånden lader kaldere som
// searchCachedProductsByTopic (cachedProducts.ts) bruge normalized til selve
// matchningen, men rapportere ORIGINAL tilbage for de ord, der rent faktisk
// gav et match – fx til CTA-knappens søgeside-fallback-link (resolveCtaLink),
// som skal linke til den stavemåde, brugeren selv skrev, ikke den afkortede,
// normaliserede form.
export interface SearchWordCandidate {
  original: string;
  normalized: string;
}

// Splitter en fritekst op i enkeltord og fjerner danske fyld-ord
// (DANISH_STOP_WORDS) – PRÆCIS de kandidat-ord, selve produktmatchningen
// afprøver (efter normalisering, se normalized-feltet). Kaldere, der skal
// bygge noget ud fra "hvad blev der reelt søgt efter", skal bruge DENNE
// funktion i stedet for at gen-implementere rensningen selv, så de to aldrig
// kan afvige.
export function extractSearchWordCandidates(topic: string): SearchWordCandidate[] {
  return topic
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0 && !DANISH_STOP_WORDS.has(word))
    .map((word) => ({ original: word, normalized: normalizeWord(word) }));
}
