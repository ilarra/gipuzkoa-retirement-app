
import React from 'react';
import type { Asset, FamilyMember } from '../types';

interface Props {
    assets: Asset[];
    setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
    members: FamilyMember[];
}

export const AssetsForm: React.FC<Props> = ({ assets, setAssets, members }) => {
    const addAsset = () => {
        const newId = (Math.max(...assets.map(a => parseInt(a.id)), 0) + 1).toString();
        setAssets([...assets, {
            id: newId,
            name: 'New Asset',
            type: 'stock',
            value: 0,
            owners: [members[0]?.id || ''],
            purchaseValue: 0,
            isMainResidence: false,
            growthRate: 0.05
        }]);
    };

    const updateAsset = (id: string, field: keyof Asset, value: any) => {
        setAssets(assets.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const removeAsset = (id: string) => {
        setAssets(assets.filter(a => a.id !== id));
    };

    const toggleOwner = (assetId: string, memberId: string) => {
        const asset = assets.find(a => a.id === assetId);
        if (!asset) return;

        const currentOwners = asset.owners || [];
        let newOwners: string[];

        if (currentOwners.includes(memberId)) {
            // Don't allow removing the last owner? Or allow empty? Allow empty for now but ideally should warn.
            newOwners = currentOwners.filter(id => id !== memberId);
        } else {
            newOwners = [...currentOwners, memberId];
        }

        updateAsset(assetId, 'owners', newOwners);
    };

    return (
        <div className="form-section">
            <h2>Assets (Real Estate, Stocks, Savings)</h2>
            {assets.map(asset => (
                <div key={asset.id} className="form-row" style={{ flexWrap: 'wrap' }}>
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            value={asset.name}
                            onChange={e => updateAsset(asset.id, 'name', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Type</label>
                        <select
                            value={asset.type}
                            onChange={e => updateAsset(asset.id, 'type', e.target.value)}
                        >
                            <option value="real_estate">Real Estate</option>
                            <option value="stock">Stock/Shares</option>
                            <option value="fund">Investment Fund</option>
                            <option value="pension_plan">Pension Plan (EPSV)</option>
                            <option value="cash">Cash</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Value (€)</label>
                        <input
                            type="number"
                            value={asset.value}
                            onChange={e => updateAsset(asset.id, 'value', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Growth Rate (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={Math.round((asset.growthRate !== undefined ? asset.growthRate : (asset.type === 'stock' || asset.type === 'fund' ? 0.05 : 0.02)) * 100 * 10) / 10}
                            onChange={e => updateAsset(asset.id, 'growthRate', (parseFloat(e.target.value) || 0) / 100)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Owners</label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {members.map(m => (
                                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={asset.owners?.includes(m.id)}
                                        onChange={() => toggleOwner(asset.id, m.id)}
                                    />
                                    {m.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <button className="danger" onClick={() => removeAsset(asset.id)}>X</button>

                    {asset.type === 'real_estate' && (
                        <div className="form-group" style={{ width: '100%', marginTop: '5px' }}>
                            <label>Valor Catastral (Optional - for Wealth Tax)</label>
                            <input
                                type="number"
                                placeholder="Leave empty to use Market Value"
                                value={asset.valorCatastral || ''}
                                onChange={e => updateAsset(asset.id, 'valorCatastral', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    )}
                    {asset.type === 'real_estate' && (
                        <div className="form-group" style={{ width: '100%', marginTop: '5px' }}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={asset.isMainResidence}
                                    onChange={e => updateAsset(asset.id, 'isMainResidence', e.target.checked)}
                                />
                                Is Main Residence (Exempt up to 300k)
                            </label>
                        </div>
                    )}
                    <div className="form-group" style={{ width: '100%', marginTop: '5px' }}>
                        <label>
                            <input
                                type="checkbox"
                                checked={asset.isForeignAsset || false}
                                onChange={e => updateAsset(asset.id, 'isForeignAsset', e.target.checked)}
                            />
                            Asset strictly located outside Spain (Exempt from Wealth Tax under Bis 56 impatriate regime)
                        </label>
                    </div>
                </div>
            ))}
            <button className="primary" onClick={addAsset}>Add Asset</button>
        </div>
    );
};
