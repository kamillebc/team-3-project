import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import '../styles/localEvents.css';

function LocalEvents() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    name: '',
    type: '',
    date: '',
    time: '',
    location: '',
    description: '',
    city: ''
  });
  const [filter, setFilter] = useState('all'); // 'all', 'mine', 'friends'
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState([]);
  const navigate = useNavigate();

  // Fetch user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        navigate('/');
      } else {
        setUser(currentUser);
        fetchEvents();
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch events whenever filter or selectedCity changes
  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [filter, selectedCity, user]);

  // Fetch events from Firestore
  const fetchEvents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let eventsQuery = collection(db, 'localEvents');
      
      // Apply filters
      if (filter === 'mine') {
        eventsQuery = query(
          eventsQuery, 
          where('createdBy', '==', user.uid),
          orderBy('eventDate', 'asc')
        );
      } else if (filter === 'friends') {
        // First get user's friends
        const friendsRef = collection(db, 'users', user.uid, 'friends');
        const friendsSnapshot = await getDocs(friendsRef);
        const friendIds = friendsSnapshot.docs.map(doc => doc.id);
        
        // Include user's own events too
        friendIds.push(user.uid);
        
        eventsQuery = query(
          eventsQuery, 
          where('createdBy', 'in', friendIds),
          orderBy('eventDate', 'asc')
        );
      } else {
        // All events, ordered by date
        eventsQuery = query(eventsQuery, orderBy('eventDate', 'asc'));
      }
      
      // Apply city filter if selected
      if (selectedCity) {
        eventsQuery = query(eventsQuery, where('city', '==', selectedCity));
      }

      const querySnapshot = await getDocs(eventsQuery);
      
      const eventsData = [];
      const citiesSet = new Set();
      
      querySnapshot.forEach((doc) => {
        const eventData = { id: doc.id, ...doc.data() };
        
        // Convert Firestore timestamp to Date object
        if (eventData.eventDate && eventData.eventDate.toDate) {
          eventData.eventDate = eventData.eventDate.toDate();
        }
        
        eventsData.push(eventData);
        
        // Add city to cities list if it exists
        if (eventData.city) {
          citiesSet.add(eventData.city);
        }
      });
      
      setCities(Array.from(citiesSet).sort());
      setEvents(eventsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Add a new event
  const addEvent = async (e) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      // Convert date and time to Timestamp
      const dateTime = new Date(`${eventFormData.date}T${eventFormData.time || '00:00'}`);
      
      const newEvent = {
        name: eventFormData.name,
        type: eventFormData.type,
        eventDate: Timestamp.fromDate(dateTime),
        location: eventFormData.location,
        description: eventFormData.description,
        city: eventFormData.city,
        createdBy: user.uid,
        creatorName: user.displayName,
        creatorEmail: user.email,
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, 'localEvents'), newEvent);
      
      // Reset form and hide it
      setEventFormData({
        name: '',
        type: '',
        date: '',
        time: '',
        location: '',
        description: '',
        city: ''
      });
      setShowAddEventForm(false);
      
      // Refresh events list
      fetchEvents();
    } catch (err) {
      console.error('Error adding event:', err);
      setError('Failed to add event. Please try again.');
    }
  };

  // Delete an event (only if user is the creator)
  const deleteEvent = async (eventId, createdBy) => {
    if (!user || user.uid !== createdBy) return;
    
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteDoc(doc(db, 'localEvents', eventId));
        setEvents(events.filter(event => event.id !== eventId));
      } catch (err) {
        console.error('Error deleting event:', err);
        setError('Failed to delete event. Please try again.');
      }
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEventFormData(prev => ({ ...prev, [name]: value }));
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Date TBD';
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (date) => {
    if (!date) return '';
    
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  // Determine event card color based on type
  const getEventCardClass = (eventType) => {
    const type = eventType.toLowerCase();
    
    if (type.includes('music') || type === 'concert') {
      return 'event-card-blue';
    } else if (type.includes('sport')) {
      return 'event-card-red';
    } else if (type.includes('art') || type.includes('theatre') || type.includes('theater')) {
      return 'event-card-yellow';
    } else if (type.includes('family') || type.includes('kids') || type.includes('children')) {
      return 'event-card-green';
    } else {
      return 'event-card-purple';
    }
  };

  return (
    <div className="main-container">
      <div className="app-header">
        <div className="logo-section">
          <h1 className="app-title">FOMO FINDER</h1>
        </div>
        <div className="profile-actions">
          <button className="primary-button" onClick={() => navigate('/profile')}>Profile</button>
          <button className="secondary-button" onClick={() => navigate('/events')}>API Events</button>
        </div>
      </div>
      
      <div className="user-welcome-section">
        <h2>Community Events</h2>
        <p className="subtext">Discover and share local events with friends</p>
      </div>

      <div className="local-events-container">
        <div className="local-events-controls">
          <div className="filter-controls">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-dropdown"
            >
              <option value="all">All Events</option>
              <option value="mine">My Events</option>
              <option value="friends">Friends' Events</option>
            </select>
            
            <select 
              value={selectedCity} 
              onChange={(e) => setSelectedCity(e.target.value)}
              className="city-dropdown"
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          
          <button 
            className="add-event-btn" 
            onClick={() => setShowAddEventForm(!showAddEventForm)}
          >
            {showAddEventForm ? 'Cancel' : 'Add New Event'}
          </button>
        </div>
        
        {/* Add Event Form */}
        {showAddEventForm && (
          <div className="add-event-form-container">
            <h3>Add New Event</h3>
            <form onSubmit={addEvent} className="add-event-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Event Name*</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    value={eventFormData.name} 
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="type">Event Type*</label>
                  <select 
                    id="type" 
                    name="type" 
                    value={eventFormData.type} 
                    onChange={handleInputChange}
                    required
                  >
                    <option value="" disabled>Select type</option>
                    <option value="Music">Music</option>
                    <option value="Sports">Sports</option>
                    <option value="Arts & Theatre">Arts & Theatre</option>
                    <option value="Family">Family</option>
                    <option value="Food & Drink">Food & Drink</option>
                    <option value="Networking">Networking</option>
                    <option value="Charity">Charity</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">Date*</label>
                  <input 
                    type="date" 
                    id="date" 
                    name="date" 
                    value={eventFormData.date} 
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="time">Time</label>
                  <input 
                    type="time" 
                    id="time" 
                    name="time" 
                    value={eventFormData.time} 
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="location">Location*</label>
                  <input 
                    type="text" 
                    id="location" 
                    name="location" 
                    value={eventFormData.location} 
                    onChange={handleInputChange}
                    required
                    placeholder="Venue name"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="city">City*</label>
                  <input 
                    type="text" 
                    id="city" 
                    name="city" 
                    value={eventFormData.city} 
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea 
                  id="description" 
                  name="description" 
                  value={eventFormData.description} 
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Provide details about your event"
                ></textarea>
              </div>
              
              <div className="form-buttons">
                <button type="submit" className="submit-event-btn">Save Event</button>
                <button 
                  type="button" 
                  className="cancel-event-btn"
                  onClick={() => setShowAddEventForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Error and Loading States */}
        {error && <p className="error-text">{error}</p>}
        {loading && <p className="loading-text">Loading events...</p>}
        
        {/* Events List */}
        {!loading && events.length === 0 && (
          <div className="no-events-message">
            <p>No events found. {filter === 'mine' ? 'Create your first event!' : filter === 'friends' ? 'Your friends haven\'t created any events yet.' : 'Be the first to add an event!'}</p>
          </div>
        )}
        
        <div className="local-events-grid">
          {events.map(event => (
            <div 
              key={event.id} 
              className={`local-event-card ${getEventCardClass(event.type)}`}
            >
              <div className="event-header">
                <span className="event-type-badge">{event.type}</span>
                {user && user.uid === event.createdBy && (
                  <button 
                    className="delete-event-btn"
                    onClick={() => deleteEvent(event.id, event.createdBy)}
                    title="Delete event"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <h3 className="event-title">{event.name}</h3>
              
              <div className="event-details">
                <p className="event-date-time">
                  <strong>When:</strong> {formatDate(event.eventDate)} {formatTime(event.eventDate)}
                </p>
                <p className="event-location">
                  <strong>Where:</strong> {event.location}, {event.city}
                </p>
                
                {event.description && (
                  <p className="event-description">{event.description}</p>
                )}
                
                <div className="event-creator">
                  <span>Posted by: {event.creatorName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// Updated setupEventImages function for proper image handling
function setupEventImages() {
    // Get all event images
    const eventImages = document.querySelectorAll('.event-image');
    
    // For each image, add error handling and sizing class management
    eventImages.forEach(img => {
      // Set a default image if the original fails to load
      img.onerror = function() {
        this.src = '/path/to/default-event-image.jpg'; // Replace with your default image path
        this.classList.add('portrait'); // Apply portrait styling
      };
      
      // When image loads successfully, check its dimensions and resize if needed
      img.onload = function() {
        // If image is taller than it is wide (portrait), apply special class
        if (this.naturalHeight > this.naturalWidth) {
          this.classList.add('portrait');
        } else {
          this.classList.remove('portrait');
        }
        
        // Apply compression to reduce the size of large images
        if (this.complete && this.naturalHeight !== 0) {
          const maxHeight = 120; // Match the CSS container height
          
          // If image is too tall, scale it down
          if (this.naturalHeight > maxHeight) {
            this.style.height = maxHeight + 'px';
            this.style.width = 'auto';
          }
          
          // If image is too large file size (over 1MB), apply compression class
          if (this.src.length > 1000000) { // rough estimate for 1MB base64 image
            this.classList.add('compressed-image');
          }
        }
      };
    });
  }
  
  // Function to handle image uploads and preview in the form
  function setupImageUploadPreview() {
    const imageInput = document.querySelector('.image-upload-input');
    const previewContainer = document.querySelector('.image-preview-container');
    
    if (!imageInput || !previewContainer) return;
    
    imageInput.addEventListener('change', function(e) {
      // Clear previous preview
      previewContainer.innerHTML = '';
      
      const file = e.target.files[0];
      if (!file) return;
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image is too large! Please select an image under 5MB.');
        imageInput.value = '';
        return;
      }
      
      // Check file type
      if (!file.type.match('image.*')) {
        alert('Please select an image file');
        imageInput.value = '';
        return;
      }
      
      // Create preview with size constraints
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.classList.add('preview-image');
        
        // Pre-resize large images in the preview
        img.onload = function() {
          const maxHeight = 120;
          if (this.naturalHeight > maxHeight) {
            this.style.height = maxHeight + 'px';
            this.style.width = 'auto';
          }
        };
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.classList.add('remove-image-btn');
        removeBtn.addEventListener('click', function() {
          previewContainer.innerHTML = '';
          imageInput.value = '';
        });
        
        previewContainer.appendChild(img);
        previewContainer.appendChild(removeBtn);
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  // Run setup functions when the DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    setupEventImages();
    setupImageUploadPreview();
    
    // If you're dynamically loading events via AJAX, also call setupEventImages() 
    // after the new content is added to the DOM
  });

export default LocalEvents;