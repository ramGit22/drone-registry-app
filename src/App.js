import React, { useState, useEffect } from 'react';
import axios from 'axios';
import xml2js from 'xml2js';
import 'bootstrap/dist/css/bootstrap.min.css';

const MONITORING_URL = 'https://assignments.reaktor.com/birdnest/drones';
const REGISTRY_URL = 'https://assignments.reaktor.com/birdnest/pilots/';

function DroneMonitor() {
  const [drones, setDrones] = useState([]);
  const [pilot, setPilot] = useState([]);

  async function fetchDrones() {
    try {
      const monitoringResponse = await axios.get(
        'http://localhost:8080/' + MONITORING_URL,
        {
          mode: 'cors',
        }
      );
      const monitoringData = monitoringResponse.data;
      const parsedData = await xml2js.parseStringPromise(monitoringData);
      const droneName = parsedData.report.capture[0].drone;
      const dronesInNoFlyZone = droneName.filter((drone) => {
        const dx = drone.positionX - 250000;
        const dy = drone.positionY - 250000;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 100000;
      });
      setDrones(dronesInNoFlyZone);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    const storedPilot = localStorage.getItem('pilot');
    const lastSeen = localStorage.getItem('lastSeen');

    if (storedPilot && lastSeen) {
      const timeDiff = (Date.now() - lastSeen) / 1000 / 60;
      if (timeDiff < 10) {
        const parsedPilot = JSON.parse(storedPilot);
        setPilot(parsedPilot);
      }
    }
    fetchPilot();
  }, []);

  async function fetchPilot() {
    if (drones.length === 0) {
      return;
    }

    const pilotData = await Promise.all(
      drones.map(async (drone) => {
        try {
          const response = await axios.get(
            'http://localhost:8080/' + REGISTRY_URL + drone.serialNumber,
            {
              mode: 'cors',
            }
          );
          return response.data;
        } catch (error) {
          return {};
        }
      })
    );

    setPilot([...pilot, ...pilotData]);
    localStorage.setItem('pilot', JSON.stringify([...pilot, ...pilotData]));
    localStorage.setItem('lastSeen', Date.now());
  }

  const distanceFromNest = (drone) => {
    const dx = drone.positionX - 250000;
    const dy = drone.positionY - 250000;
    return Math.round(Math.sqrt(dx * dx + dy * dy)) / 1000;
  };

  useEffect(() => {
    fetchDrones();
    const intervalId = setInterval(fetchDrones, 2000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    fetchPilot();
  }, [drones]);

  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     window.location.reload();
  //   }, 2000);
  //   return () => clearInterval(intervalId);
  // }, []);

  return (
    <div>
      {pilot.length > 0 && (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {pilot.map((pilot) => (
              <tr>
                <td>{pilot.firstName}</td>
                <td>{pilot.email}</td>
                <td>{pilot.phoneNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {drones.length === 0 && <p>No drones in no-fly zone</p>}
      <h2>Drones in No-Fly Zone:</h2>
      <ul>
        {drones.map((drone) => (
          <li key={drone.serialNumber}>
            Serial Number: {drone.serialNumber} - Distance from Nest:{' '}
            {distanceFromNest(drone)} meters
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DroneMonitor;
