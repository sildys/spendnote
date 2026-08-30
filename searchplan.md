# 🎯 SEARCHPLAN — Google Ads (fizetett keresőhirdetés) terv + napló

> Ez a fizetett **Google Ads Search** kampány kanonikus dokumentuma — a `seoplan.md` párja, csak a paid szálra. Itt rögzítjük, mi történt, mi a kampány-struktúra, és mik a (fázisos) bővítési tervek.

---

## 🟢 ÉLESÍTVE (2026-08-30) — a szűk „handover/accountability" kampány elindult

**Státusz:** Az új kampány **közzétéve és fut** (a fiók egy Google-oldali reaktivációs fizetési hurok után feloldva). A `2026-08-19`-i spec szerint épült fel, a főoldalra terelve.

### Élő kampány-paraméterek (megerősítve a felületen)
| Elem | Érték |
|---|---|
| Kampány neve | **Search – Online Petty Cash Book** |
| Típus | Search only (**Search Partners KI, Display KI**) |
| Ajánlattétel | **Kattintások maximalizálása + max CPC $2,00** |
| Napi keret | **$5,00/nap** |
| Geo | **USA + Kanada**, **Jelenlét** célzás |
| Nyelv | **Angol** |
| AI Max | **KI** (szöveg-személyreszabás KI, **Végső URL kibontása KI**) |
| Céloldal | `https://spendnote.app/` |
| Vállalkozás neve (brand) | **SpendNote** (a domainnel egyezik; jogi entitás marad Sildsys, LLC) |
| Konverzió | SIGNUP (GA4-forrású, meglévő `G-QPFM30F86Q` címkén át) |

### Kulcsszavak (12 — Exact `[]` / Phrase `""`)
`"cash handover app"`, `"cash handover log"`, `"cash handoff app"`, `"cash handover receipt"`, `[who took money from cash box]`, `"track who has the cash"`, `"app to track cash handovers"`, `"cash accountability app"`, `"team cash tracking app"`, `"cash box tracking app"`, `"cash count app with signatures"`, `"dual control cash count"`

### RSA
- **Címsorok (12):** `Petty Cash Tracking App` · `Know Who Took the Cash` · `Log Every Cash Handover` · `Cash Handoff Receipts Fast` · `Track Petty Cash Online` · `See Who Has the Cash Now` · `Proof for Every Handover` · `Petty Cash App for Teams` · `14-Day Trial, No Card` · `Cash In, Cash Out, Tracked` · `Stop Losing Track of Cash` · `Built for Small Teams` (⚠️ SEMMI „Free")
- **Leírások (4):** lásd `2026-08-19` szekció.
- **Útvonal:** `petty-cash` / `tracker`
- **Kiemelések (callouts):** `No Credit Card Needed`, `14-Day Trial`, `Set Up in Minutes`, `Built for Small Teams`, `Printable Receipts`, `Cancel Anytime`

### Sitelinkek (7)
Pricing · Petty Cash App · Receipt Generator · Who Has the Cash · Petty Cash vs Excel · FAQ · Two-Person Cash Count

### Kizáró kulcsszavak (kampány-szinten bemásolva)
`template`, `printable`, `pdf`, `word`, `excel`, `sample`, `example`, `format`, `meaning`, `definition`, `how to`, `what is`, `budget`, `budgeting`, `net worth`, `expense tracker`, `spending tracker`, `bill tracker`, `money manager`, `rocket money`, `every dollar`, `everydollar`, `cleo`, `cash back`, `scanner`, `scanning`, `scan`, `ocr`, `receipt maker`, `receipt scanner`, `snapping`, `snap`, `jobs`, `salary`, `payslip`
> ⚠️ `free` **SZÁNDÉKOSAN NEM** negatív. A negatívok direkt úgy vannak összeállítva, hogy ne ütközzenek a 12 kulcsszóval (nincs önálló `count`/`receipt`/`handover`).

### Számlázási epizód (2026-08-30) — dokumentálva
A fiók **„szünetel"** állapotba került (reaktivációs/igazolási fizetési feladat, NEM egyenleghiány — a személyazonosság már júniusban igazolva). A jóváírt egyenleg megjelenése és a reaktiváció **erős UI-késéssel** ment; végül egy reaktivációs befizetés oldotta fel (e-mail: „Fiókja szüneteltetését feloldottuk"). **Egyenleg ~\$130 (elkölthető hirdetésre / visszatéríthető).** Tanulság: a jóváírás önmagában nem oldja fel a szünetet, a Google a „Fizessen a fizetési móddal" feladatot külön kéri.

### Teendő ha nem válik be / leállítás
Fel nem használt egyenleg **visszatéríthető** (Számlázás → fizetési profil → visszatérítés kérése).

### Következő lépések (nyitott)
1. **Konverzió-takarítás (B/1):** a régi „Oldalmegtekintés" konverziót **Másodlagosra** állítani, hogy a SIGNUP legyen az egyetlen tiszta jel.
2. **~3-4 hét adatgyűjtés után:** Keresési kifejezések → negatívok bővítése; döntés a bővítésről (C. fázisok).

---

## ⭐ HOL TARTUNK MOST (2026-08-19) — ÚJRAINDÍTÁS (szűk, vevő-szándékú)

**Kontextus:** A júniusi kampány szünetel (drága, generikus szavak, 0 konverzió). Közben: **Microsoft Ads véglegesen kitiltott** (multi-account fraud flag, fellebbezés nélkül); a **Google organikus a May 2026 core update után beesett** (~10 megj/nap, tekintély-hiány — a főoldal viszont 7. pozíció, 20,8% CTR). **Új terv: ultra-szűk, vevő-szándékú Google Search kampány — kis keret, magas relevancia, fizetős user validáció.**

**Vezető insight (2026-08 GSC + Bing adatból):** a forgalom nagy része **információs** (`how to`, `what is`, `template`) → nem konvertál. A **vevő-szándékú** keresések (`...app`, `...system`, `...tracking`, `cash handover app`) ritkábbak, DE ezek a valódi arany — ÉS a Google pont ezekre temet el (pl. `petty cash management app` → Google **61. pozíció**). **Fizetős user = ezekre kell fizetve megjelenni.** (A Bing organikusan az 1. oldalra teszi ugyanezt a tartalmat → a tartalom jó, a Google-lel tekintély a baj.)

**A kampány célja:** NEM volumen. Kideríteni: **a magas-szándékú kereső regisztrál-e** (és később fizet-e), olcsón.

### Beállítások
| Elem | Érték |
|---|---|
| Kampánytípus | **Search only** (Search Partners KI, Display KI) |
| Ajánlattétel | **Kattintások maximalizálása + max CPC $2,00** (szűk long-tail → olcsóbb; ha pár nap után ~0 megjelenés → emeld $3-ra) |
| Napi keret | **$5/nap** (2× over-delivery plafon = $10) |
| Geo | **USA + Kanada**, **Jelenlét (presence)** célzás |
| Nyelv | Angol |
| Ütemezés | 24/7 (a geo kezeli az időzónát) |
| Eszközök | mind (a web-app mobilbarát; a forgalom ~96% mobil) |
| Céloldal | `https://spendnote.app/` (bizonyítottan konvertál, minden angle-t fed, organikusan is 7. pozíció) |
| Konverzió | **SIGNUP** (GA4-forrású, MÁR bekötve — `A.3`) |

### DIAGNÓZIS (2026-08-19): a landing NEM a szűk keresztmetszet
A főoldal **bizonyítottan konvertál** (organikus: 7. pozíció, 20,8% CTR, valódi regisztrációk „ha látják"). Tehát a **júniusi 0 konverzió oka a forgalom minősége volt**, nem a landing. Következmény: a **generikus** `petty cash app/software/tracker/management` klasztert **TELJESEN ELDOBJUK** (ezt már letesztelte a június: kattintás igen, regisztráció 0). A tét: **jó embert terelni a működő főoldalra.**

### Egyetlen szűk hirdetéscsoport: „Differentiated intent — handover / who has the cash"
**Kulcsszavak (Exact `[]` + Phrase `""`, CSAK a SpendNote egyedi értékét fedő, magas-szándékú szavak — SEMMI generikus „petty cash app"):**
- `"cash handover app"`, `"cash handover log"`, `"cash handoff app"`, `"cash handover receipt"`
- `[who took money from cash box]`, `"track who has the cash"`, `"app to track cash handovers"`
- `"cash accountability app"`, `"team cash tracking app"`, `"cash box tracking app"`
- `"cash count app with signatures"`, `"dual control cash count"` (eseményes/nonprofit/több-aláírásos igényre — a Bing-adatból)

> ⚠️ **Ezek egy része „Alacsony keresési arány" lesz** (ultra-niche) — ez a differenciált stratégia ára: kevés, de PONTOS forgalom. Ne töröld őket.
> ⚠️ **Ha pár nap után szinte 0 megjelenés** → óvatosan adj hozzá 1-2 „on-message", de kicsit tágabb szót (`"petty cash app for teams"`, `"cash log app for business"`) — DE generikus `petty cash app`-ot NE.

**Hirdetés (RSA) — címsorok (SEMMI „Free" → a júniusi policy-trigger elkerülése, lásd `A.7`):**
`Petty Cash Tracking App` · `Know Who Took the Cash` · `Log Every Cash Handover` · `Cash Handoff Receipts Fast` · `Track Petty Cash Online` · `See Who Has the Cash Now` · `Proof for Every Handover` · `Petty Cash App for Teams` · `14-Day Trial, No Card` · `Cash In, Cash Out, Tracked` · `Stop Losing Track of Cash` · `Built for Small Teams`

**Leírások:**
1. Record who took cash, how much, when, and what for. A clear history for your whole team.
2. Printable cash handoff receipts and a searchable log. Know where every dollar went.
3. Replace paper cash sheets with one simple online log. Set up in minutes.
4. See who has the cash right now. Built for teams that handle cash every day.

**Sitelinkek:** Pricing · Petty Cash App · Receipt Generator · Who Has the Cash

### Kizáró kulcsszavak (induló lista)
- **Ingyenes-válasz zaj:** `template`, `printable`, `pdf`, `word`, `excel`, `sample`, `example`, `format`, `meaning`, `definition`, `how to`, `what is`
- **Budgeting / personal finance:** `budget`, `budgeting`, `net worth`, `expense tracker`, `spending tracker`, `bill tracker`, `money manager`, `rocket money`, `every dollar`, `cleo`, `cash back`
- **Scanner / OCR:** `scanner`, `scanning`, `scan`, `ocr`, `receipt maker`, `receipt scanner`, `snapping`, `snap`
- **Egyéb:** `jobs`, `salary`, `payslip`

> ⚠️ `free` **SZÁNDÉKOSAN NEM** negatív (ingyenes próba = ideális intent — lásd `A.9`).

### Reális elvárás
- **Csöpögés, nem áradat** (heti pár kattintás). A szűk = olcsó + releváns, cserébe kis volumen.
- **Fizetős user = 2 lépés:** kattintás → **regisztráció** (trial) → **fizetés**. Először regisztrációt várj.
- **Döntési pont (~3-4 hét / 100+ megj után):** regisztrálnak-e a kattintók? Ha **jönnek, de nem regisztrálnak** → a **landing/termék** a gond, nem a hirdetés.

### Teendő a fiókban
1. A régi `Search – Petty Cash Software` kampányt **hagyd szüneteltetve** (ne töröld — history). Indíts **új** kampányt a fenti spec szerint (vagy állítsd át a régit: kulcsszavak cseréje, keret $5, CPC $2, negatívok frissítése).
2. ⚠️ Az **„Oldalmegtekintés" konverzió** még lehet Elsődleges+Aktív → állítsd **Másodlagosra/töröld**, hogy tiszta legyen a SIGNUP-riport (`B/1`).

---

## 🗄️ KORÁBBI ÁLLAPOT (2026-06-13 este) — történeti

- **Státusz:** A `Search – Petty Cash Software` kampány **ÉL és kiszolgál** — 2. nap: **141 megjelenítés, 4 kattintás, $12,18 költség** (a $6 keret 2×-ese → délutánra leállt, lásd lent).
- **Konverziókövetés:** bekötve és tiszta (lásd `A.3`). A SIGNUP konverzió Adsben **Aktív**. Konverzió eddig: **0**.
- **Stratégia:** szűk, célzott, kontrollált. Most **tanulási fázis** — a következő ~1-2 hétben **NEM bővítünk**, csak adatot gyűjtünk + negatívokkal tisztítunk.
- **Bid:** „Kattintások maximalizálása" + **max CPC-korlát $4** (fedezi a $3,30-as releváns petty cash klikket; a negatívok szűrnek témára, nem az ár).
- **Keret:** **$10/nap** (hétvégi adatgyűjtés; 2× plafon = $20).
- **Geo:** **csak USA + Kanada** (a 6-ból szűkítve). Indok: anyagilag jobban jövünk ki + az időzóna-csapda magától megszűnik (csak US/CA-keresésre költ, ami US/CA-órákban van; nincs EU/AU hajnali pénzégetés). US+CA ugyanaz az időzóna-sáv.
- **Ütemezés:** **TÖRÖLVE** (24/7). US+CA-only mellett redundáns volt — a geo-szűkítés önmagában megoldja az időzóna-problémát.
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

Eredetileg **6 angol nyelvű országra** bővítve (USA, UK, Kanada, Ausztrália, Írország, Új-Zéland), mind **Ország** szinten, **Jelenlét/Presence** célzással.

> ⚠️ **2026-06-13 este SZŰKÍTVE: csak USA + Kanada.** Indok: anyagi optimalizálás + időzóna-csapda megszüntetése (lásd A.9). Az AU/UK/IE/NZ kivéve.

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

### A.9 Esti finomítás-csomag (2026-06-13 ~21:00, a keresési kifejezések CSV alapján)

**Geo-adat (4 klikk, parányi minta):** AU 2 klikk @ $3,41 átl., USA 2 klikk @ $2,67 átl. → a vegyes $3,04-et **AU húzta fel**, az USA az olcsóbb. Döntés: **minden geo marad** (a CPC-korlát szabályoz, nem geo-kapcsolgatás).

**CPC-korlát — KORRIGÁLVA $4-re (nem $3):** menet közben felmerült a $3, DE a **legrelevánsabb** kattintás (`petty cash book format`) **$3,30** volt → $3-as korlát pont a célforgalmat vágná. **Tanulság:** a CPC-korlát **árban** vág, nem témában; a drága szemét (~$3,41 AU budgeting) és a drága jó (~$3,30 petty cash) **átfedik egymást** → a szűrést a **negatívok** végzik, a korlát csak a kiugró farkat fékezi. Ezért **$4**.

**Keret → $10/nap:** a 2. nap **$12,18 = pontosan 2× a $6,09 keret** → elérte az „over-delivery" 2× plafont és **délutánra leállt**. $10 keret → 2× = $20 plafon → kitart az US-ablakig.

**Ütemezés (dayparting) → végül ELVETVE, helyette GEO-SZŰKÍTÉS:** időzóna-csapda: a fiók **GMT+2 (CET)**, a keret CET-éjféltől délutánig fogyott el → mire az **USA dolgozni kezd (CET ~15:00)**, a keret elfogyott. Először dayparting-gal próbáltuk (12:45–06:00 CET), de a sok időzóna (US kelet↔nyugat) miatt a finomhangolás körülményes és értelmetlen volt. **Végső megoldás:** az **ütemezés törölve (24/7)** + a **geo USA + Kanada-ra szűkítve**. Így a budget **csak US/CA-keresésre** költ (ami eleve US/CA-órákban történik) → az időzóna-pénzégetés magától megszűnik, és anyagilag is jobban jövünk ki. Az **AU (drága, $3,41) + UK/IE/NZ kiesett**, az USA a te adataidban amúgy is **olcsóbb** volt ($2,67). Kanada azért marad, mert ugyanaz az időzóna-sáv + jó angol B2B-piac.

**2. kizáró-kör (CSV-alapon, budgeting/receipt szivárgás):** hozzáadott kifejezés-negatívok:
`"every dollar"`, `"everydollar"`, `"cleo"`, `"actual budget"`, `"budget"`, `"budgeting"`, `"net worth"`, `"expense tracker"`, `"spending tracker"`, `"bill tracker"`, `"money manager"`, `"money tracking"`, `"money management"`, `"cash back"`, `"receipt maker"`, `"receipt scanner"`.

> ⚠️ **`free` SZÁNDÉKOSAN NEM negatív:** a SpendNote maga ingyenes/ingyenes próbás → a „free petty cash app" / „petty cash app free" **ideális intent**. A `free`-s szemét (`best free budgeting app`, `budget app free`, `free receipt maker app`…) a **kategória-negatívokba** (`budget`, `budgeting`, `receipt maker`…) amúgy is beleakad — nem a `free` szót kell tiltani, hanem a témát.

**On-target jelek (CSV):** `petty cash book format` (1 klikk, $3,30) ✅, `petty cash book` ✅, korábbról `cash receipt app` ✅ → a **petty cash + receipt-angle húz**.

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
