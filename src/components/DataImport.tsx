import React, { useState } from 'react';
import { parseCSV, parseImage, processImportDataFromText, parseJSON, type ParsedData } from '../utils/importUtils';

interface Props {
    onImport: (data: ParsedData) => void;
    onClose: () => void;
}

export const DataImport: React.FC<Props> = ({ onImport, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setParsedData(null);
            setError(null);
        }
    };

    const handleParse = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        try {
            let data: ParsedData = { assets: [], incomes: [], expenses: [] };

            if (file.name.endsWith('.json') || file.type === 'application/json') {
                const appData = await parseJSON(file);
                data.fullState = appData;
                setParsedData(data);
                setLoading(false);
                return;
            } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                data = await parseCSV(file);
                setParsedData(data);
                setLoading(false);
                return;
            } else if (file.type.startsWith('image/')) {
                // OCR Parsing
                const text = await parseImage(file);
                data = processImportDataFromText(text);
                setParsedData(data);
            } else {
                setError("Unsupported file type. Use JSON, CSV, or Image.");
            }
        } catch (err: any) {
            setError(err.message || "Unknown error during parsing");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (parsedData) {
            onImport(parsedData);
            onClose();
        }
    };

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8," +
            "Category,Type,Name,Amount\n" +
            "Asset,stock,Tesla Stock,50000\n" +
            "Income,salary,Google Salary,60000\n" +
            "Expense,tax,Property Tax,1000";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "retirement_import_template.csv");
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="modal-content" style={{
                background: 'white', padding: '20px', borderRadius: '8px', width: '600px', maxHeight: '80vh', overflowY: 'auto'
            }}>
                <h2>Import Data</h2>
                <div style={{ marginBottom: '15px' }}>
                    <p>Upload a <strong>JSON Backup</strong> to restore details, or a CSV/Image to append data.</p>
                    <button onClick={downloadTemplate} style={{ fontSize: '0.8rem', padding: '4px 8px' }}>Download CSV Template</button>
                </div>

                <input type="file" accept=".json, .csv, image/*" onChange={handleFileChange} />

                <div style={{ marginTop: '10px' }}>
                    <button className="primary" onClick={handleParse} disabled={!file || loading}>
                        {loading ? 'Analyzing...' : 'Analyze File'}
                    </button>
                    &nbsp;
                    <button className="danger" onClick={onClose}>Cancel</button>
                </div>

                {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}

                {parsedData && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                        <h3>Preview</h3>
                        {parsedData.fullState ? (
                            <div style={{ background: '#eef', padding: '10px', borderRadius: '5px' }}>
                                <strong style={{ color: 'darkblue' }}>Full System Restore Found</strong>
                                <p>Backup Date: {new Date(parsedData.fullState.timestamp).toLocaleString()}</p>
                                <p>Contains: {parsedData.fullState.members.length} Members, {parsedData.fullState.assets.length} Assets, {parsedData.fullState.incomes.length} Incomes.</p>
                                <p style={{ color: 'red', fontWeight: 'bold' }}>WARNING: Confirming will REPLACE all current data.</p>
                            </div>
                        ) : (
                            <p>Found: {parsedData.assets.length} Assets, {parsedData.incomes.length} Incomes, {parsedData.expenses.length} Expenses.</p>
                        )}

                        {!parsedData.fullState && parsedData.assets.length > 0 && (
                            <div>
                                <h4>Assets</h4>
                                <ul>{parsedData.assets.map((a, i) => <li key={i}>{a.name}: {a.value}€ ({a.type})</li>)}</ul>
                            </div>
                        )}
                        {!parsedData.fullState && parsedData.incomes.length > 0 && (
                            <div>
                                <h4>Incomes</h4>
                                <ul>{parsedData.incomes.map((a, i) => <li key={i}>{a.name}: {a.amount}€ ({a.type})</li>)}</ul>
                            </div>
                        )}

                        <div style={{ marginTop: '20px' }}>
                            <button className="primary" onClick={handleConfirm}>
                                {parsedData.fullState ? 'Restore Backup' : 'Confirm Import'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
