# 🎯 SEARCHPLAN — Google Ads (fizetett keresőhirdetés) terv + napló

> Ez a fizetett **Google Ads Search** kampány kanonikus dokumentuma — a `seoplan.md` párja, csak a paid szálra. Itt rögzítjük, mi történt, mi a kampány-struktúra, és mik a (fázisos) bővítési tervek.

---

## ⭐ HOL TARTUNK MOST (2026-06-12 este)

- **Státusz:** A `Search – Petty Cash Software` kampány **ÉL és kiszolgál** — az első nap végén **12 megjelenítés, 0 kattintás, $0 költség**.
- **Konverziókövetés:** bekötve és tiszta (lásd `A.3`). A SIGNUP konverzió Adsben **Aktív**.
- **Stratégia:** szűk, célzott, kontrollált. Most **tanulási fázis** — a következő ~1-2 hétben **NEM bővítünk**, csak adatot gyűjtünk.
- **Bid:** „Kattintások maximalizálása", **CPC-plafon levéve**.
- **Reális elvárás:** kis niche, kis keret → napi pár megjelenés/kattintás. A cél most **validáció** (jön-e releváns klikk, konvertál-e a landing), nem profit.

---

## A. MIT CSINÁLTUNK MA (2026-06-12)

A nap eleji állapot: **0 megjelenés** egész nap + **hibás konverziómérés** (a GA4 „2 kulcsesemény" valójában meg nem erősített regisztrációs kísérlet volt). Estére: **futó, jól célzott kampány + tiszta mérési lánc.**

### A.1 Kampány alapszerkezet

| Elem | Érték |
|---|---|
| Fiók | `987-813-5415` SpendNote (sildys@gmail.com) |
| Kampány | `Search – Petty Cash Software` (közzétéve 2026-06-12) |
| Hirdetéscsoport | `1. hirdetéscsoport` (Petty Cash Software) |
| Típus | **csak Keresési hálózat** (Search Partners KI, Display KI) |
| Ajánlattétel | **Kattintások maximalizálása** — CPC-plafon **levéve** (szabad licit, hogy belépjen az aukciókba) |
| Napi keret | **6,09 USD/nap** (megerősítve 2026-06-13) |
| Eszközök | mind engedélyezve (a mobil **nem** lett kikapcsolva ezen a kampányon — a régi, szüneteltetett PMax kampányon volt) |

### A.2 Kulcsszavak (mind Phrase/Exact — NINCS broad)

**Mag (commercial intent):**
`[petty cash software]`, `[petty cash app]`, `"petty cash software"`, `"petty cash app"`, `"petty cash management software"`, `"petty cash tracker"`, `"petty cash app for small business"`

**1. bővítés (éjszaka — volumen-növelés):**
`"cash receipt app"`, `"cash tracking app"`, `"petty cash book app"`, `"petty cash log app"`, `"track petty cash online"`, `"digital petty cash book"`, `"petty cash spreadsheet alternative"`, `"small business cash tracking app"`, `"petty cash software for small business"`, `"cash log app"`

**2. bővítés (Google-javaslatokból, Phrase-re állítva):**
`"petty cash management system"`, `"petty cash application"`, `"petty cash accounting software"`

**Commonwealth (UK/AU szóhasználat):**
`"petty cash book"`, `"petty cash float"`, `"petty cash imprest"`, `"imprest system"`

> ⚠️ A hosszú farkú kifejezések egy része **„Nem jogosult / Alacsony keresési arány"** státuszban van — ez **normális** (kis niche), nem hiba, magától aktiválódhat, ha lesz rá kereslet. Nem kell törölni.

### A.3 Konverziókövetés (a nap fő technikai munkája)

**Diagnózis:** A GA4 „2 kulcsesemény (jún. 10.)" valójában a régi `signup_completed` esemény volt, ami **az e-mail megerősítése ELŐTT** tüzelt (a Supabase signUp() pillanatában) → meg nem erősített kísérletek számolódtak konverzióként, miközben **0 valódi regisztráció** volt.

**Kód-javítások:**

| Commit | Mit | Miért |
|---|---|---|
| `d4fd6aa` | `sign_up` GA4 esemény a welcome oldalra (1×/uid, `method` param) | Egyetlen igazságforrás: minden befejezett regisztráció ide landol (e-mail-megerősített / instant / OAuth) |
| `d9f9108` | `signup_completed` → **`signup_attempt`** (signup oldal); redundáns login-oldali `signup_completed` **törölve** | A korán tüzelő esemény ne számítson konverziónak; egy forrás maradjon |
| `9b944b8` | Welcome oldal: `gtag('event', 'conversion_event_signup')` a `sign_up` mellé | A Google Ads SIGNUP konverzió elsütése |

**Google Ads oldal:**
- Konverzió: **SIGNUP** (kategória: Feliratkozás) — **Forrás: Webhely (Google Analytics GA4)**, **Elsődleges**, **Aktív**.
- Mivel GA4-forrású és a GA4 címke (`G-QPFM30F86Q`) már fent van az oldalon + GA4↔Ads összekötve → **nem kellett külön `AW-` tag**. A `conversion_event_signup` esemény a meglévő GA4 címkén keresztül megy át.
- Mérési mód: **Oldalbetöltés** (a regisztráció utáni welcome oldalon).

### A.4 Geo + piacok

Bővítve **6 angol nyelvű országra** (mind **Ország** szinten, **Jelenlét/Presence** célzással):
**USA, Egyesült Királyság, Kanada, Ausztrália, Írország, Új-Zéland.**
(Indok: kis niche → több angol piac = több jogosult keresés; a „petty cash" eleve brit/nemzetközösségi szóhasználat.)

### A.5 Egyéb

- **Hirdető-igazolás:** elvégezve előre (cégkivonat + útlevél) — jövőbeli kockázat kipipálva.
- **Search Console ↔ Google Ads:** összekötve (`https://spendnote.app`) → kombinált „Fizetett és organikus" riport.
- **Hirdetés:** „Petty Cash Software | Petty Cash App for Teams | Track Cash in Seconds" — **Jóváhagyva**.
- **Sitelinkek:** Pricing, Petty Cash App, Receipt Generator, Digital Cash Book (mentés akadozott — *ellenőrizni az Eszközök/Assets fülön*).

### A.6 Mai eredmény (nap vége + másnap hajnal)

- **Nap vége:** 12 megjelenítés, 0 kattintás.
- **2026-06-13 ~02:40:** **26 megjelenítés, 1 kattintás, ~3,8% CTR, Átl. CPC $2,64** — egészséges első nap. A kattintás a **`"cash receipt app"`** kulcsszóból jött → a **receipt-angle húz**.
- **Eszközök:** ~96% mobil.
- **Keresési kifejezések:** `cash receipt app` ✅, `petty cash book` ✅, `small cash book` ✅, `receipts for cash` ✅; ⚠️ `receipt snapping apps` (OCR/szkennelő — más kategória).

### A.7 Korai optimalizálás (2026-06-13 hajnal)

- **Kizáró kulcsszavak hozzáadva** (szkennelő/OCR kategória kiszűrése, a `receipt` szándék bántása nélkül): `snapping`, `snap`, `scanner`, `scanning`, `scan`, `ocr`.

**2. kizáró-kör (2026-06-13 ~14:00, adat-alapon — 75 megj / 3 klikk után):** a keresési kifejezések erős **budgeting / personal finance szivárgást** mutattak (`rocket money`, `budgeting app(s)`, `budget app`, `android budget app`, `actual budget`, `app for net worth tracking`, `bill tracker app`). Hozzáadott negatívok: `budget`, `budgeting`, `budgets`, `rocket money`, `net worth`, `bill tracker`, `personal finance`. Indok: SpendNote = petty cash / céges készpénz, NEM személyi budgeting. Mellékhaszon: a budgeting kulcsszavak drágák → CPC is csökkenhet (eddig $3,16). On-target klikkek eddig: `cash receipt app` (2, 7,69% CTR), `petty cash book` (1, 16,67% CTR).
- **CÉLOLDAL-DÖNTÉS:** a hirdetés Végső URL-je **`petty-cash-software` → `https://spendnote.app/` (főoldal)**. Indok: a főoldal **bizonyítottan konvertál** (organikus regisztrációk), **petty-cash-releváns** (QS OK), és **minden angle-t lefed** (software/app/receipt/handoff) — tehát a sokféle kulcsszónak egyszerre releváns. A `petty-cash-software` / `petty-cash-receipt-generator` stb. a 2. fázisú intent-szerinti ad group landingjei lesznek. **(✅ Elvégezve a Google Ads UI-ban — Végső URL = `https://spendnote.app`.)**
- **POLICY-EPIZÓD:** a logó hozzáadása utáni újra-ellenőrzés tévesen az **„Ingyenes asztali szoftver" (Free desktop software)** irányelv alá sorolta a hirdetést (false positive — a SpendNote böngészős SaaS, nincs letöltés). **Fellebbezés** („Döntés vitatása", kampány-szint) beküldve → **elfogadva**. **Gyökér-ok:** a flag egyetlen címsorhoz tapadt — **„Free 14-Day Trial"** (a `Free` + szoftver-kontextus billentette be az automatát). **Megoldás:** a címsor lecserélve `Free` nélküli változatra (`14-Day Trial, No Card` típus) → trigger véglegesen megszüntetve, auto-újraellenőrzés folyamatban. (A reszponzív hirdetés közben a többi jóváhagyott címsorral végig kiszolgált.)

---

### A.8 Geo + bid + keret finomítás (2026-06-13 este, 141 megj / 4 klikk után)

- **Geo:** Ausztrália **marad** (nem megyünk USA-only — az USA a legdrágább B2B-piac, US-only emelné a CPC-t). A drága klikkeket inkább **licit-korláttal** kezeljük.
- **Licit-korlát:** „Kattintások maximalizálása" mellé **max CPC-ajánlatkorlát ~$4** (az átlag $3,04 fölött → csak a drága farkat vágja, nem esik vissza 0-megjelenésbe). Finomhangolás: ha tartja a megjelenést → le $3,50-re; ha beesik → fel $4,50-5-re.
- **Keret:** átmeneti hétvégi **kis emelés** (~$6 → ~$8-10) gyorsabb adatért; **hétfőn vissza**.
- ⚠️ Megj.: a bid-korlát + keret-változás újraindítja a tanulási fázist — kerüljük a gyakori yo-yózást.

## B. NYITOTT TAKARÍTÁSI TEENDŐK (nem sürgős — Maximize Clicks nem használ konverzióadatot a licithez)

| # | Teendő | Megjegyzés |
|---|---|---|
| 1 | **„Oldalmegtekintés" konverzió** → Másodlagosra állítani vagy törölni | Most **Elsődleges + Aktív** → minden oldalbetöltést konverziónak vehet, **rontja a riportot**. Másodlagosra állításnál **hibát dob** → cél-/goal szinten kell rendezni. (Pontos hibaüzenet bekérendő.) |
| 2 | **GA4 gyanús kulcsesemények** (`page_view`, `qualify_lead`, `close_convert_lead`, `manual_event_PAGE_VIEW`) | Valószínűleg Codex-maradványok → felülvizsgálni / kikapcsolni kulceseményként |
| 3 | **GA4 `sign_up` kulcsesemény** felvétele | A felület csak **lefutott** eseményt enged csillagozni → az első valódi regisztráció után jelenik meg, akkor megjelölni |
| 4 | **GA4 `signup_completed`** ne legyen kulcsesemény | Ha szerepel a Kulcsesemények közt → kikapcsolni |
| 5 | **Sitelinkek** ellenőrzése az Eszközök/Assets fülön | Mentés akadozott a varázslóban |
| 6 | **`vercel.json` törlése** | Halott fájl — az oldal Cloudflare Pages-en fut, a Vercel configot semmi nem nézi |

---

## C. BŐVÍTÉSI TERV (fázisos — NEM most)

**Alapelv:** $6/nap-on egyszerre **EGY** dolgot lehet rendesen tesztelni. A kampány ma kapta az első megjelenéseit + tanulási fázisban van → **most ne fragmentáljuk** 3 ad groupra. Előbb adat, aztán bővítés.

### Fázisok

- **1. fázis (most → ~1-2 hét):** NE nyúlj hozzá. Adatgyűjtés. A **Keresési kifejezésekből** kiderül, melyik angle húz.
- **2. fázis (~2 hét, adat alapján):** **EGY** új, szűk ad group — tipp: **Cash handover / accountability** (ez a SpendNote legdifferenciáltabb erőssége, és van rá kész landing oldal).
- **3. fázis (később / nagyobb keret):** a többi klaszter.

### C.1 Tervezett ad group-ok → kulcsszó → landing oldal

> A kulcs-insight: a SpendNote igazi megkülönböztetője az **„accountability" / „ki vette át a pénzt"** angle — és **van rá témára illő landing oldal**, ami magasabb Quality Score-t + jobb konverziót ad, mint a generikus szoftver-oldal.

| Ad group téma | Kulcsszavak (Phrase/Exact) | Ideális landing |
|---|---|---|
| **Cash handover** ⭐ (2. fázis favorit) | `"cash handover log"`, `"cash handover form"`, `"shift cash handover"`, `"cash handover receipt"`, `[cash handover log]` | `spendnote.app/cash-handoff-receipt` |
| **Employee cash accountability** | `"employee cash receipt"`, `"cash received by employee"`, `"cash advance receipt"` | `spendnote.app/employee-cash-advance-receipt` |
| **Proof of cash payment** | `"cash payment receipt"`, `"proof of cash payment"`, `"cash received receipt"`, `"cash acknowledgement receipt"` | `spendnote.app/cash-payment-received-proof` |
| **Petty cash reconciliation** | `"petty cash reconciliation"`, `"petty cash log"`, `"petty cash voucher"` | `spendnote.app/petty-cash-reconciliation` |
| **Petty cash slip** (teszt, óvatos) | `"petty cash slip"`, `[petty cash slip]`, `"cash receipt slip"`, `"cash disbursement slip"` | `spendnote.app/petty-cash-voucher-template` (noindex, de hirdetés-landingnek OK) |

**Kapcsolódó problémás-tudatú oldalak (alternatív landing / hirdetésszöveg-ihlet):**
`who-took-money-from-cash-box`, `boss-cant-see-where-cash-goes`, `two-person-cash-count-policy`.

**Hirdetésszöveg-irányok (accountability):**
- „Proof for Every Cash Handover — Record who received cash, how much, when, and what for."
- „Stop Using Paper Cash Handover Sheets — one simple online log."
- „Stop Losing Track of Cash — a clear record whenever cash is handed over, spent, or returned."

### C.2 Negatív kulcsszó-listák (ChatGPT-javaslat, jóváhagyva)

**Általános (template-zaj elleni, minden új csoporthoz):**
`template`, `printable`, `pdf`, `word`, `excel`, `free`, `sample`, `example`, `mockup`, `design`, `image`

**Handover/accountability csoporthoz külön (off-topic kontextus):**
`nurse`, `nursing`, `patient`, `hospital`, `medical`, `construction`, `project`, `asset`, `key`, `vehicle`, `lottery`, `payslip`, `salary slip`

**Proof/reconciliation csoporthoz külön (könyvelési-audit zaj):**
`bank reconciliation`, `proof of cash worksheet`, `accounting treatment`, `journal entry`

> ⚠️ A jelenlegi kampány meglévő negatív listája (`template`, `free`, `excel`, `jobs`, …) *ellenőrizendő/pontosítandó* — ezt a következő ülésen összevetjük.

---

## D. MIT FIGYELJÜNK ÉS MIKOR

- **Napi GSC/Ads nézegetés = TILOS** (idegőrlés). Heti 1-2× elég.
- **Pár nap múlva (100+ megjelenés után):** **Keresési kifejezések** riport → mi húz, mit zárunk ki.
- **Metrikák:** Megjelenések (elmozdul-e), Átl. CPC (mennyi klikk fér a keretbe), Kattintások (jön-e az első), majd Konverzió (a SIGNUP — pár órás GA4→Ads import-csúszással).
- **Döntési pont (~3-4 hét):** ha a látogatók **regisztrálnak** → óvatos keret-emelés vagy 2. fázis. Ha **jönnek, de nem regisztrálnak** → nem a hirdetésen, hanem a **landingen/terméken** kell javítani.

---

## E. COMMIT-NAPLÓ (paid-relevant)

| Commit | Dátum | Tárgy |
|---|---|---|
| `d4fd6aa` | 2026-06-11 | GA4 `sign_up` konverziós esemény a welcome oldalon |
| `d9f9108` | 2026-06-12 | `signup_completed` → `signup_attempt`; redundáns login-esemény törölve (hamis konverziók megszüntetése) |
| `9b944b8` | 2026-06-12 | Google Ads SIGNUP konverzió (`conversion_event_signup`) a welcome oldalon |
