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

      <div>
        <h2>Active & Bench</h2>
        <RosterCharacterTable
          data={characters}
          onRoleChange={handleRoleChange}
          onStatusChange={handleStatusChange}
          showAvailable={false}
        />

        <h2 className="mt-4">Available Characters</h2>
        <RosterCharacterTable
          data={characters}
          onRoleChange={handleRoleChange}
          onStatusChange={handleStatusChange}
          showAvailable={true}
        />
      </div>
    </div>
  );
}

export default CreateRoster;