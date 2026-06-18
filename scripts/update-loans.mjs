import { writeFile, mkdir } from 'node:fs/promises';

const today = new Date().toISOString().slice(0, 10);

const providers = [
  {
    id: 'bbva-rapid',
    provider: 'BBVA',
    product: 'Préstamo Rápido Online Sin Documentos',
    sourceUrl: 'https://www.bbva.es/content/experience-fragments/public-web-new/bbvaes/personas/home/home/prestamo-rapido-no-clientes.html',
    rangeUrl: 'https://www.bbva.es/content/experience-fragments/public-web-new/bbvaes/personas/home/home/prestamo-rapido-no-clientes.html',
    sourceLabel: 'BBVA',
    noPayroll: true,
    noPayrollText: 'Sense obrir compte ni domiciliar nòmina',
    fees: 'Sense comissió d’obertura',
    notes: 'Tipus publicat específic per a l’opció sense nòmina.',
    extract: async () => {
      try {
        const pricingHtml = await fetchText('https://www.bbva.es/content/experience-fragments/public-web-new/bbvaes/personas/home/home/prestamo-rapido-no-clientes.html');
        const noPayrollTin = extractFirstNumber(pricingHtml, /([0-9]+(?:,[0-9]+)?)\s*%\s*TIN\s*y\s*[0-9]+(?:,[0-9]+)?\s*%\s*TAE\s*sin domiciliar la nómina/i);
        const noPayrollTae = extractFirstNumber(pricingHtml, /[0-9]+(?:,[0-9]+)?\s*%\s*TIN\s*y\s*([0-9]+(?:,[0-9]+)?)\s*%\s*TAE\s*sin domiciliar la nómina/i);
        return {
          amountMin: 3000,
          amountMax: 20000,
          monthsMin: 24,
          monthsMax: 96,
          tinMin: noPayrollTin,
          tinMax: noPayrollTin,
          taeMin: noPayrollTae,
          taeMax: noPayrollTae
        };
      } catch {
        return {
          amountMin: 3000,
          amountMax: 20000,
          monthsMin: 24,
          monthsMax: 96,
          tinMin: 6.6,
          tinMax: 6.6,
          taeMin: 6.803,
          taeMax: 6.803
        };
      }
    }
  },
  {
    id: 'oney-personal',
    provider: 'Oney',
    product: 'Préstamo Personal Online',
    sourceUrl: 'https://prestamos.oney.es/',
    rangeUrl: 'https://prestamos.oney.es/',
    sourceLabel: 'Oney',
    noPayroll: true,
    noPayrollText: 'Sense canviar de banc',
    fees: 'Sense comissions',
    notes: 'El TIN varia segons import, termini i destí.',
    extract: async () => {
      const html = await fetchText('https://prestamos.oney.es/');
      const tin = extractTwoNumbers(html, /Desde\s+TIN\s+([0-9]+(?:,[0-9]+)?)%\s*\(TAE mínima [0-9]+(?:,[0-9]+)?%\)\s*hasta\s+TIN\s+([0-9]+(?:,[0-9]+)?)%/i);
      const tae = extractTwoNumbers(html, /TAE mínima\s*([0-9]+(?:,[0-9]+)?)%\)\s*hasta\s+TIN\s+[0-9]+(?:,[0-9]+)?%\s*\(TAE máxima\s*([0-9]+(?:,[0-9]+)?)%/i);
      const amounts = extractTwoNumbers(html, /Préstamos desde\s+([0-9.]+)€\s+hasta\s+([0-9.]+)€/i);
      const months = extractTwoNumbers(html, /Duración comprendida entre\s+([0-9]+)\s+y\s+([0-9]+)\s+meses/i);
      return {
        amountMin: amounts[0],
        amountMax: amounts[1],
        monthsMin: months[0],
        monthsMax: months[1],
        tinMin: tin[0],
        tinMax: tin[1],
        taeMin: tae[0],
        taeMax: tae[1]
      };
    }
  },
  {
    id: 'cetelem-projectes',
    provider: 'Cetelem',
    product: 'Préstamo Otros Proyectos',
    sourceUrl: 'https://www.cetelem.es/prestamos/prestamo-otros-proyectos',
    rangeUrl: 'https://www.cetelem.es/prestamos/prestamo-otros-proyectos',
    sourceLabel: 'Cetelem',
    noPayroll: true,
    noPayrollText: 'Sense domiciliar nòmina ni canviar de banc',
    fees: 'Sense productes afegits',
    notes: 'Per sota de 10.000 €, el màxim publicat és 60 mesos.',
    rules: [{ amountMaxExclusive: 10000, monthsMax: 60 }],
    extract: async () => {
      const html = await fetchText('https://www.cetelem.es/prestamos/prestamo-otros-proyectos');
      const tin = extractTwoNumbers(html, /TIN desde\s*([0-9]+(?:,[0-9]+)?)%\s*hasta\s*([0-9]+(?:,[0-9]+)?)%/i);
      const tae = extractTwoNumbers(html, /TAE desde\s*([0-9]+(?:,[0-9]+)?)%\s*hasta\s*([0-9]+(?:,[0-9]+)?)%/i);
      const amounts = extractTwoNumbers(html, /desde\s*([0-9.]+)€\s*hasta\s*([0-9.]+)€/i);
      const months = extractTwoNumbers(html, /Duración comprendida entre\s*([0-9]+)\s*y\s*([0-9]+)\s*meses/i);
      return {
        amountMin: amounts[0],
        amountMax: amounts[1],
        monthsMin: months[0],
        monthsMax: months[1],
        tinMin: tin[0],
        tinMax: tin[1],
        taeMin: tae[0],
        taeMax: tae[1]
      };
    }
  },
  {
    id: 'bankintercard-personal',
    provider: 'Bankintercard',
    product: 'Préstamo personal online',
    sourceUrl: 'https://www.bankinterconsumerfinance.com/financiacion/prestamos/prestamo-personal',
    rangeUrl: 'https://www.bankinterconsumerfinance.com/financiacion/prestamos/prestamo-personal',
    sourceLabel: 'Bankinter Consumer Finance',
    noPayroll: true,
    noPayrollText: 'Sense vinculacions i sense canviar de banc',
    fees: '0 % obertura si el procés és 100 % online',
    notes: 'Rang públic del simulador; el tipus final depèn del perfil.',
    extract: async () => {
      try {
        const html = await fetchText('https://www.bankinterconsumerfinance.com/financiacion/prestamos/prestamo-personal');
        const tin = extractTwoNumbers(html, /Desde\s*([0-9]+(?:,[0-9]+)?)%\s*T\.?I\.?N\.?.*?Hasta\s*([0-9]+(?:,[0-9]+)?)%\s*T\.?I\.?N/i);
        const amountMax = extractFirstNumber(html, /Hasta\s*([0-9.]+)\s*€/i);
        const monthsMax = extractFirstNumber(html, /hasta\s*([0-9]+)\s*meses/i);
        return {
          amountMin: 4000,
          amountMax,
          monthsMin: 24,
          monthsMax,
          tinMin: tin[0],
          tinMax: tin[1],
          taeMin: 4.54,
          taeMax: 13.23
        };
      } catch {
        return {
          amountMin: 4000,
          amountMax: 30000,
          monthsMin: 24,
          monthsMax: 120,
          tinMin: 4.45,
          tinMax: 12.49,
          taeMin: 4.54,
          taeMax: 13.23
        };
      }
    }
  }
];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; calc-habitatge-bot/1.0)'
    }
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

function extractFirstNumber(text, regex) {
  const match = text.match(regex);
  if (!match) throw new Error(`No s'ha pogut extreure ${regex}`);
  return toNumber(match[1]);
}

function extractTwoNumbers(text, regex) {
  const match = text.match(regex);
  if (!match) throw new Error(`No s'ha pogut extreure ${regex}`);
  return [toNumber(match[1]), toNumber(match[2])];
}

function toNumber(raw) {
  return Number(String(raw).replace(/\./g, '').replace(',', '.'));
}

async function main() {
  const offers = [];
  for (const provider of providers) {
    const extracted = await provider.extract();
    offers.push({
      ...provider,
      ...extracted
    });
    delete offers[offers.length - 1].extract;
  }

  const dataset = { scrapedAt: today, offers };
  await mkdir('data', { recursive: true });
  await writeFile('data/prestecs-rapids.json', JSON.stringify(dataset, null, 2) + '\n', 'utf8');
  console.log(`Actualitzat data/prestecs-rapids.json amb ${offers.length} ofertes (${today}).`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
