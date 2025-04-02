`RosterCharacter.jsx`
```jsx
import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import PlayableClassIcon from '../PlayableClassIcon';
import { getClassColor } from '../../util';

const RosterCharacter = memo(function RosterCharacter({
  character,
  role,
  status,
  onRoleChange,
  onStatusChange,
  isEditing = false
}) {
  return (
    <tr>
      <td className="class-column">
        <PlayableClassIcon
          className={character.playable_class.name}
          media={character.playable_class.media}
        />
      </td>
      <td className="name-column">
        <Link
          to={`/character/${character.realm.slug}/${character.name.toLowerCase()}`}
          className="character text-decoration-none"
          style={{ color: getClassColor(character.playable_class.name) }}
        >
          {character.name}
          <span className="realm text-muted">-{character.realm.short_name}</span>
        </Link>
      </td>
      <td className="level-column">{character.level}</td>
      <td className="race-column">{character.playable_race.name}</td>
      <td className="role-column">
        {isEditing ? (
          <select
            className="form-select form-select-sm"
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
          >
            <option value="">Select Role</option>
            <option value="TANK">Tank</option>
            <option value="HEALER">Healer</option>
            <option value="DAMAGE">Damage</option>
          </select>
        ) : (
          <span className="badge bg-secondary">{role || 'No Role'}</span>
        )}
      </td>
      <td className="status-column">
        {isEditing ? (
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="ACTIVE">Active</option>
            <option value="BENCH">Bench</option>
            <option value="AVAILABLE">Available</option>
          </select>
        ) : (
          <span className={`badge ${
            status === 'ACTIVE' ? 'bg-success' : 
            status === 'BENCH' ? 'bg-warning' : 
            'bg-secondary'
          }`}>
            {status}
          </span>
        )}
      </td>
    </tr>
  );
});

export default RosterCharacter;```

`RosterCharacterTable.jsx`
```jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import RosterCharacter from './RosterCharacter';
import CharacterFilterSet from '../filters/CharacterFilterSet';

function RosterCharacterTable({
    data,
    initialTableHeight = 800,
    rowHeight = 48,
    headerHeight = 42,
    filters,
    isEditing,
    onRoleChange,
    onStatusChange
}) {
    console.log(data)
    const [tableHeight, setTableHeight] = useState(initialTableHeight)
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
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

    const getSortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            let aValue, bValue;

            switch (sortConfig.key) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'level':
                    aValue = a.level;
                    bValue = b.level;
                    break;
                case 'class':
                    aValue = a.playable_class.name;
                    bValue = b.playable_class.name;
                    break;
                case 'race':
                    aValue = a.playable_race.name;
                    bValue = b.playable_race.name;
                    break;
                case 'role':
                    aValue = a.role || '';
                    bValue = b.role || '';
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

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

    const sortedData = getSortedData;
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
                        <col />
                        <col style={{ width: '72px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                    </colgroup>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr className='bg-dark'>
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
                            <th className="role-column" onClick={() => handleSort('role')} style={{ cursor: 'pointer' }}>
                                Role{getSortIndicator('role')}
                            </th>
                            <th className="status-column" onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                                Status{getSortIndicator('status')}
                            </th>
                        </tr>
                    </thead>
                    <tbody style={{ position: 'relative' }}>
                        <tr style={{ height: paddingTop }} />
                        {sortedData.slice(visibleRange.start, visibleRange.end).map(character => (
                            <RosterCharacter
                                key={character.id}
                                character={character}
                                role={character.role}
                                status={character.status}
                                isEditing={isEditing}
                                onRoleChange={(role) => onRoleChange(character.id, role)}
                                onStatusChange={(status) => onStatusChange(character.id, status)}
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

export default RosterCharacterTable;```

`RosterCreate.jsx`
```jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import RosterCharacterTable from "./RosterCharacterTable";

function CreateRoster() {
  const [characters, setCharacters] = useState([]);
  const [rosterName, setRosterName] = useState('');
  const [rosterSize, setRosterSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { realm, guild } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`/api/guild/${realm}/${guild}/roster`)
      .then(response => {
        // Initialize all characters as available
        const initializedCharacters = response.data.characters.map(char => ({
          ...char,
          role: '',
          status: 'AVAILABLE'
        }));
        setCharacters(initializedCharacters);
        setLoading(false);
      })
      .catch(error => {
        setError(error.response?.data?.detail || 'An error occurred');
        setLoading(false);
      });
  }, [realm, guild]);

  const handleRoleChange = useCallback((characterId, role) => {
    setCharacters(prevCharacters => 
      prevCharacters.map(char =>
        char.id === characterId ? { ...char, role } : char
      )
    );
  }, []);

  const handleStatusChange = useCallback((characterId, status) => {
    setCharacters(prevCharacters => 
      prevCharacters.map(char =>
        char.id === characterId ? { ...char, status } : char
      )
    );
  }, []);

  const handleSave = async () => {
    if (!rosterName) {
      setError('Roster name is required');
      return;
    }

    const rosterData = {
      name: rosterName,
      size: rosterSize,
      characters: characters
        .filter(char => char.status !== 'AVAILABLE')
        .map(char => ({
          character_id: char.id,
          role: char.role,
          status: char.status
        }))
    };

    try {
      await axios.post(`/api/guild/${realm}/${guild}/roster`, rosterData);
      navigate(`/guild/${realm}/${guild}/rosters`);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create roster');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Create New Roster</h1>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Roster
        </button>
      </div>

      <div className="row mb-4">
        <div className="col-md-6">
          <label htmlFor="rosterName" className="form-label">Roster Name</label>
          <input
            type="text"
            className="form-control"
            id="rosterName"
            value={rosterName}
            onChange={(e) => setRosterName(e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label htmlFor="rosterSize" className="form-label">Roster Size</label>
          <input
            type="number"
            className="form-control"
            id="rosterSize"
            min="10"
            max="60"
            value={rosterSize}
            onChange={(e) => setRosterSize(parseInt(e.target.value))}
          />
        </div>
      </div>

      <RosterCharacterTable
        data={characters}
        isEditing={true}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

export default CreateRoster;```

`RosterDetails.jsx`
```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import RosterCharacterTable from './RosterCharacterTable';

function RosterDetails() {
  const [roster, setRoster] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [rosterName, setRosterName] = useState('');
  const [rosterSize, setRosterSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const { realm, guild, rosterId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      axios.get(`/api/guild/${realm}/${guild}/${rosterId}`),
      axios.get(`/api/guild/${realm}/${guild}/roster`)
    ])
      .then(([rosterResponse, charactersResponse]) => {
        const rosterData = rosterResponse.data;
        setRoster(rosterData);
        setRosterName(rosterData.name);
        setRosterSize(rosterData.size);

        // Set up all characters with their appropriate status
        const rosterCharacterIds = new Set(rosterData.characters.map(c => c.id));
        const allCharacters = [
          ...rosterData.characters.map(char => ({
            ...char,
            role: char.role || '',
            status: char.status || 'ACTIVE'
          })),
          ...charactersResponse.data.characters
            .filter(c => !rosterCharacterIds.has(c.id))
            .map(char => ({
              ...char,
              role: '',
              status: 'AVAILABLE'
            }))
        ];
        
        setCharacters(allCharacters);
        setLoading(false);
      })
      .catch(error => {
        setError(error.response?.data?.detail || 'An error occurred');
        setLoading(false);
      });
  }, [realm, guild, rosterId]);

  const handleRoleChange = (characterId, role) => {
    setCharacters(chars =>
      chars.map(char =>
        char.id === characterId ? { ...char, role } : char
      )
    );
  };

  const handleStatusChange = (characterId, status) => {
    setCharacters(chars =>
      chars.map(char =>
        char.id === characterId ? { ...char, status } : char
      )
    );
  };

  const handleUpdate = async () => {
    if (!rosterName) {
      setError('Roster name is required');
      return;
    }

    const rosterCharacters = characters.filter(char => 
      char.status === 'ACTIVE' || char.status === 'BENCH'
    );

    const rosterData = {
      name: rosterName,
      size: rosterSize,
      characters: rosterCharacters.map(char => ({
        character_id: char.id,
        role: char.role,
        status: char.status
      }))
    };

    try {
      const response = await axios.put(`/api/guild/${realm}/${guild}/${rosterId}`, rosterData);
      setRoster(response.data);
      setIsEditing(false);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to update roster');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this roster?')) {
      try {
        await axios.delete(`/api/guild/${realm}/${guild}/${rosterId}`);
        navigate(`/guild/${realm}/${guild}/rosters`);
      } catch (error) {
        setError(error.response?.data?.detail || 'Failed to delete roster');
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        {isEditing ? (
          <div className="d-flex gap-3 align-items-center">
            <input
              type="text"
              className="form-control"
              value={rosterName}
              onChange={(e) => setRosterName(e.target.value)}
              placeholder="Roster Name"
            />
            <input
              type="number"
              className="form-control"
              min="10"
              max="60"
              value={rosterSize}
              onChange={(e) => setRosterSize(parseInt(e.target.value))}
              style={{ width: '100px' }}
            />
          </div>
        ) : (
          <h1>{roster.name}</h1>
        )}
        <div className="d-flex gap-2">
          {isEditing ? (
            <>
              <button className="btn btn-primary" onClick={handleUpdate}>Save Changes</button>
              <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </>
          )}
        </div>
      </div>

      <RosterCharacterTable
        data={characters}
        isEditing={isEditing}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

export default RosterDetails;```

