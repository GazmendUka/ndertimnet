# Marknadsplatsförbättringar – lokal leverans 2026-10-01

## Status och avgränsning

Arbetet ligger på `codex/marketplace-improvements`, baserat på `7b23372033526e59ac02b5b2187729c4b2fba145`. Den ursprungliga arbetskopians andra lokala ändringar har inte flyttats eller skrivits över. Användaren har godkänt push av arbetsgrenen; detta innebär inte publicering. Ingen produktionsmigrering, banktransaktion eller verkligt meddelandeutskick ingår i denna leverans.

Detta är en lokalt verifierad implementation, inte ett bevis på produktionsmiljöns status. Kontrollera aktuell huvudgren, driftkonfiguration och tillgängliga schemaläggare före publicering. Blanda inte in äldre, orelaterade arbetskopieändringar.

## Vad som ingår

- **Startsida och SEO:** efterfrågad huvudrubrik/underrubrik, tydligt demonstrationsmärkta exempeldata, projektstart före registrering och uppdaterad sitemap. Sexton befintliga orts-/tjänstesidor får färdigt HTML-innehåll och unika titlar, beskrivningar, canonical och delningsmetadata vid produktionsbygget. Inga privata sidor förrenderas.
- **Projektstart:** besökaren beskriver projektet innan konto krävs. Utkastet sparas i samma webbläsarflik i högst 24 timmar och följer med genom inloggning/registrering. Import kräver kundinloggning och använder en unik nyckel per kund för säkra återförsök. Befintligt samtycke, fullständiga uppgifter och moderering krävs fortfarande innan publicering. Byte av enhet eller flik garanterar inte att utkastet följer med.
- **Matchning:** orts- och tjänstefilter samt rekommenderade uppdrag utifrån företagets registrerade orter och specialiteter. Filtrering sker på servern före sidindelning och ändrar inte befintliga åtkomstkrav. Detta är enkel regelbaserad matchning, inte en rankingmodell eller nya mejlaviseringar.
- **Offerter:** kunden kan jämföra två eller tre skickade offerter. Fast pris, timpris och uppskattning hålls isär; omfattning, material, undantag, tid, betalningsvillkor, företagsverifiering och omdömen visas utan att saknade uppgifter fylls i. Även efterföljande sidor med offerter hämtas via den egna API-adressen.
- **Portfolio:** högst tolv egna referensprojekt per företag, med bild, beskrivning och omfattning. Bilder begränsas, omkodas och får metadata borttagen. Administratör måste godkänna före offentlig visning. Referenserna är inte verifierade kunduppdrag. Användare får inte godkänna sina egna bilder. Borttagna bilder får sparade återförsök om fillagringen inte svarar.
- **Affärsmått:** superadministratören får sammanställda mått under jobb i Django-admin samt API och kommandot `marketplace_metrics --days 30`. Måtten avser en kohort skapade jobb/utkast och skiljer saknat underlag från noll. Anonyma webbläsarutkast räknas inte. Avgifter avser betalda offertavgifter, inte total kundanskaffningskostnad. Ingen besökarspårning eller nya spårningscookies har lagts till.
- **Pushaviseringar:** båda acceptansvägarna använder samma aviseringslogik. Händelser sparas tillsammans med affärstransaktionen och dedupliceras med stabila nycklar. Enhetsregistrering ändrar inte längre användarens avstängningsval. Kön kontrollerar inställningarna igen vid leverans, försöker bara om misslyckade enheter, högst åtta försök, och avslutar händelser efter sju dagar. Avslutade händelser rensas efter 30 dagar. Detta lägger **inte** till mejlaviseringar.
- **Kontoradering:** kunden/företaget begär radering i profilen med lösenordsbekräftelse. Sessioner återkallas och kontot spärras direkt. Konton utan skyddade affärskopplingar raderas faktiskt av bakgrundsjobbet, med separata sparade filraderingsuppgifter. Avtal, offerter, betalningar, abonnemang och äldre affärskopplingar leder till administrativ granskning, inte automatisk förstöring.

## Kvarstående beslut om radering

Önskemålet om tre månader är noterat men **ingen generell tremånadersradering har införts**. Den är inte en säker gemensam regel för konton, avtal, bokföringsunderlag och tvister. Kosovos skattemyndighets vägledning anger sex år för skattedokumentation, med särskilda regler för vissa dokument. Bekräfta tillämpliga kategorier och tider med redovisnings-/juridiskt ansvarig innan en automatiserad gallringspolicy för affärsdata införs.

Källa: [Tax Administration of Kosovo – dokumentationsskyldighet](https://crmm.atk-ks.org/en/Public/InteractiveTaxGuide?ParentId=51cb821b-9213-42b0-d914-08dba3a6a264&StartingQuestionId=45cfa141-3775-48be-0a46-08dba31082af).

`needs_review` måste bevakas och handläggas av ansvarig administratör. Det finns ingen automatisk radering av sådana ärenden och ingen knapp som kringgår granskningen. Bestäm hur användaren informeras om kvarvarande uppgifter, tidsfrister och skäl. Säkerhetskopior och eventuell återställning behöver en dokumenterad rutin som åter tillämpar tidigare raderingar. Gamla eller oregistrerade filer i externa lagringstjänster omfattas inte av en generell städning här.

## Krav före publicering

1. Granska diffen mot aktuell huvudgren och säkerställ backup samt återställningsrutiner. Testa samma kod och migreringar i staging.
2. Tillämpa de tre nya, additiva migreringarna: `accounts.0018`, `jobrequests.0013` och `pushnotifications.0002`. Inga gamla affärsrader eller befintliga utkast massändras.
3. Förbered schemalagda körningar från samma backendversion med rätt databas och fillagring:
   - `python manage.py process_notifications --limit 100` varje minut.
   - `python manage.py process_account_deletions` exempelvis var femte minut; den hanterar också kvarvarande portfoliobilder.
   Övervaka fel, ålder på väntande ärenden och leveranser med status `failed`. Aktivera inga betalda tjänster utan separat godkännande.
4. Köarbetaren behöver samma Firebase-inställningar som backend. Utan en fungerande arbetare kommer de nya pushhändelserna inte att levereras. Starta arbetaren tillsammans med backendutrullningen; publicera inte enbart köproducenten.
5. Publicera frontend och kontrollera dess routing enligt avsnittet nedan. Lägg inte upp frontend före de nya API:erna. Kontrollera konto-, portfolio-, filter- och utkastflöden på staging med separata testkonton.
6. Säkerställ administrativ bemanning för portfoliogranskning och raderingsärenden. Granska även integritetstexten mot beslutade arbetssätt.
7. Testa verklig push på avsedda testenheter först efter godkännande. En leverantörs godkända sändning betyder inte att telefonen har tagit emot eller visat meddelandet. Verkliga externa utskick, lagringsleverantörens radering och mobilappgranskning är inte verifierade av de lokala testerna.

Leveransgarantin är **minst en gång**, inte exakt en gång: ett processavbrott efter leverantörens kvittens men före databasens bekräftelse kan ge ett extra försök. Händelse-id skickas med till klienten för framtida klientdeduplicering. Databastester täcker samtidiga acceptanser och samtidiga arbetare, men eliminerar inte denna externa kvittensgräns.

## Hosting av färdiga SEO-sidor

`npm run build` producerar `build/<sökväg>/index.html` för:

```text
/ndertim/prishtine   /ndertim/tirane     /ndertim/prizren
/ndertim/mitrovice   /ndertim/durres     /ndertim/vlore
/renovim-kuzhine    /renovim-banjo      /renovime
/ndertime          /elektricist        /lyerje
/fasada            /cati               /pllakashtrues
/dysheme
```

Webbhotellet måste servera dessa filer före den allmänna SPA-regeln till `/index.html`. Om webbhotellet inte automatiskt använder katalogernas `index.html`, lägg explicita omskrivningar från ovanstående URL:er till respektive `/sökväg/index.html` **före** SPA-regeln. Enbart uppladdning av filer garanterar inte rätt metadata. Kontrollera verkliga HTTP-svar utan JavaScript: exakt en titel, rätt canonical och sidans rubrik/innehåll. Kontrollera även direktlänk och omladdning av privata SPA-sidor. Ingen hostingkonfiguration har ändrats här.

Render serverar enligt sin dokumentation befintliga resurser före redirect-/rewrite-regler. Därför ska regler inte läggas till slentrianmässigt: kontrollera först de rena URL:erna i testmiljön. Om exempelvis `/ndertim/prishtine` inte ger det förrenderade innehållet, lägg en specifik **Rewrite** till `/ndertim/prishtine/index.html` före `/* → /index.html`, och gör motsvarande för övriga berörda sidor. Kontrollera att byggkommandot använder `npm run build` (inklusive förrenderingen), att hela `build`-katalogen publiceras och att gamla cachelagrade svar inte döljer resultatet. Någon flytt av domän eller byte av hosting krävs inte för denna ändring. [Render: redirects och rewrites](https://render.com/docs/redirects-rewrites).

## Kontroller

- Hela backendsviten: **215 tester godkända** mot en separat lokal PostgreSQL-databas, inklusive samtidiga beslut, köarbetare och utkastimport.
- Frontend: **123 tester godkända** i 17 testsviter.
- Django systemkontroll och kontroll av saknade migreringar: godkända.
- Produktionsbygge och förrendering av 16 sidor: godkända.
- Lokal webbläsare: startsida, sparat projektutkast och offertjämförelse vid 320, 390, 768 och 1440 pixlars bredd, samt samtliga 16 SEO-sidor med JavaScript avstängt. Utkastflödet testades med förlorat sparningssvar, ändrad text, explicit kopia och ytterligare förlorat svar följt av omladdning/återförsök. Ingen horisontell sidöverbredd; jämförelsetabellen rullas separat. Alla externa nätverksanrop ersattes med syntetiska svar eller blockerades.

### Rättning av utkastkonflikt

Återförsök med samma importnyckel och samma normaliserade innehåll återanvänder befintligt utkast. Om titel, beskrivning, ort eller tjänst skiljer sig svarar backend med `409 guest_draft_conflict`, utan att skriva över det sparade utkastet. Webbläsaren bevarar lokal text och låter kunden öppna den sparade versionen eller uttryckligen spara ändringarna som ett separat utkast. Kopians nya nyckel sparas lokalt före anropet och återanvänds efter ett tappat svar. Även gamla/ofullständiga lyckade API-svar kontrolleras innan lokal text tas bort. Rättningen behöver ingen ytterligare migrering.

För upprepade backendtester: installera projektets testberoenden, använd `BILLING_TEST_DATABASE_URL` för en **dedikerad lokal PostgreSQL-databas vars namn börjar med `ndertimnet_test`**, och kör från `backend`:

```sh
PYTHONDONTWRITEBYTECODE=1 python manage.py test --settings=ndertimnet.marketplace_test_settings --noinput
python manage.py check --settings=ndertimnet.marketplace_test_settings
python manage.py makemigrations --check --dry-run --settings=ndertimnet.marketplace_test_settings
```

Använd aldrig produktionsanslutningen för tester. Firebase/bank och meddelandeutskick är ersatta eller avstängda i dessa tester. Kör från `frontend`:

```sh
CI=true npm test -- --watch=false --runInBand
npm run build
```

## Återgång

De nya tabellerna och nullable-fälten är additiva. Radera inte produktionsdata eller rulla tillbaka databasmigreringar som en snabb felsökningsåtgärd. Vid kodåtergång ska aviseringskön och väntande raderingar först hanteras med en kompatibel arbetare; avsluta inte tyst redan mottagna begäranden. Bevara raderingsspår och filuppgifter tills respektive åtgärd har slutförts.

## Separat Render-staging (1 oktober)

Användaren har därefter godkänt en stagingmiljö och publicering efter godkända kontroller. Staging skapas med egen PostgreSQL-databas, backend, statisk frontend och de två nya schemalagda arbetarna. Produktionsuppgifter eller produktionshemligheter kopieras inte. Automatiska deployer är avstängda i staging för kontrollerad versionshantering.

Backend och stagingarbetare använder `DJANGO_SETTINGS_MODULE=ndertimnet.staging_settings`, `ENVIRONMENT=production` och `DEBUG=false`. Konfigurationen kräver databasnamnet `ndertimnet_staging` och ett explicit matchande `STAGING_DATABASE_HOST`. Externa betalnings-, mejl-, Firebase- och Cloudinary-hemligheter blockeras tills dessa tester uttryckligen förberetts. Vanliga systemmejl skickas inte; kontaktformuläret får inte rapportera verklig leverans. Testkonton är fiktiva. Hälsokontrollen `/health/` kontrollerar databasen utan att lämna ut anslutningsinformation.

Frontend byggs med `REACT_APP_DEPLOYMENT_ENVIRONMENT=staging` och staging-API:s adress. Efter ordinarie bygge körs `node scripts/mark-staging.cjs`, som märker HTML-sidorna och skriver en blockerande robots.txt. Render ska dessutom sätta `X-Robots-Tag: noindex, nofollow, noarchive` på alla stagingfrontendsvar; stagingbackend sätter samma header. Detta förhindrar inte besök och är inte ett åtkomstskydd. Appens vanliga autentisering och behörighetskontroller gäller fortsatt.

Användaren har uttryckligen valt att lämna tester av bilduppladdning och extern filradering spärrade i väntan på separat testlagring. `BlockedMediaStorage` förhindrar därför all sådan åtkomst i staging. Ett passerat övrigt testflöde ska inte beskrivas som verifierad bildlagring, bankcheckout eller faktisk leverans till en telefon. Produktionsinställningarna aktiverar inte stagingspärrarna.

### Verifierad stagingdrift, 1 oktober

Kodrevision `d664c9c` körs i den separata stagingmiljön. Backend, frontend, PostgreSQL och båda schemalagda arbetarna har skapats. Detta avsnitt ersätter inte en senare kontroll av driftstatus. Produktion har ännu inte uppdaterats.

- Frontend: `https://ndertimnet-staging-frontend.onrender.com`.
- Backend: `https://ndertimnet-staging-backend.onrender.com`, med databaskontroll på `/health/`.
- De tre additiva migreringarna är tillämpade i staging.
- Hela lokala backendsviten inklusive stagingspärrar: 221 godkända tester. Frontend: 123 tester i 17 sviter, Django-kontroller och frontendbygge godkända.
- Riktiga staging-API-anrop med fiktiva konton verifierade rollbehörigheter, administratörsmått, filter/matchning, utkastimport och konflikter, bevarat avstängningsval, två gratis signerade offerter och chatt. Bankbetalningar är avstängda.
- Riktig webbläsarinloggning verifierade utkast genom omladdning och inloggning, import och offertjämförelse för fast pris/timpris. Sidbredd kontrollerades vid 320, 390, 768 och 1440 pixlar. Inga observerade JavaScript-undantag eller produktions-API-anrop i testet.
- Upprepad acceptans, separat slutförandebekräftelse, åtkomst för vinnare/förlorare, recension och chattlåsning verifierade via API. Jämförelsen testades före acceptans; den befintliga åtkomstregeln döljer förlorade offerter efter acceptans.
- Schemalagd kontoradering verifierades i databasen: konto utan affärskopplingar faktiskt borttaget, konto med offerter bevarat och markerat `needs_review`.
- Driftsatt aviseringskö testad mot stagingdatabasen med en **simulerad** leverantör: deduplicering, sparad fördröjning efter fel och lyckat återförsök. Testets förändringar rullades tillbaka. Ingen Firebase-sändning eller telefonmottagning ingår i detta resultat.
- Render behövde 16 explicita SEO-rewrites före SPA-regeln. Därefter verifierades samtliga rena URL:er utan JavaScript: HTTP 200, sidtitel, huvudrubrik, canonical och noindex-header.

Kvar före full produktionsutrullning: separat mobiltestapp och faktisk notismottagning, produktionsarbetare med rätt miljö samt kontrollerad backend-/frontendutrullning. Produktionsdatabasens återställningsfunktion rapporterade tillgänglig historik, men en faktisk återställningsövning har inte genomförts. Extern bildlagring förblir uttryckligen undantagen från stagingtestet; bank-sandbox väntar på bankuppgifter. Inga riktiga kunddata har kopierats till staging.

### Separat bildlagring aktiverad och testad, senare 1 oktober

Detta ersätter bildundantaget ovan. Efter användarens bekräftelse aktiverades en separat kostnadsfri Cloudinary-testmiljö. Produktionslagringen jämfördes läsande och är inte samma miljö. Inga produktionsnycklar kopierades. Stagingbackend, frontend och raderingsarbetare kör `1ec7a61`; aviseringsarbetaren är oförändrad på `d664c9c` och behöver ingen bildåtkomst.

- Bildlagring är fortsatt blockerad som standard. Aktivering kräver `STAGING_MEDIA_ENABLED=true`, `STAGING_CLOUDINARY_CLOUD_NAME`, `STAGING_CLOUDINARY_API_KEY`, `STAGING_CLOUDINARY_API_SECRET` samt matchande `STAGING_EXPECTED_CLOUD_NAME`. Operatören måste först verifiera att molnet är skilt från produktion. Inställningarna lagras endast i tjänsternas skyddade miljö, inte i Git. Vanliga Cloudinary-variabler nekas även när testlagring är aktiverad.
- Samma testinställningar finns på stagingbackend och raderingsarbetaren. Bildprefix är `staging-media`. Bank, extern mejl och Firebase är fortfarande avstängda. Stagingmärkningen anger att endast fiktiva data/bilder får användas; noindex är kvar.
- 32 relevanta lokala tester, Django system-/migrationskontroll och frontendbygge med 16 förrenderade sidor godkända. Säkerhetstester täcker saknade/felmatchade testinställningar och förbjudna leverantörsvariabler.
- Riktig webbläsare: företagsinloggning, syntetisk bilduppladdning, väntande bild dold för kunden, nekad radering av annan användare, godkännande via adminformulär och kundvisning vid 390/1440 px. Ägarens radering tog bort referensen och molnresursen.
- Extra körningar på stagingbackend verifierade bildhämtning från Render, sparad raderingsuppgift efter simulerat lagringsfel och lyckat återförsök med verklig lagring. Ett nytt fiktivt konto utan affärskopplingar raderades inklusive företag, portfolio och molnbild genom ordinarie raderingskommando. Dessa var engångskörningar av arbetarkoden, inte bevis på ett specifikt schemalagt körningstillfälle.
- Testbilderna är raderade; inga riktiga kundbilder användes. Produktionsbackend och frontend kontrollerades oförändrade. Riktig iPhone-notis väntar på Apple-medlemskap/separat testapp; banktest och återställningsövning återstår.
