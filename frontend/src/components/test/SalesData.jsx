import React, { useState } from 'react';
import { Table, Button, Container, Row, Col } from 'react-bootstrap';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip } from 'recharts';

const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#ffbb28', '#8884d8'];

const SalesData = () => {
  const [data, setData] = useState([
    { name: 'Andy', units: 11 },
    { name: 'Chloe', units: 15 },
    { name: 'Daniel', units: 9 },
    { name: 'Grace', units: 14 },
    { name: 'Sophia', units: 21 }
  ]);

  const [newParticipant, setNewParticipant] = useState({ name: '', units: 0 });
  const totalUnits = data.reduce((acc, curr) => acc + parseInt(curr.units), 0);

  const dataWithProportion = data.map((item) => ({
    ...item,
    proportion: ((item.units / totalUnits) * 100).toFixed(2), // Proportion as a percentage
  }));

  const handleAddRow = () => {
    setData([...data, { ...newParticipant, units: Number(newParticipant.units) }]);
    setNewParticipant({ name: '', units: 0 });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewParticipant({ 
      ...newParticipant, 
      [name]: name === 'units' ? parseInt(value) || 0 : value 
    });
  };

  return (
    <Container>
      <Row>
        <Col>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Participant</th>
                <th>Units Sold</th>
                <th>Proportion (%)</th>
              </tr>
            </thead>
            <tbody>
              {dataWithProportion.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.units}</td>
                  <td>{item.proportion}</td>
                </tr>
              ))}
              <tr>
                <td><input type="text" name="name" value={newParticipant.name} onChange={handleInputChange} /></td>
                <td><input type="number" name="units" value={newParticipant.units} onChange={handleInputChange} /></td>
                <td></td>
              </tr>
            </tbody>
          </Table>
          <Button onClick={handleAddRow} disabled={!newParticipant.name || newParticipant.units <= 0}>
            Add Row
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <BarChart width={500} height={300} data={dataWithProportion}>
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="units" fill="#8884d8">
              {dataWithProportion.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </Col>
        <Col>
          <PieChart width={400} height={400}>
            <Pie 
              data={dataWithProportion} 
              dataKey="units" 
              cx="50%" 
              cy="50%" 
              outerRadius={100} 
              fill="#8884d8" 
              label={({ index }) => `${dataWithProportion[index].proportion}%`}
            >
              {dataWithProportion.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </Col>
        <Col>
          <div>
            {data.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: colors[index % colors.length], borderRadius: '50%', marginRight: '8px' }}></div>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default SalesData;