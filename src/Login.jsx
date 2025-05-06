import {
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth, provider } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import '../styles/login.css';

function Login() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const particlesRef = useRef(null);
  const navigate = useNavigate();
  
  // Create particle animation
  useEffect(() => {
    if (particlesRef.current) {
      const container = particlesRef.current;
      container.innerHTML = '';
      
      // Create 50 particles
      for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Randomize particle properties
        const size = Math.random() * 3 + 1;
        const duration = Math.random() * 10 + 5;
        const x = (Math.random() - 0.5) * window.innerWidth * 0.7;
        const y = (Math.random() - 0.5) * window.innerHeight * 0.7;
        const delay = Math.random() * 5;
        const opacity = Math.random() * 0.5 + 0.1;
        
        // Apply custom properties
        particle.style.setProperty('--duration', `${duration}s`);
        particle.style.setProperty('--x', `${x}px`);
        particle.style.setProperty('--y', `${y}px`);
        particle.style.setProperty('--opacity', opacity);
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.animationDelay = `${delay}s`;
        
        // Randomize starting position
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        container.appendChild(particle);
      }
    }
  }, [loading]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser);
      if (currentUser) {
        setUser(currentUser);
        navigate('/profile');
      } else {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);
  
  const login = async (method = 'default') => {
    try {
      // Add login button animation
      const buttonEl = document.querySelector('.login-btn');
      if (buttonEl) {
        buttonEl.classList.add('clicked');
        setTimeout(() => buttonEl.classList.remove('clicked'), 500);
      }
      
      // Set persistence before the login attempt
      await setPersistence(auth, browserLocalPersistence);
      
      // Check if it's a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Use signInWithRedirect on mobile, signInWithPopup on desktop
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
      
      // Log which button was used for analytics purposes
      console.log(`Login initiated via: ${method}`);
    } catch (error) {
      console.error('Login failed:', error.message);
      // Show error animation/feedback
      const buttonEl = document.querySelector('.login-btn');
      if (buttonEl) {
        buttonEl.classList.add('error');
        setTimeout(() => buttonEl.classList.remove('error'), 1000);
      }
    }
  };
  
  if (loading) return (
    <div className="loading-container">
      <div className="loader">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p>Loading experience...</p>
    </div>
  );
  
  return (
    <div className="login-page">
      {/* Background particles */}
      <div className="particles" ref={particlesRef}></div>
      
      <div className="login-container">
        <div className="title-wrapper">
          <h1 className="title" data-text="FOMO FINDER">FOMO FINDER</h1>
        </div>
        
        <img src="/images/favicon.png" className="logo-circle" alt="logo" />
        
        <div className="login-description">
          <p>Never miss out on exciting events again!</p>
          <p>Find and track the hottest happenings in your city.</p>
        </div>
        
        <button 
          className="login-btn" 
          onClick={() => login('main-button')}
        >
          Log In with Google
        </button>
        
        <div className="auth-links">
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              login('signup-link');
            }}
          >
            Sign Up with Google
          </a>
          <span className="divider">|</span>
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              login('another-account-link');
            }}
          >
            Use Another Account
          </a>
        </div>
        
        <div className="app-features">
          <div className="feature">
            <div className="feature-icon">🔍</div>
            <div className="feature-text">
              <h3>Discover Events</h3>
              <p>Find the most exciting events happening near you with our advanced search and filtering tools.</p>
            </div>
          </div>
          
          <div className="feature">
            <div className="feature-icon">🔔</div>
            <div className="feature-text">
              <h3>Get Notified</h3>
              <p>Set up alerts and never miss out on tickets, special offers, or your favorite performers coming to town.</p>
            </div>
          </div>
          
          <div className="feature">
            <div className="feature-icon">👥</div>
            <div className="feature-text">
              <h3>Connect with Friends</h3>
              <p>See which events your friends are attending and organize group outings with our social features.</p>
            </div>
          </div>
        </div>
        
        <div className="testimonials">
          <div className="testimonial">
            <div className="quote">"FOMO Finder completely changed how I discover local events. I've found amazing concerts I would have missed!"</div>
            <div className="author">- Alex M.</div>
          </div>
        </div>
        
        <footer className="login-footer">
          <div className="footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            <span className="divider">|</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            <span className="divider">|</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Contact Us</a>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} FOMO Finder. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Login;