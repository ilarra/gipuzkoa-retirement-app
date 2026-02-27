export type FamilyMemberId = string;

export interface FamilyMember {
    id: FamilyMemberId;
    name: string;
    age: number;
    isEarner: boolean; // True if they have income/assets to declare
    retirementAge?: number; // Age at which they retire
    hasBis56Exemption?: boolean; // Under Gipuzkoa Impatriate special regime
    bis56ExemptionYearsRemaining?: number; // Years left for the exemption
}

export type AssetType = 'real_estate' | 'stock' | 'fund' | 'pension_plan' | 'cash' | 'other';

export interface Asset {
    id: string;
    name: string;
    type: AssetType;
    value: number; // Current market value
    owners: FamilyMemberId[]; // Who owns this? (supports multiple for shared ownership)
    purchaseValue: number; // For potential capital gains in IRPF
    isMainResidence: boolean; // Important for Wealth Tax exemption
    growthRate?: number; // Annual growth rate (e.g. 0.05 for 5%)
    valorCatastral?: number; // For Wealth Tax (Real Estate)
    isForeignAsset?: boolean; // Exempt from Wealth Tax if owner has Bis 56
}

export type IncomeType = 'salary' | 'rental' | 'dividend' | 'interest' | 'pension' | 'other';

export interface IncomeStream {
    id: string;
    name: string;
    type: IncomeType;
    amount: number; // Gross annual amount
    owners: FamilyMemberId[];
    growthRate: number; // Expected annual growth %
    startAge?: number; // Age of primary owner to start (e.g. 67 for pension)
    endAge?: number; // Age of primary owner to stop (e.g. 65 for salary)
    isUndeclared?: boolean; // If true, this income is not declared for tax purposes (En B)
}

export interface Expense {
    id: string;
    name: string;
    amount: number; // Annual amount
    growthRate: number; // Inflation for this expense
    startYear?: number; // relative to now, 0 is now
    endYear?: number; // relative to now (e.g., years remaining on mortgage)
    isMortgage?: boolean; // True if this expense is a mortgage
}

export interface TaxResults {
    irpf: number; // Total IRPF
    irpfGeneral: number; // Tax on Salary/Pension/Rental
    irpfSavings: number; // Tax on Dividends/Interest/Capital Gains
    wealthTax: number;
    escudoFiscalAdjustment: number; // Amount saved by Shield
}

export interface YearResult {
    year: number;
    age: number; // Age of primary earner
    netWorth: number;
    totalIncome: number;
    totalExpenses: number;
    taxes: TaxResults;
    cashFlow: number; // Income - Expenses - Taxes
    withdrawalForTargetIncome: number; // Amount sold from assets to meet target
    cashDrawdown: number; // Amount withdrawn from cash balances
    stockDrawdown: number; // Amount withdrawn from stocks/funds
    assetValues: Record<string, number>; // Breakdown of value by Asset Name
    incomeBreakdown: Record<string, number>; // Breakdown of income by Source Name (Salary, Rental, etc.)
    memberTaxes: Record<string, TaxResults>; // Taxes paid by each family member
}

export interface SimulationResult {
    years: YearResult[];
}
