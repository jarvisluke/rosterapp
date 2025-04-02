import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import RaceFilter from './RaceFilter';
import ClassFilter from './ClassFilter';
import ClassDistributionChart from './ClassDistributionChart';
import PlayableClassIcon from './PlayableClassIcon';
import { getClassColor } from '../util';

function GuildDetails() {
  const [guildData, setGuildData] = useState(null);
  const [nameFilter, setNameFilter] = useState('');
  const [rankLimit, setRankLimit] = useState('');
  const [maxLevelOnly, setMaxLevelOnly] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const { realm, guild } = useParams();

  const navigate = useNavigate();

  const [activeRaces, setActiveRaces] = useState([]);
  const [activeClasses, setActiveClasses] = useState([]);

  const getMaxRank = () => {
    if (!guildData) return 0;
    return Math.max(...guildData.roster.members.map(member => member.rank));
  };

  useEffect(() => {
    axios.get(`/api/guild/${realm}/${guild}`)
      .then(response => setGuildData(response.data))
      .catch(error => {
        if (error.response?.status === 401) {
          navigate('/login');
        }
      });
  }, [realm, guild, navigate]);

  if (!guildData) return <div>Loading...</div>;

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedMembers = () => {
    let filteredMembers = [...guildData.roster.members];

    // Apply filters...
    if (nameFilter) {
      filteredMembers = filteredMembers.filter(member =>
        member.character.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    if (rankLimit !== '') {
      filteredMembers = filteredMembers.filter(member =>
        member.rank <= parseInt(rankLimit)
      );
    }

    if (maxLevelOnly) {
      filteredMembers = filteredMembers.filter(member =>
        member.character.level >= 80
      );
    }

    filteredMembers = filteredMembers.filter(member =>
      activeRaces.includes(member.character.playable_race.name)
    );

    filteredMembers = filteredMembers.filter(member =>
      activeClasses.includes(member.character.playable_class.name)
    );

    // Apply sorting...
    return filteredMembers.sort((a, b) => {
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

  const getPaginatedMembers = () => {
    const sortedMembers = getSortedMembers();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedMembers.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(getSortedMembers().length / itemsPerPage);

  const renderPaginationControls = () => {
    const pageNumbers = [];

    pageNumbers.push(1);
    if (currentPage > 4) pageNumbers.push('...');
    for (let i = currentPage - 2; i <= currentPage + 2; i++) {
      if (i > 1 && i < totalPages) pageNumbers.push(i);
    }
    if (currentPage < totalPages - 3) pageNumbers.push('...');
    if (totalPages > 1) pageNumbers.push(totalPages);

    return (
      <div className="d-flex justify-content-between align-items-center">
        <nav>
          <ul className="pagination">
            {pageNumbers.map((page, index) =>
              page === '...' ? (
                <li key={index} className="page-item disabled">
                  <span className="page-link">...</span>
                </li>
              ) : (
                <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(page)}>
                    {page}
                  </button>
                </li>
              )
            )}
          </ul>
        </nav>

        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    );
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  }

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

      <div className="input-group mb-4">
        <input
          type="text"
          className="form-control"
          placeholder="Search name"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />
        <button className="btn btn-outline-secondary dropdown-toggle" type="button" id="dropdown-race" data-bs-toggle="dropdown" aria-expanded="false">
          Filter race
        </button>
        <div className="dropdown-menu p-3">
          <RaceFilter onFilterChange={setActiveRaces} />
        </div>
        <button className="btn btn-outline-secondary dropdown-toggle" type="button" id="dropdown-class" data-bs-toggle="dropdown" aria-expanded="false">
          Filter class
        </button>
        <div className="dropdown-menu p-3">
          <ClassFilter onFilterChange={setActiveClasses} />
        </div>
        <span className="input-group-text d-flex align-items-center">
          <label htmlFor="maxRankOnly">Max level only</label>
          <input
            type="checkbox"
            className="form-check-input ms-2"
            id="maxLevelOnly"
            checked={maxLevelOnly}
            onChange={(e) => setMaxLevelOnly(e.target.checked)}
          />
        </span>
        <select
          className={`form-select ${rankLimit === '' ? 'text-muted' : ''}`}
          value={rankLimit}
          onChange={(e) => setRankLimit(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="" className="text-muted">Max rank</option>
          {[...Array(getMaxRank() + 1).keys()].map(rank => (
            <option key={rank} value={rank}>{rank}</option>
          ))}
        </select>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <table className="table table-hover">
            <thead>
              <tr className='bg-dark'>
                <th onClick={() => handleSort('rank')} style={{ cursor: 'pointer' }}>
                  Rank{getSortIndicator('rank')}
                </th>
                <th onClick={() => handleSort('class')} style={{ cursor: 'pointer' }}>
                  Class{getSortIndicator('class')}
                </th>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Name{getSortIndicator('name')}
                </th>
                <th onClick={() => handleSort('level')} style={{ cursor: 'pointer' }}>
                  Level{getSortIndicator('level')}
                </th>
                <th onClick={() => handleSort('race')} style={{ cursor: 'pointer' }}>
                  Race{getSortIndicator('race')}
                </th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedMembers().map(member => (
                <tr key={member.character.id}>
                  <td>{member.rank}</td>
                  <td>
                    <PlayableClassIcon
                      className={member.character.playable_class.name}
                      media={member.character.playable_class.media}
                    />
                  </td>
                  <td>
                    <Link
                      to={`/character/${member.character.realm.slug}/${member.character.name.toLowerCase()}`}
                      className="character text-decoration-none"
                      style={{ color: getClassColor(member.character.playable_class.name) }}
                    >
                      {member.character.name}
                      <span className="realm text-muted">-{member.character.realm.short_name}</span>
                    </Link>
                  </td>
                  <td>{member.character.level}</td>
                  <td>{member.character.playable_race.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {renderPaginationControls()}
        </div>
        <div className="col-lg-4 order-lg-last order-first mb-4 mb-lg-0">
          <ClassDistributionChart members={getSortedMembers()} />
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