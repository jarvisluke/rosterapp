const CharacterDisplay = ({ character }) => {
    return character ? (
        <div className="card mt-3 mb-3">
            <div className="card-body">
                <h5 className="card-title">
                    {character.name}
                    {character.realm?.displayName &&
                        <span className="text-muted">-{character.realm.displayName}</span>}
                </h5>
                <p className="card-text">
                    Level {character.level}{' '}
                    {character.race.name.charAt(0).toUpperCase() +
                        character.race.name.slice(1)}{' '}
                    {character.character_class.name}
                    {character.spec && ` (${character.spec.charAt(0).toUpperCase() +
                        character.spec.slice(1)
                        })`}
                </p>
            </div>
        </div>
    ) : null;
};

export default CharacterDisplay