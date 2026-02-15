
import Papa from 'papaparse';
import Tesseract from 'tesseract.js';
import type { Asset, IncomeStream, Expense, FamilyMember } from '../types';

export interface AppData {
    version: number;
    members: FamilyMember[];
    assets: Asset[];
    incomes: IncomeStream[];
    expenses: Expense[];
    settings: {
        targetRetirementIncome: number;
    };
    timestamp: string;
}

export interface ParsedData {
    assets: Partial<Asset>[];
    incomes: Partial<IncomeStream>[];
    expenses: Partial<Expense>[];
    fullState?: AppData;
}

export const exportToJSON = (data: AppData) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gipuzkoa_retirement_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const parseJSON = (file: File): Promise<AppData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                // Basic validation
                if (!json.version || !json.members) {
                    reject(new Error("Invalid backup file format"));
                }
                resolve(json);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
};

export const parseCSV = (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: Papa.ParseResult<any>) => {
                const data: ParsedData = { assets: [], incomes: [], expenses: [] };

                // Simple heuristic: check columns or ask user 'Type'
                // For now, let's assume valid rows have a 'Type' column that matches our types.
                // Or we can accept separate files for Assets/Income?
                // Use a 'Category' column: 'Asset', 'Income', 'Expense'

                results.data.forEach((row: any) => {
                    const category = row['Category']?.toLowerCase();
                    const type = row['Type']?.toLowerCase();
                    const name = row['Name'];
                    const amount = parseFloat(row['Amount'] || row['Value'] || '0');

                    if (category === 'asset') {
                        data.assets.push({
                            name: name || 'Imported Asset',
                            type: isValidAssetType(type) ? type : 'other',
                            value: amount,
                            owners: [], // Default to empty, will be assigned to primary user
                            isMainResidence: false
                        });
                    } else if (category === 'income') {
                        data.incomes.push({
                            name: name || 'Imported Income',
                            type: isValidIncomeType(type) ? type : 'other',
                            amount: amount,
                            owners: [],
                            growthRate: 0.02
                        });
                    } else if (category === 'expense') {
                        data.expenses.push({
                            name: name || 'Imported Expense',
                            amount: amount,
                            growthRate: 0.02
                        });
                    }
                });
                resolve(data);
            },
            error: (error: Error) => {
                reject(error);
            }
        });
    });
};

export const parseImage = async (file: File): Promise<string> => {
    try {
        const result = await Tesseract.recognize(
            file,
            'eng', // English is best for code/numbers usually, but 'spa' might be needed for text?
            // Use 'eng' + 'spa' if possible, or just 'eng' for numbers
            { logger: m => console.log(m) }
        );
        return result.data.text;
    } catch (error) {
        console.error("OCR Error", error);
        throw error;
    }
};

// Heuristic parser for raw text (from OCR)
export const processImportDataFromText = (text: string): ParsedData => {
    const data: ParsedData = { assets: [], incomes: [], expenses: [] };
    const lines = text.split('\n');

    // Very basic heuristic: Look for lines with "Name ... Number"
    // Regex for:  [Words]  [Currency Symbol]? [Number]

    lines.forEach(line => {
        // cleanup
        const cleanLine = line.trim();
        if (!cleanLine) return;

        // Try to match:  "Salary 50000"
        const match = cleanLine.match(/^([a-zA-Z\s]+)\s+([0-9,.]+)/);
        if (match) {
            const name = match[1].trim();
            const valueStr = match[2].replace(/,/g, ''); // Remove commas
            const value = parseFloat(valueStr);

            if (!isNaN(value)) {
                // Guess category based on keywords
                const lowerName = name.toLowerCase();
                if (lowerName.includes('salary') || lowerName.includes('pension') || lowerName.includes('rent')) {
                    data.incomes.push({ name, amount: value, type: 'other' });
                } else if (lowerName.includes('expense') || lowerName.includes('bill') || lowerName.includes('tax')) {
                    data.expenses.push({ name, amount: value });
                } else {
                    // Default to asset?
                    data.assets.push({ name, value, type: 'other', owners: [] });
                }
            }
        }
    });

    return data;
};

// Helpers
const isValidAssetType = (t: string): boolean => {
    return ['real_estate', 'stock', 'fund', 'cash', 'business', 'other'].includes(t);
}
const isValidIncomeType = (t: string): boolean => {
    return ['salary', 'rental', 'dividend', 'interest', 'pension', 'other'].includes(t);
}
