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
      <div className="row mb-4">
        <div className="col-md-6">
          <label htmlFor="rosterName" className="form-label">Roster Name</label>
          <input
            type="text"
            className="form-control"
            id="rosterName"
            value={rosterName}
            onChange={(e) => setRosterName(e.target.value)}
            placeholder="Roster Name"
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

      <div className="d-flex gap-2 justify-content-end mt-4 mb-4">
        <button className="btn btn-primary" onClick={handleUpdate}>
          Save Changes
        </button>
        <button className="btn btn-danger" onClick={handleDelete}>
          Delete Roster
        </button>
      </div>
    </div>
  );
}

export default RosterDetails;