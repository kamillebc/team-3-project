// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client'; 
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Login from './components/Login';
import Profile from './components/Profile';
import EventList from './components/EventList'; // Adjusted import path
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/events" element={<EventList />} /> {/* Add the /events route */}
        <Route path="/app" element={<App />} /> {/* Optionally add the main app route */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
