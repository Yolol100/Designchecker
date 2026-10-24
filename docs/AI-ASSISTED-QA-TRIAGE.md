# AI-assisted QA-triage (onderzoeksvoorstel)

**Status:** optionele reviewmethode, GEEN geimplementeerde CI-feature of automatisch QA-oordeel.

Deze aanpak kan de bestaande Playwright-, axe-core-, Lighthouse-, HTML- en visuele-regressiechecks ondersteunen. De bestaande tooling levert observaties; een AI-assistent mag hoogstens oorzaken en vervolgstappen voorstellen. Een modelantwoord wordt nooit rechtstreeks `PASS`, bugfix, WCAG-verklaring of Go/No-Go.

## Veilig en reproduceerbaar onderzoek

1. **Vooraf:** kies een geautoriseerde testomgeving. Houd target-URL, accountinhoud, screenshots, credentials en browserlogs buiten publieke prompts en de default branch. Werk met synthetische fixtures of volgens projectbeleid goedgekeurde, geschoonde run-artifacts.
2. **Observatie:** noteer testnaam, runner/commit, browser, viewport, omgeving, exacte fout, verwachte uitkomst en verwijzing naar het bestaande run-scoped bewijs. Classificeer bronfeiten apart van een veronderstelde oorzaak.
3. **AI-ondersteuning:** laat een assistent maximaal drie concrete hypotheses en mogelijke reproduceerstappen formuleren. Geef geen schrijfbevoegdheid op productie, repository-secrets, externe accounts of willekeurige websites. Bestaande veiligheids- en autorisatiegrenzen blijven actief.
4. **Verificatie:** reproduceer elke kandidaat op dezelfde fixture/configuratie. Voer een gerichte regressietest uit; controleer handmatig interactieve flow, keyboard, zoom en screenreader waar passend. Geen wijziging aan broncode of site zonder eigenaar, review en aparte toestemming.
5. **Conclusie:** gebruik alleen `confirmed`, `not_reproduced` of `needs_manual_review` als triagelabels. Deze labels zijn geen vervanging van bestaande Designchecker-runtime- of release-statussen. De vakowner en onafhankelijke QA bepalen de acceptatie.

## Klein proefprotocol

| Veld | Vereiste |
| --- | --- |
| Scope | 5 gesaniteerde, bestaande testfouten; geen nieuwe providerintegratie |
| Baseline | Handmatige triagetijd en foutclassificatie per case |
| Review | Reproduceerbaarheid van AI-hypothese tegen feitelijke run |
| Succescriterium | Minder onderzoek zonder toename van foutieve diagnoses |
| Stopcriterium | Dataverlies, privacyrisico, onverwachte writes of niet-reproduceerbare claims |

**Inspiratie, geen platformnorm:** Playwright MCP-live demo, 2025-04-16: https://www.youtube.com/watch?v=CNzg1aPwrKI. Huidige uitvoeringswaarheid: https://github.com/Yolol100/Designchecker/blob/main/README.md.