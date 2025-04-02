import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import PlayableClassIcon from './PlayableClassIcon';
import { getClassColor } from '../util';

const Character = memo(({ character, rank }) => {
  return (
    <tr >
      <td className="rank-column">{rank}</td>
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
    </tr>
  );
});

Character.displayName = 'Character';

export default Character;