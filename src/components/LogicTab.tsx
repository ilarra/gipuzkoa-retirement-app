import React from 'react';
import {
    IRPF_GENERAL_BRACKETS_2024,
    IRPF_SAVINGS_BRACKETS_2024,
    WEALTH_TAX_BRACKETS_2024,
    WEALTH_TAX_EXEMPT_MIN,
    MAIN_HOME_EXEMPT_MAX
} from '../utils/taxCalculations';

export const LogicTab: React.FC = () => {
    return (
        <div className="form-section login-tab">
            <h2>Fiscal Information & Logic</h2>
            <p>This tab displays the underlying fiscal parameters used in the application's calculations for the year 2024.</p>

            <div className="fiscal-card">
                <h3>Exemptions Summary</h3>
                <table className="fiscal-table">
                    <tbody>
                        <tr>
                            <td><strong>Wealth Tax General Exemption (Minimum)</strong></td>
                            <td>€{WEALTH_TAX_EXEMPT_MIN.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td><strong>Main Home Exemption (Maximum)</strong></td>
                            <td>€{MAIN_HOME_EXEMPT_MAX.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="fiscal-card">
                <h3>IRPF General Tax Brackets (2024)</h3>
                <table className="fiscal-table">
                    <thead>
                        <tr>
                            <th>Up to (Limit)</th>
                            <th>Tax Rate (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {IRPF_GENERAL_BRACKETS_2024.map((bracket, index) => (
                            <tr key={index}>
                                <td>{bracket.limit === Infinity ? 'Infinity' : `€${bracket.limit.toLocaleString()}`}</td>
                                <td>{(bracket.rate * 100).toFixed(2)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="fiscal-card">
                <h3>IRPF Savings Tax Brackets (2024)</h3>
                <table className="fiscal-table">
                    <thead>
                        <tr>
                            <th>Up to (Limit)</th>
                            <th>Tax Rate (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {IRPF_SAVINGS_BRACKETS_2024.map((bracket, index) => (
                            <tr key={index}>
                                <td>{bracket.limit === Infinity ? 'Infinity' : `€${bracket.limit.toLocaleString()}`}</td>
                                <td>{(bracket.rate * 100).toFixed(2)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="fiscal-card">
                <h3>Wealth Tax Brackets (2024)</h3>
                <table className="fiscal-table">
                    <thead>
                        <tr>
                            <th>Up to (Limit)</th>
                            <th>Tax Rate (%)</th>
                            <th>Base Tax at Start of Bracket</th>
                        </tr>
                    </thead>
                    <tbody>
                        {WEALTH_TAX_BRACKETS_2024.map((bracket, index) => (
                            <tr key={index}>
                                <td>{bracket.limit === Infinity ? 'Infinity' : `€${bracket.limit.toLocaleString()}`}</td>
                                <td>{(bracket.rate * 100).toFixed(3)}%</td>
                                <td>€{bracket.baseTax.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style>{`
        .login-tab {
          max-width: 900px;
          margin: 0 auto;
        }
        .fiscal-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          border: 1px solid #eee;
        }
        .fiscal-card h3 {
          margin-top: 0;
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .fiscal-table {
          width: 100%;
          border-collapse: collapse;
        }
        .fiscal-table th, .fiscal-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        .fiscal-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #333;
        }
        .fiscal-table tr:hover {
          background-color: #f1f5f9;
        }
      `}</style>
        </div>
    );
};
