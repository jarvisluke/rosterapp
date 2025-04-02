import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import PlayableClassIcon from '../PlayableClassIcon';
import { getClassColor } from '../../util';

const getRoleColor = (role) => {
  switch (role) {
    case 'TANK': return '#3498db';  // blue
    case 'HEALER': return '#2ecc71'; // green
    case 'DAMAGE': return '#e74c3c'; // red
    default: return '#777';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'ACTIVE': return '#2ecc71';  // green
    case 'BENCH': return '#95a5a6';   // gray
    case 'AVAILABLE': return '#f1c40f'; // yellow
    default: return '#777';
  }
};

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
        <select
          className="form-select form-select-sm"
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          style={{ color: getRoleColor(role) }}
        >
          <option value="">Select Role</option>
          <option value="TANK">Tank</option>
          <option value="HEALER">Healer</option>
          <option value="DAMAGE">Damage</option>
        </select>
      </td>
      <td className="status-column">
        <select
          className="form-select form-select-sm"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          style={{ color: getStatusColor(status) }}
        >
          <option value="ACTIVE">Active</option>
          <option value="BENCH">Bench</option>
          <option value="AVAILABLE">Available</option>
        </select>
      </td>
    </tr>
  );
});

export default RosterCharacter;