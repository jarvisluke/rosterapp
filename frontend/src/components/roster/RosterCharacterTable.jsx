import React, { useRef } from 'react';
import RosterCharacter from './RosterCharacter';
import CharacterFilterSet from '../filters/CharacterFilterSet';

function RosterCharacterTable({
    data,
    initialTableHeight = 800,
    filters,
    onRoleChange,
    onStatusChange,
    showAvailable = false // new prop to determine which characters to show
}) {
    const containerRef = useRef(null);

    // Sort function
    const sortedData = [...data].sort((a, b) => {
        // First by level (descending)
        if (b.level !== a.level) return b.level - a.level;
        
        // Then by role priority
        const rolePriority = { 'TANK': 0, 'HEALER': 1, 'DAMAGE': 2, '': 3 };
        if (rolePriority[a.role] !== rolePriority[b.role]) {
            return rolePriority[a.role] - rolePriority[b.role];
        }
        
        // Finally by name
        return a.name.localeCompare(b.name);
    });

    // Filter based on status
    const filteredData = showAvailable
        ? sortedData.filter(char => char.status === 'AVAILABLE')
        : sortedData.filter(char => char.status === 'ACTIVE' || char.status === 'BENCH');

    return (
        <div>
            {filters && <CharacterFilterSet filters={filters} />}
            <div
                ref={containerRef}
                style={{
                    height: initialTableHeight,
                    overflow: 'auto',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '4px'
                }}
            >
                <table className="table table-borderless table-fixed mb-0">
                    {/* ... (keep the colgroup) */}
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr className='bg-dark'>
                            <th className="class-column">Class</th>
                            <th className="name-column">Name</th>
                            <th className="level-column">Level</th>
                            <th className="race-column">Race</th>
                            <th className="role-column">Role</th>
                            <th className="status-column">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(character => (
                            <RosterCharacter
                                key={character.id}
                                character={character}
                                role={character.role}
                                status={character.status}
                                onRoleChange={(role) => onRoleChange(character.id, role)}
                                onStatusChange={(status) => onStatusChange(character.id, status)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default RosterCharacterTable;