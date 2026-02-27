
import React from 'react';
import type { FamilyMember } from '../types';

interface Props {
    members: FamilyMember[];
    setMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
    doJointTaxes: boolean;
    setDoJointTaxes: React.Dispatch<React.SetStateAction<boolean>>;
}

export const FamilyForm: React.FC<Props> = ({ members, setMembers, doJointTaxes, setDoJointTaxes }) => {
    const addMember = () => {
        const newId = (Math.max(...members.map(m => parseInt(m.id)), 0) + 1).toString();
        setMembers([...members, { id: newId, name: 'New Member', age: 30, isEarner: false }]);
    };

    const updateMember = (id: string, field: keyof FamilyMember, value: any) => {
        setMembers(members.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const removeMember = (id: string) => {
        setMembers(members.filter(m => m.id !== id));
    };

    return (
        <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2>Family Members</h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8f9fa', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                    <input
                        type="checkbox"
                        checked={doJointTaxes}
                        onChange={e => setDoJointTaxes(e.target.checked)}
                    />
                    <strong>File Taxes Jointly (Declaración Conjunta)</strong>
                </label>
            </div>
            {members.map(member => (
                <div key={member.id} className="form-row">
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            value={member.name}
                            onChange={e => updateMember(member.id, 'name', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Age</label>
                        <input
                            type="number"
                            value={member.age}
                            onChange={e => updateMember(member.id, 'age', parseInt(e.target.value) || 0)}
                        />
                    </div>
                    <div className="form-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={member.isEarner}
                                onChange={e => updateMember(member.id, 'isEarner', e.target.checked)}
                            />
                            Earner / Owner
                        </label>
                    </div>
                    {(member.isEarner) && (
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid #ccc', paddingLeft: '10px' }}>
                            <label>Retirement Age</label>
                            <input
                                type="number"
                                value={member.retirementAge || 67}
                                onChange={e => updateMember(member.id, 'retirementAge', parseInt(e.target.value) || 65)}
                            />

                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                                <input
                                    type="checkbox"
                                    checked={member.hasBis56Exemption || false}
                                    onChange={e => updateMember(member.id, 'hasBis56Exemption', e.target.checked)}
                                />
                                Apply Art. 56 Bis (Impatriate)
                            </label>

                            {member.hasBis56Exemption && (
                                <div style={{ marginTop: '5px' }}>
                                    <label style={{ fontSize: '0.9rem' }}>Years of Exemption Left:</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="6"
                                        style={{ width: '60px', marginLeft: '10px' }}
                                        value={member.bis56ExemptionYearsRemaining || 6}
                                        onChange={e => updateMember(member.id, 'bis56ExemptionYearsRemaining', parseInt(e.target.value) || 0)}
                                    />
                                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                        Exempts 30% of salary and foreign assets from Wealth Tax.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <button className="danger" onClick={() => removeMember(member.id)}>X</button>
                </div>
            ))}
            <button className="primary" onClick={addMember}>Add Member</button>
        </div>
    );
};
