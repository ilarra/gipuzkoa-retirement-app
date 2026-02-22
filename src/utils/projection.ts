
import type { Asset, Expense, FamilyMember, IncomeStream, SimulationResult, YearResult, TaxResults } from '../types';
import { calculateIRPFGeneral, calculateIRPFSavings, calculateWealthTax, applyEscudoFiscal } from './taxCalculations';

export interface ProjectionParameters {
    startYear: number;
    yearsToProject: number;
    inflationRate: number; // e.g., 0.02
    targetRetirementIncome?: number; // Desired annual net income during retirement
}

export function runProjection(
    members: FamilyMember[],
    assets: Asset[],
    incomes: IncomeStream[],
    expenses: Expense[],
    params: ProjectionParameters
): SimulationResult {
    const years: YearResult[] = [];

    // Deep copy initial state to avoid mutating props
    let currentAssets = assets.map(a => ({ ...a }));
    let currentIncomes = incomes.map(i => ({ ...i }));
    let currentExpenses = expenses.map(e => ({ ...e }));

    // Primary earner is assumed to be the one whose retirement age dictates "Pension phase" start for simplicity,
    // OR we check each individual's retirement status per year.
    // Better: Check individual status.

    // Find standard retirement age if not set
    const defaultRetirementAge = 67;

    for (let i = 0; i < params.yearsToProject; i++) {
        const currentYear = params.startYear + i;

        // Determine retirement status for each member this year
        const memberAges: Record<string, number> = {};
        const memberIsRetired: Record<string, boolean> = {};

        members.forEach(m => {
            const age = m.age + i;
            memberAges[m.id] = age;
            const retAge = m.retirementAge || defaultRetirementAge;
            memberIsRetired[m.id] = age >= retAge;
        });

        // 1. Calculate Gross Income for the year (Base)
        let totalGrossIncome = 0;

        // Apply growth & retirement logic to incomes
        currentIncomes.forEach(inc => {
            // Growth happens at start of year for simplicity
            if (i > 0) inc.amount = inc.amount * (1 + inc.growthRate);

            let isActive = true;
            // Check owners to see if this income stream is active

            // Logic: 
            // - startAge: Active if Primary Owner Age >= startAge
            // - endAge: Active if Primary Owner Age < endAge

            const ownersIds = inc.owners.length > 0 ? inc.owners : members.filter(m => m.isEarner).map(m => m.id);
            // Default to first owner for timing logic if multiple
            const primaryOwnerId = ownersIds[0];
            const primaryOwnerAge = memberAges[primaryOwnerId]; // Should exist

            if (primaryOwnerId && primaryOwnerAge !== undefined) {
                if (inc.startAge !== undefined && primaryOwnerAge < inc.startAge) {
                    isActive = false;
                }
                if (inc.endAge !== undefined && primaryOwnerAge >= inc.endAge) {
                    isActive = false;
                }
            }

            if (isActive) {
                totalGrossIncome += inc.amount;
            } else {
                // Inactive
            }
        });

        // 2. Calculate Expenses
        let totalExpenses = 0;
        currentExpenses.forEach(exp => {
            if (i > 0) exp.amount = exp.amount * (1 + exp.growthRate);

            let isActive = true;
            if (exp.startYear !== undefined && i < exp.startYear) isActive = false;
            // endYear is relative to the start of the simulation (year 0). 
            // So if endYear is 15, it means it is active for years 0 through 14. 
            // When i = 15, it is no longer active.
            if (exp.endYear !== undefined && i >= exp.endYear) isActive = false;

            if (isActive) {
                totalExpenses += exp.amount;
            }
        });

        // 3. Asset Drawdown Logic (Top-up)
        // Step 3a: Calculate "Fixed" Taxable Income (PRE-WITHDRAWAL)
        // We need to re-loop incomes to get realized amounts
        const realizedIncomes = currentIncomes.map(inc => {
            let isActive = true;
            const ownersIds = inc.owners.length > 0 ? inc.owners : members.filter(m => m.isEarner).map(m => m.id);
            const primaryOwnerId = ownersIds[0];
            const primaryOwnerAge = memberAges[primaryOwnerId];

            if (primaryOwnerId && primaryOwnerAge !== undefined) {
                if (inc.startAge !== undefined && primaryOwnerAge < inc.startAge) isActive = false;
                if (inc.endAge !== undefined && primaryOwnerAge >= inc.endAge) isActive = false;
            }
            return { ...inc, realizedAmount: isActive ? inc.amount : 0 };
        });

        let yearGrossFixed = realizedIncomes.reduce((sum, inc) => sum + inc.realizedAmount, 0);

        // Initial Tax Calc (Pre-Drawdown)
        const calculateTaxesForIncome = (incomesList: any[], assetsList: any[]) => {
            let tIrpf = 0; let tIrpfGen = 0; let tIrpfSav = 0; let tWealth = 0; let tEscudo = 0;
            const mData: Record<string, { generalBase: number, savingsBase: number, netWealth: number, mainHomeValue: number }> = {};
            members.forEach(m => mData[m.id] = { generalBase: 0, savingsBase: 0, netWealth: 0, mainHomeValue: 0 });

            incomesList.forEach(inc => {
                const count = inc.owners?.length || 0;
                if (count === 0 || inc.realizedAmount === 0) return;
                // Undeclared income is ignored for tax purposes
                if (inc.isUndeclared) return;

                const amt = inc.realizedAmount / count;
                inc.owners.forEach((oid: string) => {
                    if (mData[oid]) {
                        if (inc.type === 'salary' || inc.type === 'pension' || inc.type === 'rental') mData[oid].generalBase += amt;
                        else mData[oid].savingsBase += amt;
                    }
                });
            });

            assetsList.forEach(ast => {
                const count = ast.owners?.length || 0;
                if (count === 0) return;
                const val = ast.value / count;
                // Use Valor Catastral for Wealth Tax if available (for real estate), otherwise Market Value
                const wealthVal = (ast.type === 'real_estate' && ast.valorCatastral) ? ast.valorCatastral / count : val;

                ast.owners.forEach((oid: string) => {
                    if (mData[oid]) {
                        mData[oid].netWealth += wealthVal;
                        if (ast.isMainResidence) mData[oid].mainHomeValue += wealthVal;
                    }
                });
            });

            // Subtract outstanding mortgage debt from net wealth
            currentExpenses.forEach(exp => {
                if (!exp.isMortgage) return;

                // Calculate remaining years
                const startYearOffset = exp.startYear || 0;
                const endYearOffset = exp.endYear || 0;

                // Only consider active/future mortgages
                if (i >= endYearOffset) return;

                // If it hasn't started yet, the full debt exists or we only count from start?
                // Let's assume debt exists now but payments haven't started, or it only exists from startYear.
                if (i < startYearOffset) return;

                const yearsRemaining = endYearOffset - i;
                const outstandingDebt = exp.amount * yearsRemaining;

                // Apportion debt equally among all earners for simplicity, 
                // or ideally we would have 'owners' on expenses. 
                // Let's divide by number of earners.
                const earners = members.filter(m => m.isEarner).map(m => m.id);
                if (earners.length === 0) return;

                const debtPerEarner = outstandingDebt / earners.length;
                earners.forEach(oid => {
                    if (mData[oid]) {
                        // Debt reduces net wealth (but not below 0 generally for wealth tax purposes, though mathematically it can)
                        mData[oid].netWealth = Math.max(0, mData[oid].netWealth - debtPerEarner);
                    }
                });
            });

            const memberTaxesResults: Record<string, TaxResults> = {};

            for (const m of members) {
                const d = mData[m.id];
                if (!d) {
                    memberTaxesResults[m.id] = { irpf: 0, irpfGeneral: 0, irpfSavings: 0, wealthTax: 0, escudoFiscalAdjustment: 0 };
                    continue;
                }
                const taxGen = calculateIRPFGeneral(d.generalBase);
                const taxSav = calculateIRPFSavings(d.savingsBase);
                const irpf = taxGen + taxSav;
                const wealth = calculateWealthTax(d.netWealth, d.mainHomeValue > 0, d.mainHomeValue);
                const { finalWealthTax, adjustment } = applyEscudoFiscal(irpf, wealth, d.generalBase, d.savingsBase);

                memberTaxesResults[m.id] = {
                    irpf,
                    irpfGeneral: taxGen,
                    irpfSavings: taxSav,
                    wealthTax: finalWealthTax,
                    escudoFiscalAdjustment: adjustment
                };

                tIrpf += irpf;
                tIrpfGen += taxGen;
                tIrpfSav += taxSav;
                tWealth += finalWealthTax;
                tEscudo += adjustment;
            }
            return { irpf: tIrpf, irpfGeneral: tIrpfGen, irpfSavings: tIrpfSav, wealthTax: tWealth, escudo: tEscudo, memberTaxes: memberTaxesResults };
        }

        let baseTaxes = calculateTaxesForIncome(realizedIncomes, currentAssets);
        let netIncomeFixed = yearGrossFixed - (baseTaxes.irpf + baseTaxes.wealthTax);

        let drawdownAmount = 0;

        // Check if we are in "Retirement Phase" (Any owner retired? or primary?)
        // Let's apply if any owner is retired.
        const isRetirementPhase = members.some(m => memberIsRetired[m.id]);

        if (isRetirementPhase && params.targetRetirementIncome && params.targetRetirementIncome > 0) {
            if (netIncomeFixed < params.targetRetirementIncome) {
                const deficit = params.targetRetirementIncome - netIncomeFixed;
                // Needed cash to cover deficit.

                // Let's assume we withdraw from 'cash' first, then 'stock' or 'fund'.
                // Sort liquid assets by growth rate (lowest first) or type hierarchy.
                const liquidAssets = currentAssets
                    .filter(a => (a.type === 'stock' || a.type === 'fund' || a.type === 'cash') && a.value > 0)
                    .sort((a, b) => {
                        // Prioritize cash
                        if (a.type === 'cash' && b.type !== 'cash') return -1;
                        if (a.type !== 'cash' && b.type === 'cash') return 1;
                        // Then by growth rate (ascending)
                        return (a.growthRate || 0) - (b.growthRate || 0);
                    });

                let remainingToWithdraw = deficit; // This is NET needed.

                for (const asset of liquidAssets) {
                    if (remainingToWithdraw <= 0) break;

                    const available = asset.value;
                    const withdrawAmount = Math.min(available, remainingToWithdraw);

                    // Execute Drawdown
                    asset.value -= withdrawAmount;
                    remainingToWithdraw -= withdrawAmount;
                    drawdownAmount += withdrawAmount;

                    // Add to realized income as "Capital Gain" (Simplified: 20% of withdrawal is gain?)
                    // Let's assume 30% profitability accumulated over years
                    const estimatedGain = withdrawAmount * 0.3;

                    // We need to add this 'Withdrawal Income' to the realized incomes for the FINAL tax calc
                    realizedIncomes.push({
                        id: `drawdown-${asset.id}-${i}`,
                        name: `Sale of ${asset.name}`,
                        type: 'other', // Goes to savings base generally? 'dividend'/'interest' types go to savings. 

                        amount: estimatedGain,
                        owners: asset.owners,
                        growthRate: 0,
                        realizedAmount: estimatedGain
                    });
                }
            }
        }

        // Final Tax Calculation with Drawdowns
        const finalTaxes = calculateTaxesForIncome(realizedIncomes, currentAssets);

        // 4. Cash Flow & Net Worth Update
        // We need to attribute Cash Flow to individuals to prevent "Socialist Simulation" (Wealth Convergence)
        // Individual Cash Flow = (Individual Income + Individual Drawdowns) - Individual Taxes - (Shared Expenses / N)

        const earners = members.filter(m => m.isEarner); // Or all adults?
        // Assuming if isEarner=false (kids), they don't pay expenses or get savings.
        const expenseShare = totalExpenses / (earners.length || 1);

        const memberCashFlows: Record<string, number> = {};
        earners.forEach(m => memberCashFlows[m.id] = 0);

        // Attribute Incomes
        realizedIncomes.forEach(inc => {
            const count = inc.owners?.length || 0;
            if (count === 0) return;
            const amt = inc.realizedAmount / count;
            inc.owners.forEach(oid => {
                if (memberCashFlows[oid] !== undefined) memberCashFlows[oid] += amt;
            });
        });

        // Subtract Taxes and Expenses
        earners.forEach(m => {
            const tax = (finalTaxes.memberTaxes[m.id]?.irpf || 0) + (finalTaxes.memberTaxes[m.id]?.wealthTax || 0);
            memberCashFlows[m.id] -= tax;
            memberCashFlows[m.id] -= expenseShare;
        });

        // Global Cash Flow (for display)
        const totalTax = finalTaxes.irpf + finalTaxes.wealthTax;
        const totalCashIn = yearGrossFixed + drawdownAmount;
        const cashFlow = totalCashIn - totalExpenses - totalTax;

        // Calculate global outstanding debt for the dashboard
        let globalOutstandingDebt = 0;
        currentExpenses.forEach(exp => {
            if (exp.isMortgage && i >= (exp.startYear || 0) && i < (exp.endYear || 0)) {
                globalOutstandingDebt += exp.amount * ((exp.endYear || 0) - i);
            }
        });

        const totalNetWorth = currentAssets.reduce((sum, a) => sum + a.value, 0) - globalOutstandingDebt;

        years.push({
            year: currentYear,
            age: (members[0].age || 40) + i,
            netWorth: totalNetWorth,
            totalIncome: totalCashIn,
            totalExpenses: totalExpenses,
            taxes: {
                irpf: finalTaxes.irpf,
                irpfGeneral: finalTaxes.irpfGeneral,
                irpfSavings: finalTaxes.irpfSavings,
                wealthTax: finalTaxes.wealthTax,
                escudoFiscalAdjustment: finalTaxes.escudo
            },
            cashFlow,
            withdrawalForTargetIncome: drawdownAmount,
            assetValues: currentAssets.reduce((acc, a) => ({ ...acc, [a.name]: a.value }), {} as Record<string, number>),
            incomeBreakdown: realizedIncomes.reduce((acc, inc) => {
                const effectiveAmount = inc.realizedAmount;
                if (!effectiveAmount || effectiveAmount === 0) return acc;
                // Group by name or type? Name is more specific.
                acc[inc.name] = (acc[inc.name] || 0) + effectiveAmount;
                return acc;
            }, {} as Record<string, number>),
            memberTaxes: finalTaxes.memberTaxes
        });

        // 5. Update Asset Values for next year
        currentAssets.forEach(a => {
            let rate = 0;
            if (a.growthRate !== undefined) rate = a.growthRate;
            else {
                if (a.type === 'stock' || a.type === 'fund' || a.type === 'pension_plan') rate = 0.05;
                else if (a.type === 'real_estate') rate = 0.02;
                else rate = 0;
            }
            // Skip updating 'cash' assets here if we update them below? 
            // Standard growth applies to everything. Cash growth should be 0 usually.
            a.value = a.value * (1 + rate);
        });

        // Add savings / Remove burn per member
        Object.entries(memberCashFlows).forEach(([memberId, flow]) => {
            if (flow !== 0) {
                // Find or create "Savings ({Name})"
                const member = members.find(m => m.id === memberId);
                const assetName = `Savings (${member?.name || memberId})`;
                const assetId = `generated-cash-${memberId}`;

                let cashAsset = currentAssets.find(a => a.id === assetId);
                if (!cashAsset) {
                    cashAsset = {
                        id: assetId,
                        name: assetName,
                        type: 'cash',
                        value: 0,
                        owners: [memberId],
                        purchaseValue: 0,
                        isMainResidence: false,
                        growthRate: 0 // Cash doesn't usually grow unless invested
                    };
                    currentAssets.push(cashAsset);
                }

                cashAsset.value += flow;

                // If negative, burn?
                // The logic allows negative value (debt). 
                // Alternatively, burn shared assets? 
                // For now, let's allow negative personal cash (debt) or reduction of personal savings.
            }
        });
    }

    return { years };
}
