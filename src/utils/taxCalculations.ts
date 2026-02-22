
export const IRPF_GENERAL_BRACKETS_2024 = [
    { limit: 17280, rate: 0.23, deduction: 0 },
    { limit: 34560, rate: 0.28, deduction: 3974.40 }, // Cumulative tax up to previous bracket is approximate, better to calculate incrementally or use formula
    { limit: 51840, rate: 0.35, deduction: 8812.80 },
    { limit: 74030, rate: 0.40, deduction: 14860.80 },
    { limit: 102530, rate: 0.45, deduction: 23736.80 },
    { limit: 136670, rate: 0.46, deduction: 36561.80 },
    { limit: 199240, rate: 0.47, deduction: 52266.20 },
    { limit: Infinity, rate: 0.49, deduction: 81995.10 }
];

// Savings base: 20% up to 2500, 21% next 2500-10000, 22% next 10000-15000, 23% next 15000-30000, 25% > 30000
// Simplified based on search results saying "20% to 25% for >30k"
export const IRPF_SAVINGS_BRACKETS_2024 = [
    { limit: 2500, rate: 0.20 },
    { limit: 10000, rate: 0.21 },
    { limit: 15000, rate: 0.22 },
    { limit: 30000, rate: 0.23 },
    { limit: Infinity, rate: 0.25 }
];

export const WEALTH_TAX_BRACKETS_2024 = [
    { limit: 167129, rate: 0.002, baseTax: 0 },
    { limit: 334252, rate: 0.003, baseTax: 334.26 },
    { limit: 668499, rate: 0.005, baseTax: 835.63 },
    { limit: 1336999, rate: 0.009, baseTax: 2506.86 },
    { limit: 2673999, rate: 0.013, baseTax: 8523.36 },
    { limit: 5347998, rate: 0.017, baseTax: 25904.36 },
    { limit: 10695996, rate: 0.021, baseTax: 71362.35 },
    { limit: Infinity, rate: 0.025, baseTax: 183670.30 }
];

export const WEALTH_TAX_EXEMPT_MIN = 700000;
export const MAIN_HOME_EXEMPT_MAX = 300000;

export function calculateIRPFGeneral(base: number): number {
    if (base <= 0) return 0;

    // Using the exact formula: Cuota Integra = Cuota anterior resto + (base_liquidable - base_anterior) * tipo
    // The 'deduction' in my constant above was slightly misleading, it was the 'Cuota Integra' up to that point.
    // Let's iterate.

    let tax = 0;
    let previousLimit = 0;

    for (const bracket of IRPF_GENERAL_BRACKETS_2024) {
        if (base > previousLimit) {
            const taxableAmountInBracket = Math.min(base, bracket.limit) - previousLimit;
            tax += taxableAmountInBracket * bracket.rate;
            previousLimit = bracket.limit;
            if (base <= bracket.limit) break;
        }
    }

    return tax;
}

export function calculateIRPFSavings(base: number): number {
    if (base <= 0) return 0;

    let tax = 0;
    let previousLimit = 0;

    for (const bracket of IRPF_SAVINGS_BRACKETS_2024) {
        if (base > previousLimit) {
            const taxableAmountInBracket = Math.min(base, bracket.limit) - previousLimit;
            tax += taxableAmountInBracket * bracket.rate;
            previousLimit = bracket.limit;
            if (base <= bracket.limit) break;
        }
    }
    return tax;
}

export function calculateWealthTax(netWealth: number, isMainHome: boolean, mainHomeValue: number): number {
    // 1. Deduct Main Home exemption (max 300k, but only if it is the main home asset)
    // Actually, usually the input is Total Net Wealth including home.
    // We need to subtract the Exempt Main Home value first.

    let taxableWealth = netWealth;

    if (isMainHome) {
        const exemption = Math.min(mainHomeValue, MAIN_HOME_EXEMPT_MAX);
        taxableWealth -= exemption;
    }

    // 2. Minimum Exempt
    taxableWealth -= WEALTH_TAX_EXEMPT_MIN;

    if (taxableWealth <= 0) return 0;

    // 3. Apply scale

    // This table functions differently: it gives "Cuota Integra" for the "Base Liquidable Hasta".
    // The brackets I defined:
    // { limit: 200000, rate: 0.002, baseTax: 0 },
    // Means: up to 200k, tax is rate 0.2%.
    // Next bracket: { limit: 400000, rate: 0.003, baseTax: 400 }
    // Means: for the START of this bracket (200k), tax is 400. The REST is taxed at 0.3%.



    // Find the highest bracket that is BELOW or EQUAL to taxableWealth?
    // Actually the table logic is: 
    // Base Liquidable Hasta 0 -> Cuota 0 -> Resto hasta 200.000 at 0.20%
    // Base Liquidable Hasta 200.000 -> Cuota 400 -> Resto hasta 200.000 at 0.30%

    // Let's reimplement to match the table exactly.
    // Brackets:
    // 0 - 200,000 : 0.2%
    // 200,000 - 400,000 : 0.3%
    // 400,000 - 800,000 : 0.5%
    // ...

    // My previous array structure was slightly off. Let's strictly follow "Resto Base Liquidable".
    // The table says:
    // 0 -> 0 -> 200k @ 0.2%
    // 200k -> 400 -> 200k @ 0.3%
    // 400k -> 1000 -> 400k @ 0.5%

    // Correct logic:
    // If wealth is 500k.
    // It falls in the 400k bracket.
    // Tax = 1000 + (500k - 400k) * 0.5% = 1000 + 500 = 1500.

    const brackets = [
        { threshold: 0, tax: 0, rate: 0.002 },
        { threshold: 167129, tax: 334.26, rate: 0.003 },
        { threshold: 334252, tax: 835.63, rate: 0.005 },
        { threshold: 668499, tax: 2506.86, rate: 0.009 },
        { threshold: 1336999, tax: 8523.36, rate: 0.013 },
        { threshold: 2673999, tax: 25904.36, rate: 0.017 },
        { threshold: 5347998, tax: 71362.35, rate: 0.021 },
        { threshold: 10695996, tax: 183670.30, rate: 0.025 }
    ];

    // iterate backwards to find the threshold
    for (let i = brackets.length - 1; i >= 0; i--) {
        const bracket = brackets[i];
        if (taxableWealth >= bracket.threshold) {
            return bracket.tax + (taxableWealth - bracket.threshold) * bracket.rate;
        }
    }

    return 0;
}

export function applyEscudoFiscal(
    totalIrpfQuota: number,
    totalWealthTaxQuota: number,
    irpfGeneralBase: number,
    irpfSavingsBase: number
): { finalWealthTax: number, adjustment: number } {

    // "The sum of the full quotas for Wealth Tax and IRPF cannot exceed 65% of the IRPF taxable base."
    // Which taxable base? "Base imponible general y del ahorro".

    const totalIrpfBase = irpfGeneralBase + irpfSavingsBase;
    const limit = totalIrpfBase * 0.65;

    const totalTax = totalIrpfQuota + totalWealthTaxQuota;

    if (totalTax <= limit) {
        return { finalWealthTax: totalWealthTaxQuota, adjustment: 0 };
    }

    // If exceeded, reduce Wealth Tax.
    // Reduction cannot exceed 75% of the original Wealth Tax quota. 
    // Means MINIMUM Wealth Tax is 25% of original.

    const excess = totalTax - limit;
    const maxReduction = totalWealthTaxQuota * 0.75;
    const actualReduction = Math.min(excess, maxReduction);

    return {
        finalWealthTax: totalWealthTaxQuota - actualReduction,
        adjustment: actualReduction
    };
}
