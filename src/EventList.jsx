// src/components/EventList.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEvents } from '../api/fetchEvents';
import '../styles/EventList.css';

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [city, setCity] = useState('San Francisco');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEvents(city);
        setEvents(data);
      } catch (error) {
        setError('Error fetching events. Please try again later.');
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [city]);

  // Determine event card color based on classification
  const getEventCardClass = (event) => {
    if (!event || !event.classifications || event.classifications.length === 0) {
      return 'event-card-purple'; // Default color if no classification
    }

    const segment = event.classifications[0].segment?.name?.toLowerCase() || '';
    
    if (segment.includes('music')) {
      return 'event-card-blue'; // Music events
    } else if (segment.includes('sports')) {
      return 'event-card-red'; // Sports events
    } else if (segment.includes('art') || segment.includes('theatre')) {
      return 'event-card-yellow'; // Arts & Theatre events
    } else if (segment.includes('family') || segment.includes('attraction')) {
      return 'event-card-green'; // Family events
    } else {
      return 'event-card-purple'; // Other events
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="event-list-container">
      <div className="event-list-header">
        <h1>FOMO FINDER</h1>
        <button className="back-button" onClick={() => navigate('/profile')}>
          ← Back to Profile
        </button>
      </div>

      <h2>Trending Events in {city}</h2>
      
      <div className="search-container">
        <input
          type="text"
          placeholder="Enter city name"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="city-input"
        />
        <button onClick={() => {}} className="search-btn">
          Search Events
        </button>
      </div>

      {loading && <p className="loading-message">Loading events...</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="events-grid">
        {events.length > 0 ? (
          events.map((event) => (
            <div 
              key={event.id} 
              className={`event-list-card ${getEventCardClass(event)}`}
            >
              <h3>{event.name}</h3>
              <p className="event-date">{formatDate(event.dates?.start?.localDate)}</p>
              {event._embedded?.venues?.[0]?.name && (
                <p className="event-venue">{event._embedded.venues[0].name}</p>
              )}
              <a 
                href={event.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="view-event-btn"
              >
                View Event
              </a>
            </div>
          ))
        ) : (
          !loading && <p className="no-events">No events found for {city}.</p>
        )}
      </div>
    </div>
  );
}