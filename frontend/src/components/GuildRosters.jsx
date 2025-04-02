import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function GuildRosters() {
    const [rosters, setRosters] = useState(null);
    const [error, setError] = useState(null);
    const { realm, guild } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`/api/guild/${realm}/${guild}/rosters`)
            .then(response => setRosters(response.data))
            .catch(error => {
                if (error.response?.status === 401) {
                    navigate('/login');
                } else if (error.response?.status === 403) {
                    setError("You don't have permission to view rosters for this guild.");
                } else {
                    setError("An error occurred while fetching rosters.");
                }
            });
    }, [realm, guild, navigate]);

    if (error) return <div className="alert alert-danger">{error}</div>;
    if (!rosters) return <div>Loading...</div>;

    return (
        <div className="container mt-4">
            <h1>
                Rosters for{' '}
                <Link to={`/guild/${realm}/${guild}`} className="text-decoration-none">
                    &lt;{guild}&gt;
                </Link>
            </h1>

            <div className="mb-3">
                <Link to={`/guild/${realm}/${guild}/rosters/create`} className="btn btn-primary">
                    Create New Roster
                </Link>
            </div>

            {rosters.length === 0 ? (
                <div className="alert alert-info">No rosters found for this guild.</div>
            ) : (
                <div className="row">
                    {rosters.map(roster => (
                        <div key={roster.id} className="col-md-6 col-lg-4 mb-4">
                            <div className="card">
                                <div className="card-body">
                                    <h5 className="card-title">{roster.name}</h5>
                                    <h6 className="card-subtitle mb-2 text-muted">{roster.size} players</h6>
                                    <p className="card-text">
                                        {roster.characters.length} characters assigned
                                    </p>
                                    <div className="d-flex justify-content-between">
                                        <Link
                                            to={`/guild/${realm}/${guild}/rosters/${roster.id}`}
                                            className="btn btn-primary"
                                        >
                                            View Details
                                        </Link>
                                        <button className="btn btn-danger">Delete</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Link to={`/guild/${realm}/${guild}`} className="btn btn-primary">
                Back to Guild
            </Link>
        </div>
    );
}

export default GuildRosters;