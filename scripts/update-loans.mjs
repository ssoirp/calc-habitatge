import { mkdir, writeFile } from 'node:fs/promises';

const today = new Date().toISOString().slice(0, 10);

const providers = [
  {
    id: 'bankintercard-personal',
    provider: 'Bankintercard',
    product: 'Préstamo personal online',
    sourceUrl: 'https://www.bankinterconsumerfinance.com/financiacion/prestamos/prestamo-personal',
    sourceLabel: 'Bankinter Consumer Finance',
    noPayroll: true,
    noPayrollText: 'Sense vinculacions i sense canviar de banc',
    fees: '0 % obertura si el procés és 100 % online',
    notes: 'Rang públic del simulador; el tipus final depèn del perfil.',
    fallback: {
      amountMin: 4000,
      amountMax: 30000,
      monthsMin: 24,
      monthsMax: 120,
      tinMin: 4.45,
      tinMax: 12.49,
      taeMin: 4.54,
      taeMax: 13.23
    },
    extract: async () => {
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
    }
  },
  {
    id: 'bbva-rapid',
    provider: 'BBVA',
    product: 'Préstamo Rápido Online Sin Documentos',
    sourceUrl: 'https://www.bbva.es/content/experience-fragments/public-web-new/bbvaes/personas/home/home/prestamo-rapido-no-clientes.html',
    sourceLabel: 'BBVA',
    noPayroll: true,
    noPayrollText: 'Sense obrir compte ni domiciliar nòmina',
    fees: 'Sense comissió d’obertura',
    notes: 'Tipus publicat específic per a l’opció sense nòmina.',
    fallback: {
      amountMin: 3000,
      amountMax: 20000,
      monthsMin: 24,
      monthsMax: 96,
      tinMin: 6.6,
      tinMax: 6.6,
      taeMin: 6.803,
      taeMax: 6.803
    },
    extract: async () => {
      const pricingHtml = await fetchText('https://www.bbva.es/content/experience-fragments/public-web-new/bbvaes/personas/home/home/prestamo-rapido-no-clientes.html');
      const noPayrollTin = extractFirstNumber(pricingHtml, /([0-9]+(?:,[0-9]+)?)\s*%\s*TIN\s*y\s*[0-9]+(?:,[0-9]+)?\s*%\s*TAE\s*sin domiciliar la nómina/i);
      const noPayrollTae = extractFirstNumber(pricingHtml, /[0-9]+(?:,[0-9]+)?\s*%\s*TIN\s+y\s*([0-9]+(?:,[0-9]+)?)\s*%\s*TAE\s*sin domiciliar la nómina/i);
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
    }
  },
  {
    id: 'cetelem-projectes',
    provider: 'Cetelem',
    product: 'Préstamo Otros Proyectos',
    sourceUrl: 'https://www.cetelem.es/prestamos/prestamo-otros-proyectos',
    sourceLabel: 'Cetelem',
    noPayroll: true,
    noPayrollText: 'Sense domiciliar nòmina ni canviar de banc',
    fees: 'Sense productes afegits',
    notes: 'Per sota de 10.000 €, el màxim publicat és 60 mesos.',
    rules: [{ amountMaxExclusive: 10000, monthsMax: 60 }],
    fallback: {
      amountMin: 6000,
      amountMax: 60000,
      monthsMin: 12,
      monthsMax: 96,
      tinMin: 10.59,
      tinMax: 12.49,
      taeMin: 11.12,
      taeMax: 13.23
    },
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
    id: 'cofidis-personal',
    provider: 'Cofidis',
    product: 'Préstamo Personal',
    sourceUrl: 'https://www.cofidis.es/es/prestamo-personal.html',
    sourceLabel: 'Cofidis',
    noPayroll: true,
    noPayrollText: 'Sense domiciliar nòmina ni canviar de banc',
    fees: 'Sense comissions d’obertura ni manteniment',
    notes: 'Oferta pública flexible amb resposta ràpida.',
    fallback: {
      amountMin: 6000,
      amountMax: 60000,
      monthsMin: 12,
      monthsMax: 96,
      tinMin: 6.77,
      tinMax: 12.05,
      taeMin: 6.95,
      taeMax: 12.76
    },
    extract: async () => {
      const html = await fetchText('https://www.cofidis.es/es/prestamo-personal.html');
      const block = html.match(/6\.000\s*€\s*a\s*60\.000\s*€\.[\s\S]{0,250}Mínimo TIN\s*6,77\s*%[\s\S]{0,160}máximo TIN\s*12,05\s*%[\s\S]{0,160}TAE\s*12,76\s*%/i)?.[0];
      if (!block) throw new Error('No s\'ha pogut localitzar el bloc principal de Cofidis');
      const amounts = extractTwoNumbers(block, /([0-9.]+)\s*€\s*a\s*([0-9.]+)\s*€/i);
      const months = extractTwoNumbers(block, /Plazo de devolución inicial de\s*([0-9]+)\s*a\s*([0-9]+)\s*meses/i);
      const tin = extractTwoNumbers(block, /Mínimo TIN\s*([0-9]+(?:,[0-9]+)?)\s*%[\s\S]{0,80}máximo TIN\s*([0-9]+(?:,[0-9]+)?)\s*%/i);
      const tae = extractTwoNumbers(block, /TAE\s*([0-9]+(?:,[0-9]+)?)\s*%[\s\S]{0,80}TAE\s*([0-9]+(?:,[0-9]+)?)\s*%/i);
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
    id: 'lea-bank-personal',
    provider: 'Lea Bank',
    product: 'Préstamo personal online',
    sourceUrl: 'https://prestamo.leabank.es/',
    sourceLabel: 'Lea Bank',
    noPayroll: true,
    noPayrollText: 'Sense canviar de banc',
    fees: '3 % formalització finançada + 2 €/mes de manteniment',
    openingFeePct: 3,
    openingFeeFinanced: true,
    monthlyFee: 2,
    notes: 'Cost mensual ajustat amb comissió finançada i quota fixa mensual.',
    fallback: {
      amountMin: 5000,
      amountMax: 30000,
      monthsMin: 6,
      monthsMax: 96,
      tinMin: 6.95,
      tinMax: 16.5,
      taeMin: 7.32,
      taeMax: 18.79
    },
    extract: async () => {
      const html = await fetchText('https://prestamo.leabank.es/');
      const amounts = extractTwoNumbers(html, /input type="range"[^>]+name="application\.appliedAmount"[^>]+min="([0-9]+)"[^>]+max="([0-9]+)"/i);
      const months = extractTwoNumbers(html, /input type="range"[^>]+name="application\.appliedRepaymentTime"[^>]+min="([0-9]+)"[^>]+max="([0-9]+)"/i);
      const tin = extractTwoNumbers(html, /Desde\s*([0-9]+(?:\.[0-9]+)?)%\s*T\.I\.N\.\s*\([0-9]+(?:\.[0-9]+)?%\s*T\.A\.E\.\s*mín\.\)\.\s*Hasta\s*([0-9]+(?:\.[0-9]+)?)%\s*T\.I\.N/i);
      const tae = extractTwoNumbers(html, /Desde\s*[0-9]+(?:\.[0-9]+)?%\s*T\.I\.N\.\s*\(([0-9]+(?:\.[0-9]+)?)%\s*T\.A\.E\.\s*mín\.\)\.\s*Hasta\s*[0-9]+(?:\.[0-9]+)?%\s*T\.I\.N\.\s*\(([0-9]+(?:\.[0-9]+)?)%\s*T\.A\.E\.\s*máx\.\)/i);
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
    id: 'oney-personal',
    provider: 'Oney',
    product: 'Préstamo Personal Online',
    sourceUrl: 'https://prestamos.oney.es/',
    sourceLabel: 'Oney',
    noPayroll: true,
    noPayrollText: 'Sense canviar de banc',
    fees: 'Sense comissions',
    notes: 'El TIN varia segons import, termini i destí.',
    fallback: {
      amountMin: 1000,
      amountMax: 45000,
      monthsMin: 12,
      monthsMax: 120,
      tinMin: 8,
      tinMax: 12.46,
      taeMin: 8.3,
      taeMax: 13.2
    },
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
    id: ‘santander-consumer-personal’,
    provider: ‘Santander Consumer’,
    product: ‘Préstamo personal online’,
    sourceUrl: ‘https://www.santanderconsumer.es/prestamos/personal.html’,
    sourceLabel: ‘Santander Consumer’,
    noPayroll: true,
    noPayrollText: ‘Sense canviar de banc’,
    fees: ‘Sense comissió d’obertura’,
    notes: ‘Tipus fix visible al simulador públic actual.’,
    fallback: {
      amountMin: 3000,
      amountMax: 12000,
      monthsMin: 24,
      monthsMax: 72,
      tinMin: 10.86,
      tinMax: 10.86,
      taeMin: 12.49,
      taeMax: 12.49
    },
    extract: async () => {
      const html = await fetchText(‘https://www.santanderconsumer.es/prestamos/personal.html’);
      const amounts = extractTwoNumbers(html, /id="amountMin">Min\s*([0-9.]+)€<\/span>\s*<span id="amountMax">Max\s*([0-9.]+)€/i);
      const months = extractTwoNumbers(html, /id="monthsMin">Min\s*([0-9]+)\s*meses<\/span>\s*<span id="monthsMax">Max\s*([0-9]+)\s*meses/i);
      const tin = extractFirstNumber(html, /Tipo deudor:\s*<span>([0-9]+(?:,[0-9]+)?)<\/span>%/i);
      const tae = extractFirstNumber(html, /TAE:<span>([0-9]+(?:,[0-9]+)?)<\/span>%/i);
      return {
        amountMin: amounts[0],
        amountMax: amounts[1],
        monthsMin: months[0],
        monthsMax: months[1],
        tinMin: tin,
        tinMax: tin,
        taeMin: tae,
        taeMax: tae
      };
    }
  },
  {
    id: ‘n26-personal’,
    provider: ‘N26’,
    product: ‘Préstamo Personal’,
    sourceUrl: ‘https://n26.com/es-es/prestamo-personal’,
    sourceLabel: ‘N26’,
    noPayroll: true,
    noPayrollText: ‘Sense domiciliar nòmina; cal compte N26’,
    fees: ‘Sense comissió d’obertura’,
    notes: ‘TIN des de 3,99 %; oferta personalitzada segons scoring creditici. Diners en < 24 h.’,
    fallback: {
      amountMin: 1000, amountMax: 15000,
      monthsMin: 12, monthsMax: 60,
      tinMin: 3.99, tinMax: 12.90,
      taeMin: 4.06, taeMax: 13.69
    },
    extract: async () => {
      const html = await fetchText(‘https://n26.com/es-es/prestamo-personal’);
      const tin = extractTwoNumbers(html, /([0-9]+(?:,[0-9]+)?)%\s*T\.?I\.?N.*?([0-9]+(?:,[0-9]+)?)%\s*T\.?I\.?N/is);
      return {
        amountMin: 1000, amountMax: 15000,
        monthsMin: 12, monthsMax: 60,
        tinMin: tin[0], tinMax: tin[1],
        taeMin: 4.06, taeMax: 13.69
      };
    }
  },
  {
    id: ‘revolut-personal’,
    provider: ‘Revolut’,
    product: ‘Préstamo Personal’,
    sourceUrl: ‘https://www.revolut.com/es-ES/personal-loans/’,
    sourceLabel: ‘Revolut’,
    noPayroll: true,
    noPayrollText: ‘Sense domiciliar nòmina; cal compte Revolut’,
    fees: ‘Sense comissions d’obertura ni estudi’,
    notes: ‘El TIN depèn del perfil i historial. Rang ampli segons scoring.’,
    fallback: {
      amountMin: 2000, amountMax: 30000,
      monthsMin: 3, monthsMax: 96,
      tinMin: 3.49, tinMax: 14.49,
      taeMin: 3.55, taeMax: 15.26
    },
    extract: async () => {
      const html = await fetchText(‘https://www.revolut.com/es-ES/personal-loans/’);
      const tin = extractTwoNumbers(html, /([0-9]+(?:,[0-9]+)?)%\s*TIN.*?([0-9]+(?:,[0-9]+)?)%\s*TIN/is);
      return {
        amountMin: 2000, amountMax: 30000,
        monthsMin: 3, monthsMax: 96,
        tinMin: tin[0], tinMax: tin[1],
        taeMin: 3.55, taeMax: 15.26
      };
    }
  },
  {
    id: ‘ing-naranja’,
    provider: ‘ING’,
    product: ‘Préstamo Naranja’,
    sourceUrl: ‘https://www.ing.es/prestamos-personales’,
    sourceLabel: ‘ING’,
    noPayroll: true,
    noPayrollText: ‘Sense domiciliar nòmina; cal obrir compte ING’,
    fees: ‘Sense comissions d’obertura, estudi ni cancel·lació’,
    notes: ‘Tipus variable segons perfil. Sense cap comissió.’,
    fallback: {
      amountMin: 3000, amountMax: 60000,
      monthsMin: 12, monthsMax: 96,
      tinMin: 5.49, tinMax: 12.49,
      taeMin: 5.63, taeMax: 13.23
    },
    extract: async () => {
      const html = await fetchText(‘https://www.ing.es/prestamos-personales’);
      const tin = extractTwoNumbers(html, /([0-9]+(?:,[0-9]+)?)%\s*TIN.*?([0-9]+(?:,[0-9]+)?)%\s*TIN/is);
      return {
        amountMin: 3000, amountMax: 60000,
        monthsMin: 12, monthsMax: 96,
        tinMin: tin[0], tinMax: tin[1],
        taeMin: 5.63, taeMax: 13.23
      };
    }
  },
  {
    id: ‘younited-credit’,
    provider: ‘Younited Credit’,
    product: ‘Préstamo Personal’,
    sourceUrl: ‘https://es.younited-credit.com/’,
    sourceLabel: ‘Younited Credit’,
    noPayroll: true,
    noPayrollText: ‘Sense domiciliar nòmina ni canviar de banc’,
    fees: ‘Sense comissions ocultes’,
    notes: ‘Fintech francesa. Aprovació en < 48 h. Cal justificar ingressos estables.’,
    fallback: {
      amountMin: 1000, amountMax: 50000,
      monthsMin: 24, monthsMax: 96,
      tinMin: 9.56, tinMax: 12.48,
      taeMin: 9.99, taeMax: 13.98
    },
    extract: async () => {
      const html = await fetchText(‘https://es.younited-credit.com/’);
      const tin = extractTwoNumbers(html, /([0-9]+(?:,[0-9]+)?)%\s*TIN.*?([0-9]+(?:,[0-9]+)?)%\s*TIN/is);
      return {
        amountMin: 1000, amountMax: 50000,
        monthsMin: 24, monthsMax: 96,
        tinMin: tin[0], tinMax: tin[1],
        taeMin: 9.99, taeMax: 13.98
      };
    }
  },
  {
    id: ‘openbank-personal’,
    provider: ‘Openbank’,
    product: ‘Préstamo Personal’,
    sourceUrl: ‘https://www.openbank.es/open-to-learn/pedir-prestamo-personal’,
    sourceLabel: ‘Openbank (Santander)’,
    noPayroll: true,
    noPayrollText: ‘Sense domiciliar nòmina’,
    fees: ‘Sense comissió d’obertura ni estudi’,
    notes: ‘Rang TIN estret i competitiu. Import màx limitat a 24.000 €.’,
    fallback: {
      amountMin: 300, amountMax: 24000,
      monthsMin: 12, monthsMax: 60,
      tinMin: 4.95, tinMax: 6.95,
      taeMin: 5.06, taeMax: 7.18
    },
    extract: async () => {
      const html = await fetchText(‘https://www.openbank.es/open-to-learn/pedir-prestamo-personal’);
      const tin = extractTwoNumbers(html, /([0-9]+(?:,[0-9]+)?)%.*?([0-9]+(?:,[0-9]+)?)%\s*TIN/is);
      return {
        amountMin: 300, amountMax: 24000,
        monthsMin: 12, monthsMax: 60,
        tinMin: tin[0], tinMax: tin[1],
        taeMin: 5.06, taeMax: 7.18
      };
    }
  },
  {
    id: ‘evo-banco-personal’,
    provider: ‘EVO Banco’,
    product: ‘Préstamo Inteligente EVO’,
    sourceUrl: ‘https://www.evobanco.com/prestamos/’,
    sourceLabel: ‘EVO Banco’,
    noPayroll: true,
    noPayrollText: ‘Sense vinculacions; cal Compte Intel·ligent EVO’,
    fees: ‘Sense cap comissió (obertura, estudi ni cancel·lació)’,
    notes: ‘Tipus fix 9,45 % sense vinculació. Amb nòmina+assegurança: 8,45 %.’,
    fallback: {
      amountMin: 3000, amountMax: 50000,
      monthsMin: 12, monthsMax: 96,
      tinMin: 9.45, tinMax: 9.45,
      taeMin: 9.87, taeMax: 9.87
    },
    extract: async () => {
      const html = await fetchText(‘https://www.evobanco.com/prestamos/’);
      const tin = extractFirstNumber(html, /([0-9]+(?:,[0-9]+)?)%\s*TIN/i);
      return {
        amountMin: 3000, amountMax: 50000,
        monthsMin: 12, monthsMax: 96,
        tinMin: tin, tinMax: tin,
        taeMin: 9.87, taeMax: 9.87
      };
    }
  },
  {
    id: ‘bbva-personal-client’,
    provider: ‘BBVA’,
    product: ‘Préstamo Personal Online (clients)’,
    sourceUrl: ‘https://www.bbva.es/personas/productos/prestamos/prestamo-personal-online.html’,
    sourceLabel: ‘BBVA’,
    noPayroll: false,
    noPayrollText: ‘Per a clients BBVA; pot requerir vinculació’,
    fees: ‘Sense comissió d’obertura’,
    notes: ‘Opció per a clients existents. Import superior al préstec ràpid.’,
    fallback: {
      amountMin: 3000, amountMax: 75000,
      monthsMin: 12, monthsMax: 96,
      tinMin: 7.80, tinMax: 7.80,
      taeMin: 8.08, taeMax: 8.08
    },
    extract: async () => {
      const html = await fetchText(‘https://www.bbva.es/personas/productos/prestamos/prestamo-personal-online.html’);
      const tin = extractFirstNumber(html, /([0-9]+(?:,[0-9]+)?)%\s*TIN/i);
      const tae = extractFirstNumber(html, /([0-9]+(?:,[0-9]+)?)%\s*TAE/i);
      return {
        amountMin: 3000, amountMax: 75000,
        monthsMin: 12, monthsMax: 96,
        tinMin: tin, tinMax: tin,
        taeMin: tae, taeMax: tae
      };
    }
  },
  {
    id: ‘prestalo-personal’,
    provider: ‘Préstalo’,
    product: ‘Préstamo Personal’,
    sourceUrl: ‘https://prestalo.com/prestamo-personal/’,
    sourceLabel: ‘Préstalo’,
    noPayroll: true,
    noPayrollText: ‘Sense domiciliar nòmina ni canviar de banc’,
    fees: ‘Sense comissions d’obertura, estudi ni amortització’,
    notes: ‘Marketplace/broker; canalitza a Bankinter CF i altres. El TIN final depèn del partner.’,
    fallback: {
      amountMin: 100, amountMax: 60000,
      monthsMin: 12, monthsMax: 96,
      tinMin: 4.45, tinMax: 14.95,
      taeMin: 4.54, taeMax: 15.88
    },
    extract: async () => {
      const html = await fetchText(‘https://prestalo.com/prestamo-personal/’);
      const tin = extractTwoNumbers(html, /([0-9]+(?:,[0-9]+)?)%\s*TIN.*?([0-9]+(?:,[0-9]+)?)%\s*TIN/is);
      return {
        amountMin: 100, amountMax: 60000,
        monthsMin: 12, monthsMax: 96,
        tinMin: tin[0], tinMax: tin[1],
        taeMin: 4.54, taeMax: 15.88
      };
    }
  }
];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'accept-language': 'es-ES,es;q=0.9',
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
  const value = String(raw).replace(/\u00a0/g, '').trim();
  if (value.includes(',') && value.includes('.')) {
    return Number(value.replace(/\./g, '').replace(',', '.'));
  }
  if (value.includes(',')) {
    return Number(value.replace(',', '.'));
  }
  if (value.includes('.')) {
    const parts = value.split('.');
    if (parts.length === 2 && parts[1].length <= 2) return Number(value);
    return Number(parts.join(''));
  }
  return Number(value);
}

function stripRuntimeFields(offer) {
  const clean = { ...offer };
  delete clean.extract;
  delete clean.fallback;
  return clean;
}

async function main() {
  const offers = [];
  const logs = [];

  for (const provider of providers) {
    const base = stripRuntimeFields(provider);
    try {
      const extracted = await provider.extract();
      offers.push({
        ...base,
        ...extracted,
        scrapeStatus: 'ok'
      });
      logs.push(`OK  ${provider.provider}`);
    } catch (err) {
      offers.push({
        ...base,
        ...provider.fallback,
        scrapeStatus: 'fallback',
        scrapeError: err instanceof Error ? err.message : String(err)
      });
      logs.push(`FB  ${provider.provider}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  offers.sort((a, b) => a.provider.localeCompare(b.provider, 'ca'));

  const dataset = {
    scrapedAt: today,
    offers
  };

  await mkdir('data', { recursive: true });
  await writeFile('data/prestecs-rapids.json', JSON.stringify(dataset, null, 2) + '\n', 'utf8');
  console.log(`Actualitzat data/prestecs-rapids.json amb ${offers.length} ofertes (${today}).`);
  logs.forEach(line => console.log(line));
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
