# Visuele opmaak-checklist: 240 punten

**Status:** herbruikbare read-only Website-QA checklist. **Scope:** alle templates, mobiel, tablet en desktop.

De checklist controleert niet of de inhoud inhoudelijk klopt. Tekst wordt wel visueel gecontroleerd op grootte, leesbaarheid, overloop, regelafbreking, uitlijning en afstand. Gebruik de checklist als **selecteerbare controlebibliotheek**, niet als 240 onvoorwaardelijke eisen voor iedere pagina.

**Legenda:** `A` = meetbaar automatisch signaal; `V` = screenshot/menselijk visueel oordeel nodig; `I` = interactieve of stress-test. Een automatische `A`-waarschuwing is **geen** bewezen defect zonder context. Markeer per punt `pass / fail / review / not_applicable / not_run`. Claims `pass` vereisen een evidence-ID.

**Vaste viewportmatrix:** 320, 360, 390, 600, 768, 1024, 1280 en 1440 CSS-pixels; pas resoluties en orientaties aan op doelgroep en site. Op de 30-pagina-run is een compacte representatieve subset gebruikt; niet iedere combinatie wordt automatisch uitgevoerd.

**Per bevinding vastleggen:** URL, template, viewport, selector/DOM-locatie, screenshot, werkelijke maat en verwachte maat, impact, prioriteit, eigenaar, kleinste fix, bronversie, testtijd en hertest.

**Interpretatie:** bijvoorbeeld bodytekst onder 14px, lange regels boven ~90 karakters, H1 die 4+ regels inneemt en 300px+ lege secties zijn *review-signalen*, geen universele WCAG-fouten. WCAG's 320px-reflow en 200% tekstresize zijn functionele eisen; 45-75 tekens leesbreedte is typografische richtlijn, geen harde eis.

**Bronnen:**
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- W3C Understanding Reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- W3C Understanding Resize Text: https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
- web.dev Typography: https://web.dev/learn/design/typography
- Nielsen Norman Group visual design: https://www.nngroup.com/articles/principles-visual-design/
- Nielsen Norman Group visual spacing: https://www.nngroup.com/articles/why-does-design-look-good/
- MDN overflowing content: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Overflow

## Checklist

### 01. Responsive breakpoints
- [ ] **V001 · V** — Test 320px, 360px en 390px zonder horizontaal scrollen.
- [ ] **V002 · V** — Test 600px, 768px en 1024px voor tussenbreedtes.
- [ ] **V003 · V** — Test 1280px, 1440px en ultrawide desktop voor balans.
- [ ] **V004 · V** — Controleer portret- en landschapsstand bij tablet.
- [ ] **V005 · V** — Bekijk of grids stapelen zonder lege spookkolommen.
- [ ] **V006 · A** — Signaleer vaste breedtes groter dan het viewport.
- [ ] **V007 · V** — Controleer dat zwevende knoppen niet buiten beeld vallen.
- [ ] **V008 · V** — Vergelijk vaste knoppen bij scroll en viewport-rotatie.
- [ ] **V009 · V** — Controleer verdwenen blokken tussen CSS-breakpoints.
- [ ] **V010 · V** — Controleer geen onbedoelde dubbele mobiele/desktopcontent.
- [ ] **V011 · V** — Vergelijk contentvolgorde na kolomstapeling.
- [ ] **V012 · V** — Verifieer hover-only content ook op touch-widths.

### 02. Grid, containers en uitlijning
- [ ] **V013 · V** — Lijn eerste en laatste tekstkolom op gedeelde hulplijnen uit.
- [ ] **V014 · V** — Controleer gelijke linker- en rechtermarges binnen contentzones.
- [ ] **V015 · V** — Controleer consistent max-width per paginatype.
- [ ] **V016 · V** — Meet of smalle kolommen niet verloren raken in breed canvas.
- [ ] **V017 · V** — Controleer of beeld- en tekstkolom in balans blijven.
- [ ] **V018 · V** — Controleer ongelijke breedte zonder inhoudelijke reden.
- [ ] **V019 · V** — Vergelijk kolomgaten binnen vergelijkbare secties.
- [ ] **V020 · A** — Detecteer elementen die buiten de viewport uitsteken.
- [ ] **V021 · V** — Controleer ingesprongen headings tegenover paragraaftekst.
- [ ] **V022 · V** — Controleer buttons die afwijken van de tekststartlijn.
- [ ] **V023 · V** — Controleer kaarten die door flex/grid niet gelijk eindigen.
- [ ] **V024 · V** — Controleer centrering ten opzichte van de inhoud, niet van het scherm.

### 03. Horizontale ruimte en padding
- [ ] **V025 · A** — Signaleer inhoud die bijna tegen schermrand kleeft.
- [ ] **V026 · V** — Beoordeel mobiele binnenmarge van containers.
- [ ] **V027 · V** — Beoordeel grotere zijmarges op tablet.
- [ ] **V028 · V** — Controleer padding in lichte en donkere secties op gelijk ritme.
- [ ] **V029 · V** — Controleer inspringing van lijsten en nested bullets.
- [ ] **V030 · V** — Controleer icon-tekst-afstand per linktype.
- [ ] **V031 · V** — Controleer scheidingslijnen op dezelfde contentbreedte.
- [ ] **V032 · V** — Controleer formulieren en CTA's op gelijke horizontale uitlijning.
- [ ] **V033 · V** — Controleer kaarten met asymmetrische links/rechts-padding.
- [ ] **V034 · V** — Controleer afbeeldingen op randafstand en cropveiligheid.
- [ ] **V035 · V** — Controleer horizontale ruimte in breadcrumb en menu.
- [ ] **V036 · V** — Controleer breedteverschil tussen kop en begeleidende tekst.

### 04. Verticale ruimte en witruimte
- [ ] **V037 · A** — Signaleer uitzonderlijk hoge lege secties voor handmatige review.
- [ ] **V038 · V** — Vergelijk afstand tussen heading en intro.
- [ ] **V039 · V** — Vergelijk afstand tussen paragrafen met hetzelfde niveau.
- [ ] **V040 · V** — Vergelijk afstand tussen opeenvolgende hoofdsecties.
- [ ] **V041 · V** — Controleer enorme gaten rond carrousels of banners.
- [ ] **V042 · V** — Controleer blokken die te dicht op elkaar staan.
- [ ] **V043 · V** — Controleer stapelmarges na mobiele kolomwisseling.
- [ ] **V044 · V** — Controleer witruimte voor en na tabellen en lijsten.
- [ ] **V045 · V** — Controleer onverwacht hoge min-height op kleine schermen.
- [ ] **V046 · V** — Controleer secties waarvan beeld en tekst uit elkaar vallen.
- [ ] **V047 · V** — Controleer footerbegin na korte of lange pagina.
- [ ] **V048 · V** — Controleer dat decoratieve leegte een duidelijk doel heeft.

### 05. Lettergrootte en typehiërarchie
- [ ] **V049 · A** — Meet computed font-size voor H1 t/m H6 per viewport.
- [ ] **V050 · A** — Meet computed font-size voor body, links, knoppen en labels.
- [ ] **V051 · V** — Beoordeel te grote H1 bij 320px breedte.
- [ ] **V052 · V** — Beoordeel te kleine lopende tekst op desktop.
- [ ] **V053 · V** — Controleer H2 versus H3 op zichtbaar hiërarchisch verschil.
- [ ] **V054 · V** — Vergelijk dezelfde kopsoort op vergelijkbare pagina's.
- [ ] **V055 · V** — Controleer font-size die abrupt springt tussen breakpoints.
- [ ] **V056 · V** — Controleer heading die onnodig zes regels inneemt.
- [ ] **V057 · V** — Controleer knoptekst in verhouding tot de knop.
- [ ] **V058 · V** — Controleer minimum leesbaarheid van formulierlabels.
- [ ] **V059 · V** — Beoordeel te forse tekstblokken in kleine kaarten.
- [ ] **V060 · V** — Controleer fontgewichten en vetgebruik op consistente rangorde.

### 06. Leesbaarheid en typografie
- [ ] **V061 · A** — Meet regelhoogte ten opzichte van lettergrootte.
- [ ] **V062 · A** — Rapporteer zeer lange tekstregels op desktop.
- [ ] **V063 · V** — Vergelijk leesbreedte tussen tablet- en desktopkolommen.
- [ ] **V064 · V** — Beoordeel te smalle tekstkolommen met veel afbreking.
- [ ] **V065 · V** — Controleer letterafstand in grote koppen.
- [ ] **V066 · V** — Controleer woordafstand in compacte labels.
- [ ] **V067 · V** — Controleer inzet van all-caps voor lange tekst.
- [ ] **V068 · V** — Controleer overmatig gecentreerde lopende tekst.
- [ ] **V069 · V** — Controleer font-family consistent tussen content en formulieren.
- [ ] **V070 · V** — Controleer font-weight op low-resolution devices.
- [ ] **V071 · V** — Controleer linkstijl onderscheiden van gewone tekst.
- [ ] **V072 · V** — Controleer dat lange woorden/URL's leesbaar afbreken.

### 07. Tekstoverloop en afsnijding
- [ ] **V073 · A** — Detecteer tekst met scrollWidth groter dan clientWidth.
- [ ] **V074 · A** — Detecteer tekst met scrollHeight groter dan clipcontainer.
- [ ] **V075 · A** — Detecteer zichtbaar tekstvlak buiten viewportgrenzen.
- [ ] **V076 · V** — Controleer intentional ellipsis versus verloren informatie.
- [ ] **V077 · V** — Controleer headings die door overflow:hidden wegvallen.
- [ ] **V078 · V** — Controleer labels die door placeholdertekst worden verdrongen.
- [ ] **V079 · V** — Controleer navigatielabels op afgebroken woorden.
- [ ] **V080 · V** — Controleer lange CTA-teksten met vertaling.
- [ ] **V081 · V** — Controleer badges en kleine prijs- of statuslabels.
- [ ] **V082 · V** — Controleer opsommingen bij grotere tekst.
- [ ] **V083 · V** — Controleer accordioninhoud na openen.
- [ ] **V084 · V** — Controleer juridische tekst bij smalle schermen.

### 08. Afbeeldingen en videomedia
- [ ] **V085 · A** — Vergelijk natuurlijke versus gerenderde afbeeldingverhoudingen.
- [ ] **V086 · V** — Controleer of object-fit beelden niet ongewenst vervormt.
- [ ] **V087 · V** — Controleer gezichten en producten niet onnodig afsnijden.
- [ ] **V088 · V** — Controleer visuele centrering van decoratieve zeshoeken.
- [ ] **V089 · V** — Controleer schaalconsistentie van illustraties per sectie.
- [ ] **V090 · V** — Controleer wazige of te klein gerenderde afbeeldingen.
- [ ] **V091 · V** — Controleer grote lege plekken rond zwevende afbeeldingen.
- [ ] **V092 · V** — Controleer tekst naast beeld op tablet (balans en hoogte).
- [ ] **V093 · V** — Controleer afbeeldingen die onbedoeld naar onderaan een kolom zakken.
- [ ] **V094 · V** — Controleer lazy-loaded beelden na scroll.
- [ ] **V095 · V** — Controleer video-afspeelknoppen en poster zonder overlap.
- [ ] **V096 · V** — Controleer alt-beeldgevallen en zichtbare fallback bij fout.

### 09. Hero, banner en eerste scherm
- [ ] **V097 · V** — Controleer H1 en CTA zonder scroll op gangbare viewport.
- [ ] **V098 · V** — Controleer verhouding hero-hoogte tot eerste contentblok.
- [ ] **V099 · V** — Controleer hero-achtergrond crop in portretstand.
- [ ] **V100 · V** — Controleer dat tekstcontrast op beeld stabiel blijft.
- [ ] **V101 · V** — Controleer witruimte boven eerste heading.
- [ ] **V102 · V** — Controleer overgang hero -> content zonder ongewenst gat.
- [ ] **V103 · V** — Controleer CTA's onder H1 op alle breedtes.
- [ ] **V104 · V** — Controleer decoratieve iconen niet boven tekst schuiven.
- [ ] **V105 · V** — Controleer niet meer dan een dominante visuele boodschap.
- [ ] **V106 · V** — Controleer hero-afbeelding niet wegvalt bij tablet.
- [ ] **V107 · V** — Controleer sticky-header over hero-content.
- [ ] **V108 · V** — Controleer korte pagina's zonder overdreven lege hero.

### 10. Cards, tegels en grids
- [ ] **V109 · V** — Controleer gelijke interne padding bij vergelijkbare kaarten.
- [ ] **V110 · V** — Controleer kaarten op ongelijke tekstlengtes.
- [ ] **V111 · V** — Controleer knoppen uitgelijnd bij uiteenlopende card-hoogte.
- [ ] **V112 · V** — Controleer kolomaantallen bij 320/390/768/1024px.
- [ ] **V113 · V** — Controleer badge, titel en afbeelding op vaste volgorde.
- [ ] **V114 · V** — Controleer hover/focus zonder verschuivende cards.
- [ ] **V115 · V** — Controleer klikbare kaarten zonder overlappende targets.
- [ ] **V116 · V** — Controleer ondergrens tussen twee kaarten.
- [ ] **V117 · V** — Controleer te veel verticale lege ruimte onder korte cards.
- [ ] **V118 · V** — Controleer inconsistente border radius/shadows.
- [ ] **V119 · V** — Controleer licht/donker ritme tussen cardsets.
- [ ] **V120 · V** — Controleer wederzijdse hoogte van iconen en kaartkoppen.

### 11. Menu, header en navigatie
- [ ] **V121 · V** — Controleer logoformaat per viewport.
- [ ] **V122 · A** — Registreer zichtbare menu-toggles en hun afmetingen.
- [ ] **V123 · I** — Open mobiel menu met muis/touch-emulatie.
- [ ] **V124 · V** — Controleer menu-overlay bedekt geen sluitknop.
- [ ] **V125 · V** — Controleer tussenruimte tussen menulinks.
- [ ] **V126 · V** — Controleer menu dat ongewenst wrapt op tablet.
- [ ] **V127 · V** — Controleer headerhoogte consistent per template.
- [ ] **V128 · V** — Controleer actieve navigatielink zichtbaar.
- [ ] **V129 · V** — Controleer submenu's links/rechts binnen viewport.
- [ ] **V130 · V** — Controleer dat sticky header content niet afdekt.
- [ ] **V131 · V** — Controleer mobiele menu-toggle positie en uitlijning.
- [ ] **V132 · V** — Controleer breadcrumbs en teruglinks op kleine breedtes.

### 12. CTA, knoppen en klikdoelen
- [ ] **V133 · V** — Controleer CTA horizontaal uitgelijnd met relevante tekst.
- [ ] **V134 · V** — Controleer primaire en secundaire CTA duidelijk onderscheidbaar.
- [ ] **V135 · A** — Detecteer extreem kleine knoppen op touch.
- [ ] **V136 · V** — Controleer iconen binnen knop niet tegen de rand.
- [ ] **V137 · V** — Controleer knoptekst niet over twee onbedoelde regels.
- [ ] **V138 · V** — Controleer voldoende afstand tussen naastgelegen acties.
- [ ] **V139 · V** — Controleer CTA boven de vouw waar zakelijk vereist.
- [ ] **V140 · V** — Controleer links niet tegen afbeeldingen aan gedrukt.
- [ ] **V141 · V** — Controleer disabled/hover/focus stijlen zonder tekstverlies.
- [ ] **V142 · V** — Controleer zichtbaar klikvlak overeenkomt met interactieve zone.
- [ ] **V143 · V** — Controleer telefoon- en e-mailknoppen op mobiel.
- [ ] **V144 · V** — Controleer terugknop en externe-linkiconen.

### 13. Formuliervelden en hulpteksten
- [ ] **V145 · V** — Controleer formulieruitlijning met introductietekst.
- [ ] **V146 · V** — Controleer label boven/bij invoerveld op mobiele breedtes.
- [ ] **V147 · V** — Controleer veldhoogtes gelijk voor inputs en selects.
- [ ] **V148 · V** — Controleer select-pijl en tekst zonder overlap.
- [ ] **V149 · V** — Controleer placeholdercontrast tegen de veldachtergrond.
- [ ] **V150 · V** — Controleer gelijke tussenruimte tussen gerelateerde velden.
- [ ] **V151 · V** — Controleer error-tekst onder veld zonder verschuiving.
- [ ] **V152 · V** — Controleer verplichte indicator niet afgesneden.
- [ ] **V153 · V** — Controleer selectopties met lange namen.
- [ ] **V154 · V** — Controleer textarea niet te klein voor de taak.
- [ ] **V155 · V** — Controleer verzendknop na laatste veld zonder groot gat.
- [ ] **V156 · V** — Controleer formulier in 1 of 2 kolommen zonder smalle inputs.

### 14. Footer, juridische links en contact
- [ ] **V157 · V** — Controleer footer uitlijning vanaf laatste contentblok.
- [ ] **V158 · V** — Controleer footer-kolommen stapelen zonder rare volgorde.
- [ ] **V159 · V** — Controleer logo- en certificaatgrootte consistent.
- [ ] **V160 · V** — Controleer footer-tekst op mobiele leesbaarheid.
- [ ] **V161 · V** — Controleer linkafstand in lange footer-menu's.
- [ ] **V162 · V** — Controleer juridische links niet te dicht naast elkaar.
- [ ] **V163 · V** — Controleer copyright en policy links zonder afsnijding.
- [ ] **V164 · V** — Controleer social iconen en labels evenwichtig uitgelijnd.
- [ ] **V165 · V** — Controleer voldoende contrast op donker footer-achtergrond.
- [ ] **V166 · V** — Controleer contactgegevens niet tussen kolommen verloren.
- [ ] **V167 · V** — Controleer mobiel vaste contact-CTA botst niet met footer.
- [ ] **V168 · V** — Controleer geen lege footer-kolommen bij ontbrekende content.

### 15. Kleuren, contrast en visuele consistentie
- [ ] **V169 · A** — Voer axe-contrastscans uit als ondersteunend signaal.
- [ ] **V170 · V** — Controleer kleur van H1/H2 op lichte achtergrond.
- [ ] **V171 · V** — Controleer kleur van bodylinks in lopende tekst.
- [ ] **V172 · V** — Controleer knoppen met onvoldoende labelcontrast.
- [ ] **V173 · V** — Controleer iconen zichtbaar op hover en focus.
- [ ] **V174 · V** — Controleer achtergrondkleurwissel zonder harde visuele breuk.
- [ ] **V175 · V** — Controleer brandblauw en accentgoud niet inconsistent.
- [ ] **V176 · V** — Controleer decoratieve lijnen niet dominant.
- [ ] **V177 · V** — Controleer focusring tegen beide achtergronden.
- [ ] **V178 · V** — Controleer kleur die dezelfde functie anders aanduidt.
- [ ] **V179 · V** — Controleer statuskleur niet uitsluitend kleurafhankelijk.
- [ ] **V180 · V** — Controleer illustratiepalet tussen pagina's.

### 16. Overlays, sticky, z-index en scroll
- [ ] **V181 · V** — Controleer cookie-overlay bedekt formulier of CTA niet.
- [ ] **V182 · V** — Controleer modals binnen mobiel viewport met sluitknop.
- [ ] **V183 · V** — Controleer sticky componenten niet over tekst heen.
- [ ] **V184 · V** — Controleer overflow-x:hidden geen inhoud verbergt.
- [ ] **V185 · V** — Controleer dropdown met voldoende ruimte aan rand.
- [ ] **V186 · V** — Controleer carrouselpijlen niet over kaarttekst.
- [ ] **V187 · V** — Controleer tooltips boven andere componenten.
- [ ] **V188 · V** — Controleer back-to-top knop niet over laatste link.
- [ ] **V189 · V** — Controleer ankerlinks onder sticky header.
- [ ] **V190 · V** — Controleer focuspositie bij scroll.
- [ ] **V191 · V** — Controleer fixed-elementen bij softwaretoetsenbord.
- [ ] **V192 · V** — Controleer stacking contexts en z-index-clashes.

### 17. Interactie en responsieve toestanden
- [ ] **V193 · I** — Test menu open/dicht en state na navigatie.
- [ ] **V194 · I** — Test accordion met korte en lange inhoud.
- [ ] **V195 · I** — Test tabs en tabpanel op alle schermformaten.
- [ ] **V196 · I** — Test carrousel zonder muis via knoppen/swipe.
- [ ] **V197 · I** — Test focusvolgorde in twee kolommen.
- [ ] **V198 · I** — Test hoverstijl wanneer touch geen hover heeft.
- [ ] **V199 · I** — Test formulierstate valid/invalid zonder live verzending.
- [ ] **V200 · I** — Test knoplabel tijdens loading.
- [ ] **V201 · I** — Test successtate en foutstate uit veilige fixtures.
- [ ] **V202 · I** — Test dropdowns na viewportwijziging.
- [ ] **V203 · I** — Test Escape voor modal/menu.
- [ ] **V204 · I** — Test terug, refresh en deeplinks zonder lay-outsprong.

### 18. Tekstvergroting en toegankelijkheidsstress
- [ ] **V205 · I** — Test 200% tekstzoom zonder clipping.
- [ ] **V206 · I** — Test 400% paginazoom / 320 CSS-pixel reflow.
- [ ] **V207 · I** — Test aangepast line-height 1.5x.
- [ ] **V208 · I** — Test paragraafafstand 2x font-size.
- [ ] **V209 · I** — Test letterafstand 0.12x font-size.
- [ ] **V210 · I** — Test woordafstand 0.16x font-size.
- [ ] **V211 · I** — Test OS-instelling larger text waar mogelijk.
- [ ] **V212 · I** — Test browser minimale fontgrootte.
- [ ] **V213 · I** — Test reduced motion voorkeur.
- [ ] **V214 · I** — Test toetsenbordfocus in kleine header.
- [ ] **V215 · I** — Test focus niet verborgen onder vaste elementen.
- [ ] **V216 · I** — Test touchtargets en uitzonderingen volgens WCAG 2.5.8.

### 19. Visuele stabiliteit, laden en performantiesignalen
- [ ] **V217 · V** — Controleer layoutverschuiving als fonts laden.
- [ ] **V218 · V** — Controleer layoutverschuiving als lazy-images laden.
- [ ] **V219 · V** — Controleer placeholders op juiste verhouding.
- [ ] **V220 · V** — Controleer scrolljumps na accordion of carrousel.
- [ ] **V221 · V** — Controleer skeleton / shimmer zonder afleiding.
- [ ] **V222 · V** — Controleer onvoldoende geladen achtergrond als foutscenario.
- [ ] **V223 · V** — Controleer iconfont flash / ontbrekende symbolen.
- [ ] **V224 · V** — Controleer sticky-header resize bij scroll.
- [ ] **V225 · V** — Controleer scroll snapping zonder verdwijnende items.
- [ ] **V226 · A** — Verzamel synthetische navigatietijden als onderzoekssignaal.
- [ ] **V227 · V** — Controleer trage verbinding en geladen content.
- [ ] **V228 · V** — Controleer CLS met echte paginatraces bij kritieke flow.

### 20. Cross-page consistentie, afronding en bewijs
- [ ] **V229 · V** — Vergelijk H1 grootte tussen gelijksoortige templates.
- [ ] **V230 · V** — Vergelijk CTA styling tussen gelijksoortige diensten.
- [ ] **V231 · V** — Vergelijk horizontale padding op alle 30 pagina's.
- [ ] **V232 · V** — Vergelijk footerhoogte tussen korte en lange pagina.
- [ ] **V233 · V** — Vergelijk illustratiepositie tussen dienstpagina's.
- [ ] **V234 · V** — Vergelijk introafstanden tussen diensten.
- [ ] **V235 · V** — Vergelijk juridische templates versus marketingtemplates.
- [ ] **V236 · V** — Controleer lege secties bij ontbrekende data.
- [ ] **V237 · V** — Controleer dat verbeteringen de bestaande merkidentiteit bewaren.
- [ ] **V238 · V** — Controleer screenshot-diffs na elke fix op 320/390/768/1024/1440.
- [ ] **V239 · A** — Registreer viewport, URL, selector, werkelijke pixels en tijd.
- [ ] **V240 · V** — Sluit alleen af na hertest en menselijke beoordeling van signalen.

**Totaal:** 240 unieke punten, 20 categorieën. Bij twijfel: `review`, nooit automatisch `pass`.
