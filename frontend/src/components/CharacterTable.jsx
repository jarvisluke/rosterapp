import React, { useState, useRef, useEffect } from 'react';
import Character from './Character';
import CharacterFilterSet from './filters/CharacterFilterSet';

import './CharacterTable.css'

function CharacterTable({
    data,
    initialTableHeight = 800, // Default height if not provided
    rowHeight = 48,
    headerHeight = 42,
    filters
}) {
    const [tableHeight, setTableHeight] = useState(initialTableHeight)
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
    const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
    const containerRef = useRef(null);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'desc' ? ' ▲' : ' ▼';
        }
        return '';
    };

    useEffect(() => {
        const updateVisibleRange = () => {
            if (!containerRef.current) return;

            const scrollTop = containerRef.current.scrollTop;
            const viewportHeight = containerRef.current.clientHeight;

            const start = Math.floor(scrollTop / rowHeight);
            const visibleCount = Math.ceil(viewportHeight / rowHeight);
            const buffer = Math.floor(visibleCount / 2);

            setVisibleRange({
                start: Math.max(0, start - buffer),
                end: Math.min(data.length, start + visibleCount + buffer)
            });
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', updateVisibleRange);
            updateVisibleRange();
        }

        return () => {
            if (container) {
                container.removeEventListener('scroll', updateVisibleRange);
            }
        };
    }, [data.length, rowHeight]);

    const getSortedData = () => {
        return [...data].sort((a, b) => {
            let aValue, bValue;

            switch (sortConfig.key) {
                case 'name':
                    aValue = a.character.name.toLowerCase();
                    bValue = b.character.name.toLowerCase();
                    break;
                case 'rank':
                    aValue = a.rank;
                    bValue = b.rank;
                    break;
                case 'level':
                    aValue = a.character.level;
                    bValue = b.character.level;
                    break;
                case 'class':
                    aValue = a.character.playable_class.name;
                    bValue = b.character.playable_class.name;
                    break;
                case 'race':
                    aValue = a.character.playable_race.name;
                    bValue = b.character.playable_race.name;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const sortedData = getSortedData();
    const totalHeight = sortedData.length * rowHeight;
    const paddingTop = visibleRange.start * rowHeight;

    return (
        <div>
            {filters && <CharacterFilterSet filters={filters} />}
            <div
                ref={containerRef}
                style={{
                    height: tableHeight,
                    overflow: 'auto',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '4px'
                }}
            >
                <table className="table table-borderless table-fixed mb-0">
                    <colgroup>
                        <col style={{ width: '72px' }} />
                        <col style={{ width: '72px' }} />
                        <col />
                        <col style={{ width: '72px' }} />
                        <col style={{ width: '120px' }} />
                    </colgroup>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr className='bg-dark'>
                            <th className="rank-column" onClick={() => handleSort('rank')} style={{ cursor: 'pointer', height: headerHeight }}>
                                Rank{getSortIndicator('rank')}
                            </th>
                            <th className="class-column" onClick={() => handleSort('class')} style={{ cursor: 'pointer' }}>
                                Class{getSortIndicator('class')}
                            </th>
                            <th className="name-column" onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                                Name{getSortIndicator('name')}
                            </th>
                            <th className="level-column" onClick={() => handleSort('level')} style={{ cursor: 'pointer' }}>
                                Level{getSortIndicator('level')}
                            </th>
                            <th className="race-column" onClick={() => handleSort('race')} style={{ cursor: 'pointer' }}>
                                Race{getSortIndicator('race')}
                            </th>
                        </tr>
                    </thead>
                    <tbody style={{ position: 'relative' }}>
                        <tr style={{ height: paddingTop }} />
                        {sortedData.slice(visibleRange.start, visibleRange.end).map(member => (
                            <Character
                                key={member.character.id}
                                character={member.character}
                                rank={member.rank}
                            />
                        ))}
                        <tr style={{ height: totalHeight - (visibleRange.end * rowHeight) }} />
                    </tbody>
                </table>
            </div>
            <div className="d-flex align-items-center mt-3">
                <select
                    className="form-select"
                    style={{ width: 'auto' }}
                    value={tableHeight}
                    onChange={(e) => setTableHeight(Number(e.target.value))}
                >
                    <option value={500}>Small</option>
                    <option value={800}>Medium</option>
                    <option value={1300}>Large</option>
                </select>
            </div>
        </div>
    );
}

export default CharacterTable;