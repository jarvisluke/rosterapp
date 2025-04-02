import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function WowProfile() {
  const [profileData, setProfileData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/wow-profile')
      .then(response => setProfileData(response.data))
      .catch(error => {
        if (error.response?.status === 401) {
          navigate('/login');
        }
      });
  }, [navigate]);
  console.log(profileData)

  return (
    <div>
      <h1>World of Warcraft Profile</h1>
      {profileData && (
        <>
          <h2>Characters for {profileData.battle_tag}</h2>
          {profileData.wow_profile.wow_accounts.map(account => (
            <div key={account.id}>
              <h3>WoW Account: {account.id}</h3>
              <ul>
                {account.characters.map(character => (
                  <li key={`${character.realm.slug}-${character.name}`}>
                    <Link to={`/character/${character.realm.slug}/${character.name.toLowerCase()}`}>
                      {character.name}
                    </Link>
                    <ul>
                      <li>Level: {character.level}</li>
                      <li>Race: {character.playable_race.name}</li>
                      <li>Class: {character.playable_class.name}</li>
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      <Link to="/account">Back to Account</Link>
    </div>
  );
}

export default WowProfile;