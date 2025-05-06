import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase'; // Import db from firebase
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { fetchEvents, searchEventsByKeyword } from '../api/fetchEvents';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  deleteDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore'; // Import Firestore methods
import '../styles/profile.css';

function Profile() {
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(null);
  const [events, setEvents] = useState([]);
  const [city, setCity] = useState('San Diego');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const overlayRef = useRef(null);
  const navigate = useNavigate();
  
  // Friends related state
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState(null);

  // User preferences and saved events
  const [userPreferences, setUserPreferences] = useState({
    interests: [],
    favoriteCity: '',
    notificationEnabled: true
  });
  const [savedEvents, setSavedEvents] = useState([]);
  const [savedEventsLoading, setSavedEventsLoading] = useState(false);

  // Edit profile state
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');

  // Interest categories
  const interestCategories = [
    { id: 'music', name: 'Music', color: 'music' },
    { id: 'sports', name: 'Sports', color: 'sports' },
    { id: 'arts', name: 'Arts', color: 'arts' },
    { id: 'family', name: 'Family', color: 'family' },
    { id: 'food', name: 'Food', color: 'food' },
    { id: 'comedy', name: 'Comedy', color: 'comedy' },
    { id: 'festivals', name: 'Festivals', color: 'festivals' }
  ];

  // Fetch user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        navigate('/');
      } else {
        setUser(currentUser);
        // Load friends when user authenticates
        loadFriends(currentUser.uid);
        // Load user preferences
        loadUserPreferences(currentUser.uid);
        // Load saved events
        loadSavedEvents(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Prefill edit profile fields when popup opens
  useEffect(() => {
    if (showPopup === 'editProfile' && user) {
      setEditDisplayName(user.displayName || '');
      setEditPhotoURL(user.photoURL || '');
    }
  }, [showPopup, user]);

  // Load user preferences from Firestore
  const loadUserPreferences = async (userId) => {
    try {
      const userPrefsRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userPrefsRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserPreferences({
          interests: userData.interests || [],
          favoriteCity: userData.favoriteCity || city,
          notificationEnabled: userData.notificationEnabled !== false // Default to true if not set
        });
        
        // Update city if user has a favorite city
        if (userData.favoriteCity) {
          setCity(userData.favoriteCity);
        }
      } else {
        // If no user preferences document exists, create one with defaults
        const defaultPrefs = {
          interests: ['music', 'sports'],
          favoriteCity: city,
          notificationEnabled: true,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL || null
        };
        
        await setDoc(userPrefsRef, defaultPrefs);
        setUserPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  // Load saved events from Firestore
  const loadSavedEvents = async (userId) => {
    setSavedEventsLoading(true);
    try {
      const savedEventsRef = collection(db, 'users', userId, 'savedEvents');
      const savedEventsSnapshot = await getDocs(savedEventsRef);
      
      const savedEventsList = savedEventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSavedEvents(savedEventsList);
    } catch (error) {
      console.error('Error loading saved events:', error);
    } finally {
      setSavedEventsLoading(false);
    }
  };

  // Function to save an event
  const saveEvent = async (event) => {
    if (!user) return;
    
    try {
      const eventId = event.id;
      const savedEventRef = doc(db, 'users', user.uid, 'savedEvents', eventId);
      
      // Check if already saved
      const eventDoc = await getDoc(savedEventRef);
      
      if (eventDoc.exists()) {
        // Already saved, remove it
        await deleteDoc(savedEventRef);
        setSavedEvents(savedEvents.filter(e => e.id !== eventId));
      } else {
        // Save the event
        const eventToSave = {
          id: event.id,
          name: event.name,
          date: event.dates?.start?.localDate,
          time: event.dates?.start?.localTime,
          venue: event._embedded?.venues?.[0]?.name,
          city: event._embedded?.venues?.[0]?.city?.name,
          imageUrl: event.images?.[0]?.url,
          url: event.url,
          type: event.classifications?.[0]?.segment?.name || 'Other',
          savedAt: new Date().toISOString()
        };
        
        await setDoc(savedEventRef, eventToSave);
        setSavedEvents([...savedEvents, eventToSave]);
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  // Function to remove a saved event
  const removeSavedEvent = async (eventId) => {
    if (!user) return;
    try {
      const savedEventRef = doc(db, 'users', user.uid, 'savedEvents', eventId);
      await deleteDoc(savedEventRef);
      setSavedEvents(savedEvents.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error removing saved event:', error);
    }
  };

  // Check if an event is saved
  const isEventSaved = (eventId) => {
    return savedEvents.some(event => event.id === eventId);
  };

  // Toggle user interest
  const toggleInterest = async (interestId) => {
    if (!user) return;
    
    try {
      let updatedInterests;
      
      if (userPreferences.interests.includes(interestId)) {
        // Remove interest
        updatedInterests = userPreferences.interests.filter(id => id !== interestId);
      } else {
        // Add interest
        updatedInterests = [...userPreferences.interests, interestId];
      }
      
      // Update locally
      setUserPreferences({
        ...userPreferences,
        interests: updatedInterests
      });
      
      // Update in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        interests: updatedInterests
      });
    } catch (error) {
      console.error('Error updating interests:', error);
    }
  };

  // Update favorite city
  const updateFavoriteCity = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        favoriteCity: city
      });
      
      setUserPreferences({
        ...userPreferences,
        favoriteCity: city
      });
      
      // Show confirmation message
      alert(`${city} saved as your favorite city!`);
    } catch (error) {
      console.error('Error updating favorite city:', error);
    }
  };

  // Toggle notification preference
  const toggleNotifications = async () => {
    if (!user) return;
    
    try {
      const newNotificationStatus = !userPreferences.notificationEnabled;
      
      // Update locally
      setUserPreferences({
        ...userPreferences,
        notificationEnabled: newNotificationStatus
      });
      
      // Update in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        notificationEnabled: newNotificationStatus
      });
    } catch (error) {
      console.error('Error updating notification preference:', error);
    }
  };

  // Function to load user's friends from Firestore
  const loadFriends = async (userId) => {
    setFriendsLoading(true);
    try {
      const friendsRef = collection(db, 'users', userId, 'friends');
      const friendsSnapshot = await getDocs(friendsRef);
      const friendsList = friendsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFriends(friendsList);
      setFriendsError(null);
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriendsError('Failed to load friends. Please try again later.');
    } finally {
      setFriendsLoading(false);
    }
  };

  // Function to search for users by email or display name
  const searchUsers = async () => {
    if (!searchTerm.trim() || searchTerm.length < 3) {
      setSearchResults([]);
      return;
    }

    setFriendsLoading(true);
    try {
      // Search by display name
      const nameQuery = query(
        collection(db, 'users'),
        where('displayName', '>=', searchTerm),
        where('displayName', '<=', searchTerm + '\uf8ff')
      );
      
      // Search by email
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '>=', searchTerm),
        where('email', '<=', searchTerm + '\uf8ff')
      );

      const [nameSnapshot, emailSnapshot] = await Promise.all([
        getDocs(nameQuery),
        getDocs(emailQuery)
      ]);

      // Combine and deduplicate results
      const nameResults = nameSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const emailResults = emailSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Combine and remove duplicates
      const combinedResults = [...nameResults];
      emailResults.forEach(user => {
        if (!combinedResults.some(u => u.id === user.id)) {
          combinedResults.push(user);
        }
      });

      // Filter out current user and already added friends
      const filteredResults = combinedResults.filter(
        result => result.id !== user.uid && !friends.some(friend => friend.id === result.id)
      );

      setSearchResults(filteredResults);
      setFriendsError(null);
    } catch (error) {
      console.error('Error searching users:', error);
      setFriendsError('Error searching for users. Please try again.');
    } finally {
      setFriendsLoading(false);
    }
  };

  // Function to add a friend
  const addFriend = async (friendUser) => {
    if (!user) return;
    
    try {
      // Add to current user's friends collection
      const friendRef = doc(db, 'users', user.uid, 'friends', friendUser.id);
      await setDoc(friendRef, {
        displayName: friendUser.displayName,
        email: friendUser.email,
        photoURL: friendUser.photoURL || null,
        addedAt: new Date().toISOString()
      });

      // Also add current user to the friend's friends collection (bidirectional)
      const currentUserRef = doc(db, 'users', friendUser.id, 'friends', user.uid);
      await setDoc(currentUserRef, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL || null,
        addedAt: new Date().toISOString()
      });

      // Update local state
      setFriends([...friends, { 
        id: friendUser.id, 
        displayName: friendUser.displayName,
        email: friendUser.email,
        photoURL: friendUser.photoURL || null 
      }]);
      
      // Remove from search results and clear search term
      setSearchResults(searchResults.filter(result => result.id !== friendUser.id));
      setSearchTerm('');
    } catch (error) {
      console.error('Error adding friend:', error);
      setFriendsError('Failed to add friend. Please try again.');
    }
  };

  // Function to remove a friend
  const removeFriend = async (friendId) => {
    if (!user) return;
    
    try {
      // Remove from current user's friends collection
      await deleteDoc(doc(db, 'users', user.uid, 'friends', friendId));
      
      // Also remove current user from the friend's friends collection (bidirectional)
      await deleteDoc(doc(db, 'users', friendId, 'friends', user.uid));
      
      // Update local state
      setFriends(friends.filter(friend => friend.id !== friendId));
    } catch (error) {
      console.error('Error removing friend:', error);
      setFriendsError('Failed to remove friend. Please try again.');
    }
  };

  // Initial load of events for default city
  useEffect(() => {
    if (!searchPerformed) {
      loadEvents(city);
      setSearchPerformed(true);
    }
  }, [searchPerformed]);

  // Function to load events - extracted for reuse
  const loadEvents = async (searchCity) => {
    setLoading(true);
    setError(null);
    
    try {
      // Filter events by interest if user has preferences
      const userInterests = userPreferences.interests;
      
      // Try to fetch events by city
      let eventData = await fetchEvents(searchCity);
      
      // If no events found, try a broader search using the city name as keyword
      if (eventData.length === 0) {
        eventData = await searchEventsByKeyword(searchCity);
      }
      
      // Filter by user interests if they have any
      if (userInterests && userInterests.length > 0) {
        // Helper function to check if event matches user interests
        const matchesUserInterests = (event) => {
          if (!event.classifications || event.classifications.length === 0) {
            return false;
          }
          
          const segment = event.classifications[0].segment?.name?.toLowerCase() || '';
          const genre = event.classifications[0].genre?.name?.toLowerCase() || '';
          
          return userInterests.some(interest => {
            return segment.includes(interest) || genre.includes(interest);
          });
        };
        
        // First get events matching interests
        const matchingEvents = eventData.filter(matchesUserInterests);
        
        // Then get other events
        const otherEvents = eventData.filter(event => !matchesUserInterests(event));
        
        // Combine with matching events first
        eventData = [...matchingEvents, ...otherEvents];
      }
      
      setEvents(eventData);
      
      // Clear error if successful
      setError(null);
    } catch (error) {
      setError('Error fetching events. Please try again later.');
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const togglePopup = (popupId) => {
    if (showPopup === popupId) {
      setShowPopup(null);
      // Remove overlay when closing popup
      if (overlayRef.current) {
        overlayRef.current.classList.remove('show');
      }
    } else {
      setShowPopup(popupId);
      // Show overlay when opening popup
      if (overlayRef.current) {
        overlayRef.current.classList.add('show');
      }
    }
  };

  const handleSearch = () => {
    loadEvents(city);
  };

  // Handle friend search
  const handleFriendSearch = () => {
    searchUsers();
  };

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

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'Time TBD';
    const time = new Date(`1970-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  // Handle key press for search input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle key press for friend search input
  const handleFriendSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleFriendSearch();
    }
  };

  const handleViewAllEvents = () => {
    navigate('/events');
  };

  const handleViewLocalEvents = () => {
    navigate('/local-events');
  };

  // Get recommended events based on user interests
  const getRecommendedEvents = () => {
    if (!events || events.length === 0) return [];
    
    const userInterests = userPreferences.interests;
    
    if (!userInterests || userInterests.length === 0) {
      // Return first 3 events if no interests
      return events.slice(0, 3);
    }
    
    // Helper function to score events based on interests
    const scoreEvent = (event) => {
      if (!event.classifications || event.classifications.length === 0) {
        return 0;
      }
      
      const segment = event.classifications[0].segment?.name?.toLowerCase() || '';
      const genre = event.classifications[0].genre?.name?.toLowerCase() || '';
      
      let score = 0;
      userInterests.forEach(interest => {
        if (segment.includes(interest)) score += 2;
        if (genre.includes(interest)) score += 1;
      });
      
      return score;
    };
    
    // Score and sort events
    const scoredEvents = events.map(event => ({
      ...event,
      score: scoreEvent(event)
    }));
    
    // Sort by score (highest first)
    scoredEvents.sort((a, b) => b.score - a.score);
    
    // Return top 3
    return scoredEvents.slice(0, 3);
  };

  // Edit profile save handler
  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      // Update Firebase Auth profile
      await user.updateProfile({
        displayName: editDisplayName,
        photoURL: editPhotoURL
      });
      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: editDisplayName,
        photoURL: editPhotoURL
      });
      // Update local state
      setUser({ ...user, displayName: editDisplayName, photoURL: editPhotoURL });
      togglePopup(null);
    } catch (error) {
      alert('Failed to update profile.');
      console.error(error);
    }
  };

  return (
    <div className="main-container">
      {/* Overlay for popup background */}
      {showPopup && (
        <div ref={overlayRef} className="popup-overlay" onClick={() => setShowPopup(null)}></div>
      )}
      
      <div className="app-header">
        <div className="logo-section">
          <h1 className="app-title">FOMO FINDER</h1>
        </div>
        <div className="profile-actions">
          <button className="primary-button" onClick={() => togglePopup('friends')}>Add Friends</button>
          <button className="secondary-button" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
      
      <div className="user-welcome-section">
        <h2>Hi, {user?.displayName || "Event Explorer"}</h2>
        <p className="subtext">Discover exciting events near you</p>
      </div>

      <div className="content-container">
        <div className="left-sidebar">
          <div className="sidebar-section">
            <h3>Quick Navigation</h3>
            <ul className="nav-links">
              <li><button onClick={() => navigate('/')}>Home</button></li>
              <li><button onClick={handleViewLocalEvents}>Community Events</button></li>
              <li><button onClick={handleViewAllEvents}>Events API</button></li>
              <li><button onClick={() => togglePopup('settings')}>Settings</button></li>
            </ul>
          </div>
          
          <div className="sidebar-section">
            <h3>Your Interests</h3>
            <div className="interest-tags">
              {interestCategories.map(category => (
                <span 
                  key={category.id}
                  className={`interest-tag ${category.color} ${userPreferences.interests.includes(category.id) ? 'active' : ''}`}
                  onClick={() => toggleInterest(category.id)}
                >
                  {category.name}
                </span>
              ))}
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3>Saved Events</h3>
            {savedEventsLoading ? (
              <p>Loading saved events...</p>
            ) : savedEvents.length > 0 ? (
              <div className="saved-events-list">
                {savedEvents.slice(0, 3).map(event => (
                  <div key={event.id} className="saved-event-item">
                    <span className="saved-event-name">{event.name}</span>
                    <span className="saved-event-date">{formatDate(event.date)}</span>
                  </div>
                ))}
                {savedEvents.length > 3 && (
                  <button 
                    className="view-more-btn"
                    onClick={() => togglePopup('savedEvents')}
                  >
                    View all {savedEvents.length} saved events
                  </button>
                )}
              </div>
            ) : (
              <p>No saved events yet</p>
            )}
          </div>
        </div>

        <div className="main-content">
          <div className="search-container">
            <input
              type="text"
              placeholder="Enter city name"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyPress={handleKeyPress}
              className="city-input"
            />
            <button onClick={handleSearch} className="search-btn">
              Search Events
            </button>
            <button onClick={updateFavoriteCity} className="favorite-btn" title="Save as favorite city">
              ★
            </button>
          </div>

          <div className="section-header">
            <h3>Upcoming Events {city ? `in ${city}` : ''}</h3>
            <div className="help-icon">
              <img 
                src="/images/question4.png"
                width="30" 
                height="30" 
                onClick={() => togglePopup('question')}
                alt="Help"
                className="question-icon"
              />
            </div>
          </div>
          
          {loading && <p className="loading-text">Loading events...</p>}
          {error && <p className="error-text">{error}</p>}
          
          <div className="event-grid">
            {events && events.length > 0 ? (
              events.map((event) => (
                <div 
                  key={event.id} 
                  className={`event-card ${getEventCardClass(event)}`} 
                  onClick={() => togglePopup(`event-${event.id}`)}
                >
                  <div className="event-card-header">
                    <button 
                      className={`save-event-btn ${isEventSaved(event.id) ? 'saved' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent event card click
                        saveEvent(event);
                      }}
                      title={isEventSaved(event.id) ? "Remove from saved" : "Save event"}
                    >
                      {isEventSaved(event.id) ? '★' : '☆'}
                    </button>
                  </div>
                  <div className="event-card-content">
                    <span className="event-name">{event.name}</span>
                    {event.dates?.start?.localDate && (
                      <span className="event-date">{formatDate(event.dates.start.localDate)}</span>
                    )}
                    {event._embedded?.venues?.[0]?.name && (
                      <span className="event-venue">{event._embedded.venues[0].name}</span>
                    )}
                  </div>
                </div>
              ))
            ) : !loading && (
              <p className="no-events">No events found for {city}. Try searching for a different city or popular venue.</p>
            )}
          </div>
        </div>

        <div className="right-sidebar">
          <div className="sidebar-section">
            <h3>Your Profile</h3>
            <div className="profile-summary">
              <div className="avatar">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" />
                ) : (
                  <div className="avatar-placeholder">{user?.displayName?.charAt(0) || "?"}</div>
                )}
              </div>
              <div className="user-info">
                <p className="user-name">{user?.displayName || "Guest"}</p>
                <p className="user-email">{user?.email || ""}</p>
                <button 
                  className="edit-profile-btn"
                  onClick={() => togglePopup('editProfile')}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Your Friends</h3>
            <div className="friends-preview">
              {friendsLoading ? (
                <p>Loading friends...</p>
              ) : friends.length > 0 ? (
                <div className="friends-list-preview">
                  {friends.slice(0, 3).map(friend => (
                    <div key={friend.id} className="friend-preview-item">
                      <div className="friend-avatar">
                        {friend.photoURL ? (
                          <img src={friend.photoURL} alt={friend.displayName} />
                        ) : (
                          <div className="avatar-placeholder">{friend.displayName.charAt(0)}</div>
                        )}
                      </div>
                      <span>{friend.displayName}</span>
                    </div>
                  ))}
                  {friends.length > 3 && (
                    <button 
                      className="view-more-btn"
                      onClick={() => togglePopup('viewfriends')}
                    >
                      +{friends.length - 3} more
                    </button>
                  )}
                </div>
              ) : (
                <p>No friends added yet</p>
              )}
              <button 
                className="add-friends-btn"
                onClick={() => togglePopup('friends')}
              >
                Add Friends
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Recommended</h3>
            <div className="recommended-events">
              {getRecommendedEvents().map(event => (
                <div 
                  key={`rec-${event.id}`} 
                  className="recommended-event"
                  onClick={() => togglePopup(`event-${event.id}`)}
                >
                  <span className={`event-type ${getEventCardClass(event).replace('event-card-', '')}`}>
                    {event.classifications?.[0]?.segment?.name || 'Event'}
                  </span>
                  <p>{event.name}</p>
                </div>
              ))}
              {getRecommendedEvents().length === 0 && (
                <>
                  <div className="recommended-event">
                    <span className="event-type music">Music</span>
                    <p>Weekend Music Festival</p>
                  </div>
                  <div className="recommended-event">
                    <span className="event-type sports">Sports</span>
                    <p>Championship Game</p>
                  </div>
                  <div className="recommended-event">
                    <span className="event-type arts">Arts</span>
                    <p>Gallery Opening</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Popup Divs */}
      <div className="popup">
        {/* Settings Popup */}
        <div id="settings" className={`popupdiv ${showPopup === 'settings' ? 'show' : ''}`} style={{visibility: showPopup === 'settings' ? 'visible' : 'hidden', width: '400px'}}>
          <h3>Settings</h3>
          <hr />
          
          <div className="settings-section">
            <h4>Notification Preferences</h4>
            <div className="setting-toggle">
              <label>
                <input 
                  type="checkbox" 
                  checked={userPreferences.notificationEnabled} 
                  onChange={toggleNotifications}
                />
                Enable event notifications
              </label>
            </div>
          </div>
          
          <div className="settings-section">
            <h4>Default Location</h4>
            <p>Your favorite city: <strong>{userPreferences.favoriteCity || city}</strong></p>
            <div className="setting-input">
              <input
                type="text"
                placeholder="Change favorite city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="settings-city-input"
              />
              <button onClick={updateFavoriteCity}>Save</button>
            </div>
          </div>
          
          <div className="settings-section">
            <h4>Manage Account</h4>
            <button className="danger-button">Delete Account</button>
          </div>
          
          <button onClick={() => togglePopup('settings')} className="popupx">✖️</button>
        </div>

        {/* Edit Profile Popup */}
        <div id="editProfile" className={`popupdiv ${showPopup === 'editProfile' ? 'show' : ''}`} style={{visibility: showPopup === 'editProfile' ? 'visible' : 'hidden'}}>
          <h3>Edit Profile (Feature Under Construction)</h3>
          <hr />
          <div className="profile-edit-form">
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={editDisplayName}
                onChange={e => setEditDisplayName(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Profile Photo</label>
              <div className="profile-photo-upload">
                {editPhotoURL ? (
                  <img src={editPhotoURL} alt="Profile" />
                ) : (
                  <div className="avatar-placeholder">{editDisplayName?.charAt(0) || "?"}</div>
                )}
                <input
                  type="text"
                  value={editPhotoURL}
                  onChange={e => setEditPhotoURL(e.target.value)}
                  placeholder="Photo URL"
                />
                {/* You can add a file upload here if you want */}
              </div>
            </div>
            
            <div className="form-group">
              <button className="save-profile-btn" onClick={handleSaveProfile}>Save Changes</button>
            </div>
          </div>
          <button onClick={() => togglePopup('editProfile')} className="popupx">✖️</button>
        </div>

        {/* Friends Popup */}
        <div id="friends" className={`popupdiv ${showPopup === 'friends' ? 'show' : ''}`} style={{visibility: showPopup === 'friends' ? 'visible' : 'hidden', width: '500px'}}>
          <h3>Add & Manage Friends</h3>
          <hr />
          
          <div className="friends-search-section">
            <h4>Find Friends</h4>
            <div className="search-input-container">
              <input
                type="text"
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleFriendSearchKeyPress}
                className="friend-search-input"
              />
              <button 
                onClick={handleFriendSearch}
                className="friend-search-btn"
              >
                Search
              </button>
            </div>
            
            {friendsLoading && <p>Searching...</p>}
            {friendsError && <p className="error-text">{friendsError}</p>}
            
            {searchResults.length > 0 && (
              <div className="search-results">
                <h5>Search Results</h5>
                {searchResults.map(result => (
                  <div key={result.id} className="friend-result-item">
                    <div className="friend-info">
                      <div className="friend-avatar">
                        {result.photoURL ? (
                          <img src={result.photoURL} alt={result.displayName} />
                        ) : (
                          <div className="avatar-placeholder">{result.displayName.charAt(0)}</div>
                        )}
                      </div>
                      <div className="friend-details">
                        <span className="friend-name">{result.displayName}</span>
                        <span className="friend-email">{result.email}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => addFriend(result)}
                      className="add-friend-btn"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {searchTerm.length > 0 && searchResults.length === 0 && !friendsLoading && (
              <p className="no-results">No users found. Try a different search term.</p>
            )}
          </div>
          
          <div className="current-friends-section">
            <h4>Your Friends</h4>
            {friends.length > 0 ? (
              <div className="friends-list">
                {friends.map(friend => (
                  <div key={friend.id} className="friend-item">
                    <div className="friend-info">
                      <div className="friend-avatar">
                        {friend.photoURL ? (
                          <img src={friend.photoURL} alt={friend.displayName} />
                        ) : (
                          <div className="avatar-placeholder">{friend.displayName.charAt(0)}</div>
                        )}
                      </div>
                      <div className="friend-details">
                        <span className="friend-name">{friend.displayName}</span>
                        <span className="friend-email">{friend.email}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFriend(friend.id)}
                      className="remove-friend-btn"
                      title="Remove friend"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-friends">You haven't added any friends yet.</p>
            )}
          </div>
          
          <button onClick={() => togglePopup('friends')} className="popupx">✖️</button>
        </div>
        
        {/* View All Friends Popup */}
        <div id="viewfriends" className={`popupdiv ${showPopup === 'viewfriends' ? 'show' : ''}`} style={{visibility: showPopup === 'viewfriends' ? 'visible' : 'hidden', width: '500px'}}>
          <h3>Your Friends</h3>
          <hr />
          
          {friends.length > 0 ? (
            <div className="friends-list">
              {friends.map(friend => (
                <div key={friend.id} className="friend-item">
                  <div className="friend-info">
                    <div className="friend-avatar">
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.displayName} />
                      ) : (
                        <div className="avatar-placeholder">{friend.displayName.charAt(0)}</div>
                      )}
                    </div>
                    <div className="friend-details">
                      <span className="friend-name">{friend.displayName}</span>
                      <span className="friend-email">{friend.email}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-friends">You haven't added any friends yet.</p>
          )}
          
          <button onClick={() => togglePopup('viewfriends')} className="popupx">✖️</button>
        </div>
        
        {/* Saved Events Popup */}
        <div id="savedEvents" className={`popupdiv ${showPopup === 'savedEvents' ? 'show' : ''}`} style={{visibility: showPopup === 'savedEvents' ? 'visible' : 'hidden', width: '600px'}}>
          <h3>Your Saved Events</h3>
          <hr />
          
          {savedEvents.length > 0 ? (
            <div className="saved-events-full-list">
              {savedEvents.map(event => (
                <div key={event.id} className="saved-event-full-item">
                  <div className="saved-event-image">
                    {event.imageUrl ? (
                     <img 
                     src={event.imageUrl} 
                     alt={event.name} 
                     style={{ maxWidth: '300px', maxHeight: '300px' }} 
                   />
                    ) : (
                      <div className="event-image-placeholder"></div>
                    )}
                  </div>
                  <div className="saved-event-details">
                    <h4>{event.name}</h4>
                    <p className="saved-event-datetime">
                      {formatDate(event.date)} {formatTime(event.time)}
                    </p>
                    <p className="saved-event-venue">
                      {event.venue}, {event.city}
                    </p>
                    <div className="saved-event-actions">
                      <a href={event.url} target="_blank" rel="noopener noreferrer" className="event-tickets-btn">
                        View Details
                      </a>
                      <button 
                        onClick={() => removeSavedEvent(event.id)} 
                        className="remove-saved-btn"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-saved-events">You haven't saved any events yet.</p>
          )}
          
          <button onClick={() => togglePopup('savedEvents')} className="popupx">✖️</button>
        </div>
        
        {/* Question/Help Popup */}
        <div id="question" className={`popupdiv ${showPopup === 'question' ? 'show' : ''}`} style={{visibility: showPopup === 'question' ? 'visible' : 'hidden', width: '400px'}}>
          <h3>About Events</h3>
          <hr />
          
          <div className="help-content">
            <h4>Understanding the Event Colors</h4>
            <ul className="event-colors-guide">
              <li className="event-color-blue">Blue: Music Events</li>
              <li className="event-color-red">Red: Sports Events</li>
              <li className="event-color-yellow">Yellow: Arts & Theatre</li>
              <li className="event-color-green">Green: Family Events</li>
              <li className="event-color-purple">Purple: Other Events</li>
            </ul>
            
            <h4>Tips for Finding Events</h4>
            <ul className="event-tips">
              <li>Click on any event card to see more details</li>
              <li>Save events by clicking the star icon</li>
              <li>Search by city name to find local events</li>
              <li>Filter events by selecting interests in the sidebar</li>
              <li>Add friends to see what events they're interested in</li>
            </ul>
          </div>
          
          <button onClick={() => togglePopup('question')} className="popupx">✖️</button>
        </div>
        
        {/* Event Details Popups - Dynamically created for each event */}
        {events.map(event => (
          <div 
            key={`popup-${event.id}`}
            id={`event-${event.id}`} 
            className={`popupdiv ${showPopup === `event-${event.id}` ? 'show' : ''}`} 
            style={{visibility: showPopup === `event-${event.id}` ? 'visible' : 'hidden', width: '600px'}}
          >
            <h3>{event.name}</h3>
            <hr />
            
            <div className="event-popup-content">
              <div className="event-popup-main">
                <div className="event-popup-image">
                  {event.images && event.images[0] ? (
                    <img 
                    src={event.images[0].url} 
                    alt={event.name} 
                    style={{ maxWidth: '400px', maxHeight: '400px' }} 
                  />
                  
                  ) : (
                    <div className="event-image-placeholder"></div>
                  )}
                </div>
                
                <div className="event-popup-details">
                  <p className="event-popup-date">
                    <strong>Date:</strong> {event.dates?.start?.localDate ? formatDate(event.dates.start.localDate) : 'Date TBD'}
                  </p>
                  
                  <p className="event-popup-time">
                    <strong>Time:</strong> {event.dates?.start?.localTime ? formatTime(event.dates.start.localTime) : 'Time TBD'}
                  </p>
                  
                  <p className="event-popup-venue">
                    <strong>Venue:</strong> {event._embedded?.venues?.[0]?.name || 'Venue TBD'}
                  </p>
                  
                  <p className="event-popup-city">
                    <strong>City:</strong> {event._embedded?.venues?.[0]?.city?.name || 'City TBD'}
                  </p>
                  
                  {event.classifications && (
                    <p className="event-popup-type">
                      <strong>Type:</strong> {event.classifications[0]?.segment?.name || 'Various'} - {event.classifications[0]?.genre?.name || 'General'}
                    </p>
                  )}
                  
                  <div className="event-popup-buttons">
                    <a 
                      href={event.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="buy-tickets-btn"
                    >
                      Buy Tickets
                    </a>
                    
                    <button 
                      className={`save-event-popup-btn ${isEventSaved(event.id) ? 'saved' : ''}`}
                      onClick={() => saveEvent(event)}
                    >
                      {isEventSaved(event.id) ? 'Remove from Saved' : 'Save Event'}
                    </button>
                  </div>
                </div>
              </div>
              
              {event.info && (
                <div className="event-popup-info">
                  <h4>Event Information</h4>
                  <p>{event.info}</p>
                </div>
              )}
              
              {event.pleaseNote && (
                <div className="event-popup-notes">
                  <h4>Notes</h4>
                  <p>{event.pleaseNote}</p>
                </div>
              )}
              
              {event.priceRanges && (
                <div className="event-popup-price">
                  <h4>Price Range</h4>
                  <p>{event.priceRanges[0]?.min} - {event.priceRanges[0]?.max} {event.priceRanges[0]?.currency}</p>
                </div>
              )}
            </div>
            
            <button onClick={() => togglePopup(`event-${event.id}`)} className="popupx">✖️</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Profile;