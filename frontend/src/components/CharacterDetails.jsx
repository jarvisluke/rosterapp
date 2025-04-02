import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ItemIcon from './ItemIcon';

// Helper function to format timestamp
const formatLastKillTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";

  const now = new Date();
  const killDate = new Date(timestamp);
  const diffInMs = now - killDate;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

  if (diffInDays > 7) {
    // Format as mm/dd/yy if more than a week ago
    return `${(killDate.getMonth() + 1).toString().padStart(2, '0')}/${killDate.getDate().toString().padStart(2, '0')}/${killDate.getFullYear().toString().slice(2)}`;
  } else if (diffInDays > 0) {
    // Format as "X days ago"
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else {
    // Format as "X hours ago"
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
};

// Tooltip Component
const RaidBossTooltip = ({ encounters }) => {
  if (!encounters || encounters.length === 0) return null;

  return (
    <div className="tooltip-content position-absolute bg-dark text-white p-3 rounded shadow-lg"
      style={{ right: '100%', marginRight: '15px', width: '280px', zIndex: 1000 }}>
      {encounters.map((encounter) => (
        <div key={encounter.encounter.id} >
          <div className="fw-bold">{encounter.encounter.name}</div>
          <div className="small">Kills: {encounter.completed_count}</div>
          <div className="small">Last kill: {formatLastKillTimestamp(encounter.last_kill_timestamp)}</div>
        </div>
      ))}
    </div>
  );
};

// Circular Progress Bar Component for Raid Progress
const RaidProgressCircle = ({ completed, total, difficulty, raidName, encounters }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const percentage = Math.round((completed / total) * 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on difficulty
  const getColorByDifficulty = (diff) => {
    switch (diff) {
      case 'Mythic': return '#a335ee'; // Purple for Mythic
      case 'Heroic': return '#0070dd'; // Blue for Heroic
      case 'Normal': return '#1eff00'; // Green for Normal
      default: return '#666666';
    }
  };

  const difficultyColor = getColorByDifficulty(difficulty);

  return (
    <div className="d-flex flex-column align-items-center position-relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}>
      <div className="position-relative" style={{ width: '96px', height: '96px', cursor: 'pointer' }}>
        {/* Background circle */}
        <svg width="96" height="96" className="position-absolute">
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke="#e5e5e5"
            strokeWidth="8"
          />
        </svg>

        {/* Progress circle */}
        <svg width="96" height="96" className="position-absolute" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke={difficultyColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Text in center */}
        <div className="position-absolute d-flex flex-column justify-content-center align-items-center"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="fw-bold">{completed}/{total}</div>
          <div className="small">{difficulty}</div>
        </div>
      </div>
      <div className="text-center small mt-1">{raidName}</div>

      {/* Tooltip (appears on hover) */}
      {showTooltip && encounters && encounters.length > 0 && <RaidBossTooltip encounters={encounters} />}
    </div>
  );
};

function CharacterDetails() {
  const [characterData, setCharacterData] = useState(null);
  const { realm, character } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCharacterData = async () => {
      try {
        // Fetch character data
        const characterResponse = await axios.get(`/api/character/${realm}/${character}`, {
          signal: AbortSignal.timeout(5000)
        });

        const charData = characterResponse.data;

        // Collect all media URLs and check local storage
        const mediaUrlsToFetch = [];
        const cachedMedia = {};

        // Function to check localStorage and collect URLs to fetch
        const processMediaUrl = (mediaUrl) => {
          const cachedItem = localStorage.getItem(mediaUrl);
          if (cachedItem) {
            cachedMedia[mediaUrl] = JSON.parse(cachedItem);
          } else {
            mediaUrlsToFetch.push(mediaUrl);
          }
        };

        // Process equipment media URLs
        if (charData.equipment?.equipped_items) {
          charData.equipment.equipped_items.forEach(item => {
            if (item.media?.key?.href) {
              processMediaUrl(item.media.key.href);
            }
            // Process socket media URLs
            if (item.sockets) {
              item.sockets.forEach(socket => {
                if (socket.media?.key?.href) {
                  processMediaUrl(socket.media.key.href);
                }
              });
            }
          });
        }

        let fetchedMedia = {};
        if (mediaUrlsToFetch.length > 0) {
          try {
            // Fetch only the media that isn't in localStorage
            const mediaResponse = await axios.post('/api/item/media', mediaUrlsToFetch, {
              signal: AbortSignal.timeout(5000)
            });
            fetchedMedia = mediaResponse.data;

            // Cache the newly fetched media
            Object.entries(fetchedMedia).forEach(([url, data]) => {
              localStorage.setItem(url, JSON.stringify(data));
            });
          } catch (mediaError) {
            console.error("Error fetching media data:", mediaError);
          }
        }

        // Combine cached and fetched media
        const allMedia = { ...cachedMedia, ...fetchedMedia };

        // Merge media data with character data
        const mergedData = {
          ...charData,
          equipment: {
            ...charData.equipment,
            equipped_items: charData.equipment.equipped_items.map(item => {
              // Add assets to item media
              if (item.media?.key?.href && allMedia[item.media.key.href]) {
                item.media.assets = allMedia[item.media.key.href].assets;
              }

              // Add assets to socket media
              if (item.sockets) {
                item.sockets = item.sockets.map(socket => {
                  if (socket.media?.key?.href && allMedia[socket.media.key.href]) {
                    socket.media.assets = allMedia[socket.media.key.href].assets;
                  }
                  return socket;
                });
              }

              return item;
            })
          }
        };

        setCharacterData(mergedData);
      } catch (charError) {
        setError(charError);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacterData();
  }, [realm, character]);

  const avgItemLevel = (() => {
    if (!characterData?.equipment?.equipped_items) return 0;

    const validItems = characterData.equipment.equipped_items.filter(
      item => (['SHIRT', 'TABARD'].indexOf(item.slot.type) === -1) && item.level
    );

    if (!validItems.length) return 0;

    const totalLevel = validItems.reduce((sum, item) => sum + item.level.value, 0);
    return Math.round(totalLevel / validItems.length * 100) / 100;
  })();

  if (loading) return (
    <div className="container d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
      <div className="spinner-border"></div>
    </div>
  );

  if (error) return (
    <div className="container">
      <div className="alert alert-warning">
        Could not retrieve character data. This character either does not exist or was transferred recently.
      </div>
    </div>
  );

  return (
    <div className="container">
      {/* Character Profile Card */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between">
            {/* Left section: Character image and basic info */}
            <div className="d-flex align-items-center">
              {/* Character Image - Vertically centered */}
              <div className="me-4">
                {characterData.character_media?.assets?.map(asset =>
                  asset.key === 'avatar' && (
                    <img
                      key={asset.value}
                      src={asset.value}
                      alt="Character avatar"
                      style={{ width: '120px', height: 'auto', borderRadius: '8px' }}
                    />
                  )
                )}
              </div>

              {/* Character Info - Positioned directly next to image */}
              <div>
                {/* Name slightly smaller but still larger than other text */}
                <h2 className="mb-2">
                  {characterData.character.name}
                  <small className="text-secondary ms-2">-{characterData.character.realm.name}</small>
                </h2>

                <div className="mb-3">
                  {characterData.character.guild && (
                    <div className="mb-2">
                      <Link
                        to={`/guild/${characterData.character.guild.realm.slug}/${characterData.character.guild.name}`}
                        className="text-dark text-decoration-none hover-underline"
                      >
                        &lt;{characterData.character.guild.name}&gt;-{characterData.character.guild.realm.name}
                      </Link>
                    </div>
                  )}

                  {avgItemLevel > 0 && (
                    <div className="mb-2">
                      <strong>Average Item Level:</strong> {avgItemLevel}
                    </div>
                  )}

                  {/* Mythic+ Score */}
                  {characterData.mythic_keystone_profile?.current_mythic_rating && (
                    <div className="mb-2">
                      <strong>Mythic+ Score:</strong>{' '}
                      <span style={{
                        color: `rgb(${characterData.mythic_keystone_profile.current_mythic_rating.color.r}, ${characterData.mythic_keystone_profile.current_mythic_rating.color.g}, ${characterData.mythic_keystone_profile.current_mythic_rating.color.b})`
                      }}>
                        {characterData.mythic_keystone_profile.current_mythic_rating.rating.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right section: Raid progress circle */}
            {characterData.current_raid && characterData.current_raid.modes.length > 0 && (
              <div className="ms-4">
                {(() => {
                  const highestMode = characterData.current_raid.modes[characterData.current_raid.modes.length - 1];
                  return (
                    <RaidProgressCircle
                      completed={highestMode.progress.completed_count}
                      total={highestMode.progress.total_count}
                      difficulty={highestMode.difficulty.name}
                      raidName={characterData.current_raid.instance.name}
                      encounters={highestMode.progress.encounters}
                    />
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Equipment */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-white">
          <h3 className="mb-0">Equipment</h3>
        </div>
        <div className="card-body">
          {characterData.equipment?.equipped_items ? (
            <div className="row">
              {/* First column - first 8 items */}
              <div className="col-lg-6">
                {characterData.equipment.equipped_items.slice(0, 8).map(item => (
                  <div key={item.slot.name} className="d-flex align-items-center p-2 border-bottom">
                    <ItemIcon item={item} size={32} />
                    <div className="ms-3">
                      <strong>{item.slot.name}:</strong> {item.name}
                      {item.level && ` (${item.level.value})`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Second column - remaining items */}
              {characterData.equipment.equipped_items.length > 8 && (
                <div className="col-lg-6">
                  {characterData.equipment.equipped_items.slice(8).map(item => (
                    <div key={item.slot.name} className="d-flex align-items-center p-2 border-bottom">
                      <ItemIcon item={item} size={32} />
                      <div className="ms-3">
                        <strong>{item.slot.name}:</strong> {item.name}
                        {item.level && ` (${item.level.value})`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="alert alert-info">No equipment information available.</div>
          )}
        </div>
      </div>

      {/* External Links */}
      <div className="mb-4">
        <a
          href={`https://worldofwarcraft.blizzard.com/en-us/character/us/${characterData.character.realm.slug}/${characterData.character.name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="me-3 text-decoration-none"
        >
          Armory
        </a>
        <a
          href={`https://www.warcraftlogs.com/character/us/${characterData.character.realm.slug}/${characterData.character.name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="me-3 text-decoration-none"
        >
          WarcraftLogs
        </a>
        <a
          href={`https://www.raider.io/characters/us/${characterData.character.realm.slug}/${characterData.character.name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-decoration-none"
        >
          Raider.IO
        </a>
      </div>

      {/* Navigation Buttons */}
      <div className="d-grid gap-2 d-md-flex justify-content-md-start">
        <Link to="/account/profile" className="btn btn-secondary me-md-2">
          Back to Characters
        </Link>
        <Link to="/account" className="btn btn-primary">
          Back to Account
        </Link>
      </div>
    </div>
  );
}

export default CharacterDetails;