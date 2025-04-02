import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import CharacterTextFilter from './filters/CharacterTextFilter';
import CharacterDropdownFilter from './filters/CharacterDropdownFilter';
import CharacterCheckboxFilter from './filters/CharacterCheckboxFilter';
import CharacterSelectFilter from './filters/CharacterSelectFilter';
import ClassDistributionChart from './ClassDistributionChart';
import CharacterTable from './CharacterTable';

function GuildDetails() {
  const [guildData, setGuildData] = useState(null);
  const [nameFilter, setNameFilter] = useState('');
  const [rankLimit, setRankLimit] = useState('');
  const [maxLevelOnly, setMaxLevelOnly] = useState(true);
  const { realm, guild } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`/api/guild/${realm}/${guild}`)
      .then(response => setGuildData(response.data))
      .catch(error => {
        if (error.response?.status === 401) {
          navigate('/login');
        }
      });
  }, [realm, guild, navigate]);

  // Initialize race filters
  const [raceFilters, setRaceFilters] = useState({
    "Horde": {
      checked: true,
      'Orc': { checked: true },
      'Undead': { checked: true },
      'Tauren': { checked: true },
      'Troll': { checked: true },
      'Blood Elf': { checked: true },
      'Goblin': { checked: true },
      'Mag\'har Orc': { checked: true },
      'Nightborne': { checked: true },
      'Highmountain Tauren': { checked: true },
      'Zandalari Troll': { checked: true },
      'Vulpera': { checked: true },
    },
    "Alliance": {
      checked: true,
      'Human': { checked: true },
      'Dwarf': { checked: true },
      'Night Elf': { checked: true },
      'Gnome': { checked: true },
      'Draenei': { checked: true },
      'Worgen': { checked: true },
      'Void Elf': { checked: true },
      'Lightforged Draenei': { checked: true },
      'Dark Iron Dwarf': { checked: true },
      'Kul Tiran': { checked: true },
      'Mechagnome': { checked: true },
    },
    "Other": {
      checked: true,
      'Pandaren': { checked: true },
      'Dracthyr': { checked: true },
    }
  });

  // Initialize class filters
  const [classFilters, setClassFilters] = useState({
    "Classes": {
      checked: true,
      'Warrior': { checked: true },
      'Paladin': { checked: true },
      'Hunter': { checked: true },
      'Rogue': { checked: true },
      'Priest': { checked: true },
      'Shaman': { checked: true },
      'Mage': { checked: true },
      'Warlock': { checked: true },
      'Monk': { checked: true },
      'Druid': { checked: true },
      'Demon Hunter': { checked: true },
      'Death Knight': { checked: true },
      'Evoker': { checked: true },
    }
  });

  const getMaxRank = () => {
    if (!guildData) return 0;
    return Math.max(...guildData.roster.members.map(member => member.rank));
  };

  // Get active races from raceFilters
  const getActiveRaces = () => {
    const activeRaces = [];
    Object.entries(raceFilters).forEach(([_, factionData]) => {
      Object.entries(factionData).forEach(([raceName, raceData]) => {
        if (raceName !== 'checked' && raceData.checked) {
          activeRaces.push(raceName);
        }
      });
    });
    return activeRaces;
  };

  // Get active classes from classFilters
  const getActiveClasses = () => {
    return Object.entries(classFilters.Classes)
      .filter(([className, classData]) => className !== 'checked' && classData.checked)
      .map(([className]) => className);
  };

  // Create filter components
  const filterComponents = [
    <CharacterTextFilter
      value={nameFilter}
      onChange={setNameFilter}
      buttonText="Search name"
    />,
    <CharacterDropdownFilter
      filterData={raceFilters}
      onChange={setRaceFilters}
      buttonText="Filter race"
      variant="danger"
    />,
    <CharacterDropdownFilter
      filterData={classFilters}
      onChange={setClassFilters}
      buttonText="Filter class"
      variant="success"
    />,
    <CharacterCheckboxFilter
      value={maxLevelOnly}
      onChange={setMaxLevelOnly}
      buttonText="Max level only"
    />,
    <CharacterSelectFilter
      value={rankLimit}
      onChange={setRankLimit}
      buttonText="Max rank"
      options={[...Array(getMaxRank() + 1).keys()]}
    />
  ];

  const getFilteredMembers = () => {
    if (!guildData) return [];

    let filteredMembers = [...guildData.roster.members];

    // Apply name filter
    if (nameFilter) {
        filteredMembers = filteredMembers.filter(member =>
            member.character.name.toLowerCase().includes(nameFilter.toLowerCase())
        );
    }

    // Apply rank limit
    if (rankLimit !== '') {
        filteredMembers = filteredMembers.filter(member =>
            member.rank <= parseInt(rankLimit)
        );
    }

    // Apply max level filter
    if (maxLevelOnly) {
        filteredMembers = filteredMembers.filter(member =>
            member.character.level >= 80
        );
    }

    const activeRaces = getActiveRaces();
    const activeClasses = getActiveClasses();

    // Apply race filter
    filteredMembers = filteredMembers.filter(member =>
        activeRaces.includes(member.character.playable_race.name)
    );

    // Apply class filter
    filteredMembers = filteredMembers.filter(member =>
        activeClasses.includes(member.character.playable_class.name)
    );

    return filteredMembers;
};

if (!guildData) return <div>Loading...</div>;

  return (
    <>
      <h1>
        <span
          className="display-4"
          style={{ color: guildData.guild.faction === 'ALLIANCE' ? 'darkblue' : 'darkred' }}
        >
          &lt;{guildData.guild.name}&gt;
        </span>
        <span className="text-muted ms-auto">-{guildData.guild.realm.name}</span>
      </h1>

      <div className="row">
        <div className="col-lg-8">
          <div className="mb-3">
            <CharacterTable
              data={getFilteredMembers()}
              initialTableHeight={800}
              filters={filterComponents}
            />
          </div>
        </div>
        <div className="col-lg-4 order-lg-last order-first mb-4 mb-lg-0">
          <ClassDistributionChart members={getFilteredMembers()} />
        </div>
      </div>

      <div className="mt-3">
        <a className="btn btn-primary me-2" href="/account">Back to Account</a>
        {guildData.can_manage_rosters && (
          <Link
            to={`/guild/${realm}/${guild}/rosters`}
            className="btn btn-success"
          >
            Manage rosters
          </Link>
        )}
      </div>
    </>
  );
}

export default GuildDetails;