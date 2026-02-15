
import React from 'react';
import type { FamilyMember } from '../types';

interface Props {
    members: FamilyMember[];
    setMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
}

export const FamilyForm: React.FC<Props> = ({ members, setMembers }) => {
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
            <h2>Family Members</h2>
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
                        <div className="form-group">
                            <label>Retirement Age</label>
                            <input
                                type="number"
                                value={member.retirementAge || 67}
                                onChange={e => updateMember(member.id, 'retirementAge', parseInt(e.target.value) || 65)}
                            />
                        </div>
                    )}
                    <button className="danger" onClick={() => removeMember(member.id)}>X</button>
                </div>
            ))}
            <button className="primary" onClick={addMember}>Add Member</button>
        </div>
    );
};
