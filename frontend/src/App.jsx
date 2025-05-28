import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Account from './components/Account';
import WowProfile from './components/WowProfile';
import CharacterDetails from './components/CharacterDetails';
import GuildDetails from './components/GuildDetails';
import GuildRosters from './components/GuildRosters';
import RosterCreate from './components/roster/RosterCreate';
import RosterDetails from './components/roster/RosterDetails';
import OAuthCallback from './components/OAuthCallback';
import StarPolyhedron  from './components/test/StarShape';
import WebSocketTester from './components/simc/WebSocketTester';

import 'bootstrap/dist/css/bootstrap.min.css';
import Simc from './components/simc/Simc';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Account />} />
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<OAuthCallback />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/profile" element={<WowProfile />} />
        <Route path="/character/:realm/:character" element={<CharacterDetails />} />
        <Route path="/guild/:realm/:guild" element={<GuildDetails />} />
        <Route path="/guild/:realm/:guild/rosters" element={<GuildRosters />} />
        <Route path="/guild/:realm/:guild/rosters/create" element={<RosterCreate />} />
        <Route path="/guild/:realm/:guild/rosters/:rosterId" element={<RosterDetails />} />
        <Route path="/shape" element={<StarPolyhedron  />} />

        <Route path="/run-simulation" element={<Simc />} />
        <Route path="/run-ws" element={<WebSocketTester />} />
      </Routes>
    </Router>
  );
}

export default App;