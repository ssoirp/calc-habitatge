# Metodologia de recollida de dades de préstecs personals

> Última actualització: 2026-06-18 · 15 ofertes

## Criteri de selecció

Incloem préstecs personals que compleixin **tots** aquests criteris:

1. **Disponibles a Espanya** per a residents.
2. **Contractables online** (100 % digital o quasi).
3. **Sense obligació de domiciliar nòmina** (pot caldre obrir compte, però no vincular ingressos).
4. **No són microcrèdits** (Vivus, Moneyman…) ni crèdit revolving (Wizink).
5. **TIN i rang d'imports publicats** a la web pública del proveïdor o a comparadors fiables.

## Fonts de dades

### Fonts primàries (web oficial del proveïdor)

Per a cada oferta, el camp `sourceUrl` apunta directament a la pàgina pública del producte. L'scraper (`scripts/update-loans.mjs`) intenta extreure TIN, TAE, imports i terminis amb regex sobre l'HTML.

| Proveïdor | URL d'extracció | Què busquem |
|---|---|---|
| Bankinter CF | bankinterconsumerfinance.com/financiacion/prestamos/prestamo-personal | Rang TIN al text legal del simulador |
| BBVA (ràpid) | bbva.es/personas/productos/prestamos/prestamo-rapido-online.html | TIN/TAE sense nòmina al bloc de preus |
| BBVA (clients) | bbva.es/personas/productos/prestamos/prestamo-personal-online.html | TIN/TAE al peu legal |
| Cetelem | cetelem.es/prestamos/prestamo-otros-proyectos | Bloc "TIN desde X% hasta Y%" + imports + mesos |
| Cofidis | cofidis.es/es/prestamo-personal.html | Bloc amb rang TIN/TAE i imports |
| EVO Banco | evobanco.com/prestamos/ | TIN fix al text principal |
| ING | ing.es/prestamos-personales | Rang TIN al peu o al hero |
| Lea Bank | prestamo.leabank.es/ | Sliders HTML (atributs `min`/`max`) + text legal TIN/TAE |
| N26 | n26.com/es-es/prestamo-personal | Rang TIN al bloc informatiu |
| Oney | prestamos.oney.es/ | Text legal "Desde TIN X% hasta TIN Y%" |
| Openbank | openbank.es/open-to-learn/pedir-prestamo-personal | Rang TIN al cos de l'article |
| Préstalo | prestalo.com/prestamo-personal/ | Rang TIN al bloc principal (és broker → redirigeix a Bankinter CF) |
| Revolut | revolut.com/es-ES/personal-loans/ | Rang TIN al bloc legal |
| Santander Consumer | santanderconsumer.es/prestamos/personal.html | Simulador públic amb `amountMin/Max` i TIN fix |
| Younited Credit | es.younited-credit.com/ | Rang TIN/TAE al peu legal |

### Fonts secundàries (comparadors)

Quan la web oficial no funciona (403, SPA sense HTML estàtic, canvi d'estructura), validem i actualitzem amb:

- **[Kelisto](https://www.kelisto.es/prestamos-personales)** — comparador independent amb fitxes detallades per producte. Actualització freqüent.
- **[Roams](https://roams.es/finanzas/prestamos/)** — similar a Kelisto, amb anàlisi editorial.
- **[HelpMyCash](https://www.helpmycash.com/creditos/)** — fitxes de producte amb TIN/TAE/comissions.
- **[Rastreator](https://www.rastreator.com/finanzas/)** — comparador amb simulador propi.
- **[Rankia](https://www.rankia.com/blog/mejores-creditos-y-prestamos/)** — blog financer amb anàlisis detallades.

**Procediment de validació creuada:**
1. Primer intent: web oficial (font primària).
2. Si falla o les dades no quadren: contrastar amb 2+ comparadors.
3. Si els comparadors discrepen entre ells: agafar el rang més conservador (TIN més alt).

## Com funciona l'scraper

### Arquitectura

```
scripts/update-loans.mjs    →  data/prestecs-rapids.json
        ↑                              ↓
   (extracció HTML                (el widget el carrega
    amb fetch + regex)             amb fetch al init)
```

### Per a cada proveïdor

1. **`extract()`** — fa `fetch` de l'URL oficial i aplica regex per extreure TIN/TAE/imports/mesos.
2. Si l'extracció falla → utilitza **`fallback`** (dades manuals de l'última revisió vàlida).
3. El resultat porta un camp `scrapeStatus`: `"ok"` (extracció automàtica), `"fallback"` (regex ha fallat) o `"manual-update"` (actualitzat a mà).

### Execució

```bash
# Manual, des de l'arrel del projecte
node scripts/update-loans.mjs

# Automàtic: cada dilluns a les 6:00 UTC via GitHub Actions
# (.github/workflows/update-loans.yml)
# També es pot disparar manualment des de GitHub → Actions → Run workflow
```

### Fallback i resiliència

- Cada proveïdor té un objecte `fallback` amb dades hardcoded. Si el fetch falla (403, timeout, canvi d'HTML), el JSON resultant manté les dades anteriors amb `scrapeStatus: "fallback"`.
- El widget (`index.html`) també té un `loanSeed` hardcoded que s'usa si el `fetch` del JSON falla (p.ex. primer desplegament, offline).

## Com afegir un nou proveïdor

1. **Trobar la pàgina pública** amb TIN/TAE/imports/terminis. Buscar:
   - Landing del producte (p.ex. `banc.es/prestamo-personal`)
   - Peu legal amb l'exemple representatiu (obligatori per llei)
   - Simulador públic (sovint té els imports min/max als sliders)

2. **Afegir a `scripts/update-loans.mjs`** dins l'array `providers`:
   ```js
   {
     id: 'slug-unic',
     provider: 'Nom visible',
     product: 'Nom del producte',
     sourceUrl: 'https://...',
     sourceLabel: 'Nom curt',
     noPayroll: true,
     noPayrollText: 'Text en català',
     fees: 'Descripció comissions',
     notes: 'Nota breu',
     fallback: { amountMin, amountMax, monthsMin, monthsMax, tinMin, tinMax, taeMin, taeMax },
     extract: async () => { /* fetch + regex */ }
   }
   ```

3. **Afegir al `loanSeed`** dins `index.html` (backup inline).

4. **Executar** `node scripts/update-loans.mjs` i verificar el JSON.

5. **Commit** i push.

## Com trobar les dades d'un proveïdor nou

### Pas 1: Localitzar la pàgina de producte

Buscar a Google: `"[nom banc] préstamo personal online condiciones"` o directament navegar a la seva web → Préstecs.

### Pas 2: Trobar TIN i TAE

- **Peu legal / informació precontractual**: Per llei (Directiva 2008/48/CE), tot anunci de crèdit al consum ha d'incloure un exemple representatiu amb TIN i TAE. Sol estar en lletra petita al final de la pàgina.
- **Simulador**: Si en té un, moure els sliders al mínim i al màxim per veure el rang de TIN.
- **Fitxa de producte a comparadors**: Kelisto i HelpMyCash solen tenir TIN min/max actualitzats.

### Pas 3: Trobar imports i terminis

- **Simulador amb sliders**: els atributs HTML `min` i `max` dels `<input type="range">` donen els límits exactes (inspeccionar element).
- **Text legal**: "Desde X € hasta Y €, con un plazo de Z a W meses".
- **Comparadors**: si la web no ho mostra clarament.

### Pas 4: Comissions

- **Comissió d'obertura**: la majoria d'ofertes "sense canviar de banc" no en cobren. Si en cobren, buscar si es finança (s'afegeix al principal) o es paga per avançat.
- **Quota mensual fixa**: algunes (com Lea Bank) cobren X €/mes de manteniment.
- **Cancel·lació anticipada**: per llei, màxim 1 % (o 0,5 % si queda < 1 any). No l'incloem al càlcul perquè no afecta la quota regular.

### Pas 5: Validar

- Contrastar amb 2 comparadors (Kelisto + un altre).
- Verificar que la data de l'oferta és recent (no d'un article de fa 2 anys).
- Si el TIN és "des de X %", el mínim real pot ser molt inferior al que obtindràs — anotar-ho a `notes`.

## Camps especials per a comissions

| Camp | Tipus | Descripció |
|---|---|---|
| `openingFeePct` | number | % de comissió d'obertura sobre l'import sol·licitat |
| `openingFeeFixed` | number | Import fix de comissió d'obertura (€) |
| `openingFeeFinanced` | boolean | Si `true`, la comissió s'afegeix al principal (no es paga per avançat) |
| `monthlyFee` | number | Quota mensual fixa (€) que s'afegeix a la quota d'amortització |

El widget calcula el cost mensual real sumant la quota d'amortització (sobre `principal + openingFee financiat`) + `monthlyFee`.

## Limitacions

- **El TIN mostrat és una estimació.** El tipus real depèn del perfil creditici, scoring intern del banc, import i termini concrets. Només el simulador personalitzat del banc (que demana dades) dona el tipus definitiu.
- **L'estimació de TIN per a rangs** utilitza una interpolació lineal ponderada (35 % import, 65 % termini) — és una heurística, no una fórmula del banc.
- **Les webs canvien d'estructura** sense avís. El scraper pot fallar en qualsevol moment — per això hi ha fallbacks.
- **No incloem ofertes amb nòmina** com a opció principal (tret de BBVA clients, marcat com `noPayroll: false`).
