
import React from 'react';
import type { IncomeStream, Expense, FamilyMember } from '../types';

interface Props {
    incomes: IncomeStream[];
    setIncomes: React.Dispatch<React.SetStateAction<IncomeStream[]>>;
    expenses: Expense[];
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    members: FamilyMember[];
}

export const IncomeForm: React.FC<Props> = ({ incomes, setIncomes, expenses, setExpenses, members }) => {

    const addIncome = () => {
        const newId = (Math.max(...incomes.map(i => parseInt(i.id)), 0) + 1).toString();
        setIncomes([...incomes, {
            id: newId,
            name: 'New Income',
            type: 'salary',
            amount: 0,
            owners: [members[0]?.id || ''],
            growthRate: 0.02
        }]);
    };

    const updateIncome = (id: string, field: keyof IncomeStream, value: any) => {
        setIncomes(incomes.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const removeIncome = (id: string) => {
        setIncomes(incomes.filter(i => i.id !== id));
    };

    const toggleOwner = (incomeId: string, memberId: string) => {
        const income = incomes.find(i => i.id === incomeId);
        if (!income) return;

        const currentOwners = income.owners || [];
        let newOwners: string[];

        if (currentOwners.includes(memberId)) {
            newOwners = currentOwners.filter((id: string) => id !== memberId);
        } else {
            newOwners = [...currentOwners, memberId];
        }

        updateIncome(incomeId, 'owners', newOwners);
    };

    const addExpense = () => {
        const newId = (Math.max(...expenses.map(e => parseInt(e.id)), 0) + 1).toString();
        setExpenses([...expenses, {
            id: newId,
            name: 'New Expense',
            amount: 0,
            growthRate: 0.02
        }]);
    };

    const updateExpense = (id: string, field: keyof Expense, value: any) => {
        setExpenses(expenses.map(e => {
            if (e.id === id) {
                const updated = { ...e, [field]: value };
                if (field === 'isMortgage' && value === true) {
                    updated.growthRate = 0; // Mortgages usually don't inflate
                }
                return updated;
            }
            return e;
        }));
    };

    const removeExpense = (id: string) => {
        setExpenses(expenses.filter(e => e.id !== id));
    };

    return (
        <div className="form-section">
            <h2>Income Streams</h2>
            {incomes.map(income => (
                <div key={income.id} className="form-row">
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            value={income.name}
                            onChange={e => updateIncome(income.id, 'name', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Type</label>
                        <select
                            value={income.type}
                            onChange={e => updateIncome(income.id, 'type', e.target.value)}
                        >
                            <option value="salary">Salary</option>
                            <option value="rental">Rental</option>
                            <option value="dividend">Dividend</option>
                            <option value="interest">Interest</option>
                            <option value="pension">Pension</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Annual Amount (€)</label>
                        <input
                            type="number"
                            value={income.amount}
                            onChange={e => updateIncome(income.id, 'amount', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Owners</label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {members.map(m => (
                                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={income.owners?.includes(m.id)}
                                        onChange={() => toggleOwner(income.id, m.id)}
                                    />
                                    {m.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Growth Rate</label>
                        <input
                            type="number"
                            step="0.01"
                            value={income.growthRate}
                            onChange={e => updateIncome(income.id, 'growthRate', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Starts at Age (Optional)</label>
                        <input
                            type="number"
                            value={income.startAge || ''}
                            onChange={e => updateIncome(income.id, 'startAge', parseInt(e.target.value) || undefined)}
                            placeholder="e.g. 67 (Pension)"
                        />
                    </div>
                    <div className="form-group">
                        <label>Stops at Age (Optional)</label>
                        <input
                            type="number"
                            value={income.endAge || ''}
                            onChange={e => updateIncome(income.id, 'endAge', parseInt(e.target.value) || undefined)}
                            placeholder="e.g. 65 (Salary)"
                        />
                    </div>

                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', minWidth: '100%', marginTop: '5px' }}>
                        <input
                            type="checkbox"
                            checked={income.isUndeclared || false}
                            onChange={e => updateIncome(income.id, 'isUndeclared', e.target.checked)}
                            id={`undeclared-${income.id}`}
                        />
                        <label htmlFor={`undeclared-${income.id}`} style={{ marginBottom: 0 }}>Undeclared (Fiscally Ignored)</label>
                    </div>
                    <button className="danger" onClick={() => removeIncome(income.id)}>X</button>
                </div>
            ))}
            <button className="primary" onClick={addIncome}>Add Income</button>

            <h2>Expenses</h2>
            {expenses.map(expense => (
                <div key={expense.id} className="form-row">
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            value={expense.name}
                            onChange={e => updateExpense(expense.id, 'name', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Annual Amount (€)</label>
                        <input
                            type="number"
                            value={expense.amount}
                            onChange={e => updateExpense(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Inflation Rate</label>
                        <input
                            type="number"
                            step="0.01"
                            value={expense.growthRate}
                            onChange={e => updateExpense(expense.id, 'growthRate', parseFloat(e.target.value) || 0)}
                            disabled={expense.isMortgage}
                        />
                    </div>
                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', minWidth: '100%', marginTop: '5px' }}>
                        <input
                            type="checkbox"
                            checked={expense.isMortgage || false}
                            onChange={e => updateExpense(expense.id, 'isMortgage', e.target.checked)}
                            id={`mortgage-${expense.id}`}
                        />
                        <label htmlFor={`mortgage-${expense.id}`} style={{ marginBottom: 0 }}>Is this a Mortgage/Loan?</label>
                    </div>
                    {expense.isMortgage && (
                        <div className="form-group" style={{ minWidth: '100%', marginTop: '5px' }}>
                            <label>Years Remaining</label>
                            <input
                                type="number"
                                value={expense.endYear || ''}
                                onChange={e => updateExpense(expense.id, 'endYear', parseInt(e.target.value) || undefined)}
                                placeholder="e.g. 15"
                            />
                        </div>
                    )}
                    <button className="danger" onClick={() => removeExpense(expense.id)}>X</button>
                </div>
            ))}
            <button className="primary" onClick={addExpense}>Add Expense</button>
        </div>
    );
};
