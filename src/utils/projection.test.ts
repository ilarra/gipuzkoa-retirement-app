
import { describe, it, expect } from 'vitest';
import { runProjection } from './projection';
import type { FamilyMember, Asset, IncomeStream, Expense } from '../types';

describe('runProjection Wealth Tax Real Data', () => {
    it('should calculate different wealth tax for Iker and Idoia based on backup data', () => {
        const members: FamilyMember[] = [
            { id: "1", name: "iker", age: 47, isEarner: true, retirementAge: 50 },
            { id: "2", name: "idoia", age: 42, isEarner: true, retirementAge: 50 },
            { id: "3", name: "maren", age: 13, isEarner: false },
            { id: "4", name: "julen", age: 9, isEarner: false }
        ];

        // Partially reconstructed assets from JSON
        const assets: Asset[] = [
            { id: "1", name: "Main Home", type: "real_estate", value: 600000, owners: ["1", "2"], purchaseValue: 300000, isMainResidence: true, growthRate: 0.01 },
            { id: "2", name: "cash ", value: 200000, type: "cash", owners: ["1", "2"], purchaseValue: 200000, isMainResidence: false },
            { id: "3", name: "donos", value: 500000, type: "real_estate", owners: ["1", "2"], purchaseValue: 47, isMainResidence: false, growthRate: 0.02, valorCatastral: 200000 },
            { id: "4", name: "stocks and funds (parents)", type: "stock", value: 2400000, owners: ["1", "2"], purchaseValue: 0, isMainResidence: false, growthRate: 0.03 },
            { id: "5", name: "stocks and funds (kids)", type: "stock", value: 10000, owners: ["3", "4"], purchaseValue: 0, isMainResidence: false, growthRate: 0.04 },
            { id: "6", name: "donos (b)", type: "real_estate", value: 600000, owners: ["1", "2"], purchaseValue: 0, isMainResidence: false, growthRate: 0.02, valorCatastral: 200000 },
            { id: "7", name: "Etxalar", type: "real_estate", value: 300000, owners: ["1"], purchaseValue: 0, isMainResidence: false, growthRate: 0.01, valorCatastral: 125000 },
            { id: "8", name: "Bergara etxia", type: "real_estate", value: 300000, owners: ["1"], purchaseValue: 0, isMainResidence: false, growthRate: 0.008, valorCatastral: 200000 }
        ];

        const incomes: IncomeStream[] = [
            { id: "1", name: "salary iker", type: "salary", amount: 300000, owners: ["1"], growthRate: 0.02, endAge: 50 },
            { name: "salario idoia Salary", amount: 40000, type: "other", id: "2", owners: ["2"], growthRate: 0.02, endAge: 50 }
        ];

        const expenses: Expense[] = [
            { name: "Living Expenses", amount: 50000, id: "2", growthRate: 0.02 }
        ];

        const result = runProjection(members, assets, incomes, expenses, {
            startYear: 2024,
            yearsToProject: 32, // Go to 2056
            inflationRate: 0
        });

        const year30 = result.years[30];
        const taxIker = year30.memberTaxes['1'].wealthTax;
        const taxIdoia = year30.memberTaxes['2'].wealthTax; // Ensure this property exists

        console.log('Iker Wealth Tax:', taxIker);
        console.log('Idoia Wealth Tax:', taxIdoia);

        // Expect Iker to pay more
        expect(taxIker).toBeGreaterThan(taxIdoia);
        expect(taxIker).toBeGreaterThan(3000);
        expect(taxIdoia).toBeGreaterThan(0);
        expect(taxIker).not.toEqual(taxIdoia);
    });
});

describe('runProjection Joint Tax', () => {
    it('should calculate IRPF jointly when doJointTaxes is true vs false', () => {
        const members: FamilyMember[] = [
            { id: "1", name: "Spouse A", age: 40, isEarner: true },
            { id: "2", name: "Spouse B", age: 40, isEarner: true }
        ];

        const incomesEqually: IncomeStream[] = [
            { id: "1", name: "salary A", type: "salary", amount: 50000, owners: ["1"], growthRate: 0 },
            { id: "2", name: "salary B", type: "salary", amount: 50000, owners: ["2"], growthRate: 0 }
        ];

        const resultIndividual = runProjection(members, [], incomesEqually, [], {
            startYear: 2024,
            yearsToProject: 1,
            inflationRate: 0,
            doJointTaxes: false
        });

        const resultJoint = runProjection(members, [], incomesEqually, [], {
            startYear: 2024,
            yearsToProject: 1,
            inflationRate: 0,
            doJointTaxes: true
        });

        const indTaxA = resultIndividual.years[0].memberTaxes['1'].irpf;
        const indTaxB = resultIndividual.years[0].memberTaxes['2'].irpf;
        const totalIndTaxes = indTaxA + indTaxB;

        const jointTaxA = resultJoint.years[0].memberTaxes['1'].irpf;
        const jointTaxB = resultJoint.years[0].memberTaxes['2'].irpf;
        const totalJointTaxes = jointTaxA + jointTaxB;

        // Progressivity makes joint tax higher in this specific simple case (where standard brackets are used)
        expect(totalJointTaxes).toBeGreaterThan(totalIndTaxes);

        // They should bear exactly 50% of the joint tax since their individual bases are equal
        expect(jointTaxA).toBeCloseTo(jointTaxB);
        expect(jointTaxA).toBeCloseTo(totalJointTaxes / 2);
    });
});
