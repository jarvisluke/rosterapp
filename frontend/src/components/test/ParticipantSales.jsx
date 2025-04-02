import React, { useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import 'bootstrap/dist/css/bootstrap.min.css';

const ParticipantSales = () => {
    const [participants, setParticipants] = useState([{ name: '', units: '' }]);

    const handleInputChange = (index, field, value) => {
        const newParticipants = [...participants];
        newParticipants[index][field] = value;
        setParticipants(newParticipants);
    };

    const addParticipant = () => {
        setParticipants([...participants, { name: '', units: '' }]);
    };

    const chartData = {
        labels: participants.map(p => p.name),
        datasets: [
            {
                label: 'Units Sold',
                data: participants.map(p => p.units),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
            },
        ],
    };

    const pieData = {
        labels: participants.map(p => p.name),
        datasets: [
            {
                data: participants.map(p => p.units),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
            },
        ],
    };

    return (
        <div className="container mt-5">
            <h2>Fundraiser Results by Salesperson</h2>
            <table className="table">
                <thead>
                    <tr>
                        <th>Participant</th>
                        <th>Units Sold</th>
                    </tr>
                </thead>
                <tbody>
                    {participants.map((participant, index) => (
                        <tr key={index}>
                            <td>
                                <input
                                    type="text"
                                    value={participant.name}
                                    onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                                    className="form-control"
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={participant.units}
                                    onChange={(e) => handleInputChange(index, 'units', e.target.value)}
                                    className="form-control"
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={addParticipant} className="btn btn-primary mb-3">Add Participant</button>

            <h3>Bar Chart</h3>
            <Bar data={chartData} />
            <h3>Pie Chart</h3>
            <Pie data={pieData} />
        </div>
    );
};

export default ParticipantSales;