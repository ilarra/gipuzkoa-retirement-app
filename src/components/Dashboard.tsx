
import React from 'react';
import type { SimulationResult } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

interface Props {
    result: SimulationResult;
}

export const Dashboard: React.FC<Props> = ({ result }) => {
    const data = result.years;

    // Format large numbers
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
            notation: 'compact'
        }).format(value).replace('mil', 'k');
    };

    return (
        <div>
            <h2>Dashboard</h2>

            <div className="dashboard-grid">
                <div className="chart-container">
                    <h3>Net Worth Projection</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={formatCurrency} />
                            <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                            <Legend />
                            {/* Dynamically generate areas for each asset */}
                            {Array.from(new Set(data.flatMap(d => Object.keys(d.assetValues || {})))).map((assetName, index) => {
                                const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
                                return (
                                    <Area
                                        key={assetName}
                                        type="monotone"
                                        dataKey={`assetValues.${assetName}`}
                                        stackId="1"
                                        stroke={colors[index % colors.length]}
                                        fill={colors[index % colors.length]}
                                        name={assetName}
                                    />
                                );
                            })}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-container">
                    <h3>Cash Flow (Income vs Expenses)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={formatCurrency} />
                            <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                            <Legend />
                            <Line type="monotone" dataKey="totalIncome" stroke="#82ca9d" name="Realized Income (Cash)" />
                            <Line type="monotone" dataKey="totalExpenses" stroke="#ff7300" name="Expenses" />
                            <Line type="monotone" dataKey="cashFlow" stroke="#000000" strokeDasharray="5 5" name="Net Cash Flow" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-container">
                    <h3>Asset Drawdown / Stock Sales</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={formatCurrency} />
                            <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                            <Legend />
                            <Bar dataKey="withdrawalForTargetIncome" fill="#ff4d4f" name="Stock/Fund Sold" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-container">
                    <h3>Tax Breakdown (Fiscal Load)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={formatCurrency} />
                            <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                            <Legend />
                            <Area type="monotone" dataKey="taxes.wealthTax" stackId="1" stroke="#8884d8" fill="#8884d8" name="Wealth Tax (IP)" />
                            <Area type="monotone" dataKey="taxes.irpfGeneral" stackId="1" stroke="#d32f2f" fill="#ef5350" name="IRPF (General)" />
                            <Area type="monotone" dataKey="taxes.irpfSavings" stackId="1" stroke="#f57f17" fill="#ffb74d" name="IRPF (Savings)" />
                            <Area type="monotone" dataKey="taxes.escudoFiscalAdjustment" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Shield Adjustment" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ marginTop: '20px' }}>
                <h3>Details Table</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                                <th style={{ padding: '8px' }}>Year</th>
                                <th style={{ padding: '8px' }}>Age</th>
                                <th style={{ padding: '8px' }}>Net Worth</th>
                                <th style={{ padding: '8px' }}>Cash Income</th>
                                <th style={{ padding: '8px' }}>Expenses</th>
                                <th style={{ padding: '8px' }}>Stock Sold</th>
                                <th style={{ padding: '8px' }}>IRPF (Gen)</th>
                                <th style={{ padding: '8px' }}>IRPF (Sav)</th>
                                <th style={{ padding: '8px' }}>Wealth Tax</th>
                                <th style={{ padding: '8px' }}>Cash Flow</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(row => (
                                <tr key={row.year} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '8px' }}>{row.year}</td>
                                    <td style={{ padding: '8px' }}>{row.age}</td>
                                    <td style={{ padding: '8px' }}>{formatCurrency(row.netWorth)}</td>
                                    <td style={{ padding: '8px' }}>{formatCurrency(row.totalIncome)}</td>
                                    <td style={{ padding: '8px' }}>{formatCurrency(row.totalExpenses)}</td>
                                    <td style={{ padding: '8px', color: '#ff4d4f' }}>{formatCurrency(row.withdrawalForTargetIncome)}</td>
                                    <td style={{ padding: '8px' }}>{formatCurrency(row.taxes.irpfGeneral)}</td>
                                    <td style={{ padding: '8px' }}>{formatCurrency(row.taxes.irpfSavings)}</td>
                                    <td style={{ padding: '8px' }}>{formatCurrency(row.taxes.wealthTax)}</td>
                                    <td style={{ padding: '8px', color: row.cashFlow < 0 ? 'red' : 'green' }}>{formatCurrency(row.cashFlow)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
