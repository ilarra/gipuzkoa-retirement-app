import { useState, useMemo } from 'react';
import type { FamilyMember, Asset, IncomeStream, Expense } from './types';
import { runProjection } from './utils/projection';
import { FamilyForm } from './components/FamilyForm';
import { AssetsForm } from './components/AssetsForm';
import { IncomeForm } from './components/IncomeForm';
import { Dashboard } from './components/Dashboard';
import { DataImport } from './components/DataImport';
import { LogicTab } from './components/LogicTab';
import { exportToJSON } from './utils/importUtils';
import type { ParsedData } from './utils/importUtils';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'family' | 'assets' | 'income' | 'dashboard' | 'logic'>('family');
  const [showImport, setShowImport] = useState(false);
  const [doJointTaxes, setDoJointTaxes] = useState(false);

  const [members, setMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Parent 1', age: 40, isEarner: true },
    { id: '2', name: 'Parent 2', age: 38, isEarner: true }
  ]);

  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', name: 'Main Home', type: 'real_estate', value: 400000, owners: ['1', '2'], purchaseValue: 300000, isMainResidence: true, growthRate: 0.02 }
  ]);
  // ... (lines 26-80 skipped)


  const [incomes, setIncomes] = useState<IncomeStream[]>([
    { id: '1', name: 'Salary 1', type: 'salary', amount: 45000, owners: ['1'], growthRate: 0.02 }
  ]);

  const [expenses, setExpenses] = useState<Expense[]>([
    { id: '1', name: 'Living Expenses', amount: 30000, growthRate: 0.02 }
  ]);

  const [targetRetirementIncome, setTargetRetirementIncome] = useState<number>(0);

  const simulationResult = useMemo(() => {
    return runProjection(members, assets, incomes, expenses, {
      startYear: new Date().getFullYear(),
      yearsToProject: 40,
      inflationRate: 0.02,
      targetRetirementIncome,
      doJointTaxes
    });
  }, [members, assets, incomes, expenses, targetRetirementIncome]);

  const handleExport = () => {
    exportToJSON({
      version: 1,
      members,
      assets,
      incomes,
      expenses,
      settings: { targetRetirementIncome },
      timestamp: new Date().toISOString()
    });
  };

  const handleImport = (data: ParsedData) => {
    if (data.fullState) {
      // Full Restore
      const s = data.fullState;
      // The Import Modal already warned the user about full replacement.
      setMembers(s.members || []);
      setAssets(s.assets || []);
      setIncomes(s.incomes || []);
      setExpenses(s.expenses || []);
      if (s.settings) {
        setTargetRetirementIncome(s.settings.targetRetirementIncome || 0);
      }
      // Force Dashboard tab to show results? 
      // alert("System restored successfully."); 
      // Better: Flash a UI message or just close logic. DataImport calls onClose.
      return;
    }

    // Merge imported data (CSV/OCR)
    // Assign new IDs to avoid conflicts
    const nextAssetId = Math.max(0, ...assets.map(a => parseInt(a.id))) + 1;
    const nextIncomeId = Math.max(0, ...incomes.map(i => parseInt(i.id))) + 1;
    const nextExpenseId = Math.max(0, ...expenses.map(e => parseInt(e.id))) + 1;

    const newAssets = data.assets.map((a, i) => ({
      ...a,
      id: (nextAssetId + i).toString(),
      owners: a.owners?.length ? a.owners : [members[0].id], // Default owner
      purchaseValue: a.value, // Default purchase value = current value
      isMainResidence: false,
      growthRate: a.growthRate !== undefined ? a.growthRate : (a.type === 'stock' || a.type === 'fund' ? 0.05 : 0.02)
    })) as Asset[];

    const newIncomes = data.incomes.map((inc, i) => ({
      ...inc,
      id: (nextIncomeId + i).toString(),
      owners: inc.owners?.length ? inc.owners : [members[0].id],
      growthRate: 0.02
    })) as IncomeStream[];

    const newExpenses = data.expenses.map((exp, i) => ({
      ...exp,
      id: (nextExpenseId + i).toString(),
      growthRate: 0.02
    })) as Expense[];

    setAssets([...assets, ...newAssets]);
    setIncomes([...incomes, ...newIncomes]);
    setExpenses([...expenses, ...newExpenses]);
    alert(`Imported ${newAssets.length} Assets, ${newIncomes.length} Incomes, ${newExpenses.length} Expenses.`);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Gipuzkoa Retirement Planner</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExport} style={{ fontSize: '0.9rem', padding: '5px 10px', background: '#4CAF50' }}>Export Backup</button>
          <button onClick={() => setShowImport(true)} style={{ fontSize: '0.9rem', padding: '5px 10px' }}>Import Data</button>
        </div>
      </header>

      <nav style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <button className={activeTab === 'family' ? 'active' : ''} onClick={() => setActiveTab('family')}>Family</button>
        <button className={activeTab === 'assets' ? 'active' : ''} onClick={() => setActiveTab('assets')}>Assets</button>
        <button className={activeTab === 'income' ? 'active' : ''} onClick={() => setActiveTab('income')}>Income & Expenses</button>
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={activeTab === 'logic' ? 'active' : ''} onClick={() => setActiveTab('logic')}>Logic</button>
      </nav>

      <main className="app-content">
        {showImport && <DataImport onImport={handleImport} onClose={() => setShowImport(false)} />}

        {activeTab === 'family' && <FamilyForm members={members} setMembers={setMembers} doJointTaxes={doJointTaxes} setDoJointTaxes={setDoJointTaxes} />}
        {activeTab === 'assets' && <AssetsForm assets={assets} setAssets={setAssets} members={members} />}
        {activeTab === 'income' && (
          <div>
            <div className="form-section">
              <h2>Retirement Goals</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Target Annual Net Income in Retirement (€)</label>
                  <input
                    type="number"
                    value={targetRetirementIncome}
                    onChange={e => setTargetRetirementIncome(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 40000"
                  />
                  <small style={{ color: '#666' }}>If income falls below this, assets (Stocks/Funds) will be sold to top up.</small>
                </div>
              </div>
            </div>
            <IncomeForm incomes={incomes} setIncomes={setIncomes} expenses={expenses} setExpenses={setExpenses} members={members} />
          </div>
        )}
        {activeTab === 'dashboard' && <Dashboard result={simulationResult} members={members} />}
        {activeTab === 'logic' && <LogicTab />}
      </main>
    </div>
  );
}

export default App;
