import React, { useState, useEffect, useRef } from 'react';
import './RSVPForm.css';
import teamMembers from '../members.json';

const RSVPForm = () => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    attending: 'yes',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef(null);

  const handleSelectMember = (member) => {
    setSelectedMember(member);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      alert("Please select a team member first!");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          attending: formData.attending,
          message: formData.message,
        }),
      });

      let result = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          result = await response.json();
        } catch (e) {
          console.error('Failed to parse JSON response:', e);
        }
      } else {
        const text = await response.text();
        console.warn('Non-JSON response received:', text);
      }

      if (!response.ok) {
        throw new Error(result.error || `Failed to submit RSVP (Status ${response.status})`);
      }

      setSubmitted(true);
    } catch (error) {
      console.error('RSVP submission error:', error);
      alert(`Error submitting RSVP: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSelectedMember(null);
    setFormData({ attending: 'yes', message: '' });
  };

  // Canvas Fireworks Effect for "Yes" response
  useEffect(() => {
    if (submitted && formData.attending === 'yes' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      let animationFrameId;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', handleResize);

      // Firework particles
      class Particle {
        constructor(x, y, color) {
          this.x = x;
          this.y = y;
          this.color = color;
          this.radius = Math.random() * 3 + 1;
          this.velocity = {
            x: (Math.random() - 0.5) * 8,
            y: (Math.random() - 0.5) * 8
          };
          this.alpha = 1;
          this.decay = Math.random() * 0.015 + 0.015;
        }

        draw() {
          ctx.save();
          ctx.globalAlpha = this.alpha;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
          ctx.fillStyle = this.color;
          ctx.fill();
          ctx.restore();
        }

        update() {
          this.velocity.y += 0.05; // gravity
          this.x += this.velocity.x;
          this.y += this.velocity.y;
          this.alpha -= this.decay;
        }
      }

      class Firework {
        constructor(x, y, targetY, color) {
          this.x = x;
          this.y = y;
          this.targetY = targetY;
          this.color = color;
          this.velocity = {
            x: 0,
            y: -8
          };
          this.particles = [];
          this.dead = false;
        }

        draw() {
          ctx.beginPath();
          ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = this.color;
          ctx.fill();
        }

        update() {
          this.y += this.velocity.y;
          if (this.y <= this.targetY) {
            this.explode();
            this.dead = true;
          }
        }

        explode() {
          const colors = ['#dfb15b', '#ff4d4d', '#33d9b2', '#ffda79', '#34ace0', '#ffb142'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          for (let i = 0; i < 40; i++) {
            this.particles.push(new Particle(this.x, this.y, randomColor));
          }
        }
      }

      let fireworks = [];
      let activeParticles = [];

      const spawnFirework = () => {
        const x = Math.random() * canvas.width;
        const y = canvas.height;
        const targetY = Math.random() * (canvas.height * 0.5);
        const colors = ['#dfb15b', '#ff4d4d', '#33d9b2', '#ffda79'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        fireworks.push(new Firework(x, y, targetY, color));
      };

      const animate = () => {
        ctx.fillStyle = 'rgba(11, 32, 70, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (Math.random() < 0.05) {
          spawnFirework();
        }

        fireworks.forEach((firework, index) => {
          firework.update();
          if (firework.dead) {
            activeParticles.push(...firework.particles);
            fireworks.splice(index, 1);
          } else {
            firework.draw();
          }
        });

        activeParticles.forEach((particle, index) => {
          particle.update();
          if (particle.alpha <= 0) {
            activeParticles.splice(index, 1);
          } else {
            particle.draw();
          }
        });

        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [submitted, formData.attending]);

  if (submitted) {
    return (
      <section className={`rsvp-result-section ${formData.attending === 'yes' ? 'success-bg' : 'sad-bg'}`}>
        {formData.attending === 'yes' && <canvas ref={canvasRef} className="fireworks-canvas" />}
        
        <div className="container text-center response-container">
          {formData.attending === 'yes' ? (
            <div className="response-card success-card animate-fade-in">
              <span className="celebrate-emoji">🎓✨🎉</span>
              <h2 className="text-gold">Wonderful!</h2>
              <p className="response-text">
                Thank you, <strong>{selectedMember.name}</strong>! {selectedMember.successMsg}
              </p>
              {formData.message && (
                <div className="user-message-preview">
                  <p className="message-label">Your message to the team:</p>
                  <p className="message-content">"{formData.message}"</p>
                </div>
              )}
              <button className="btn-secondary" onClick={handleReset}>Back to RSVP</button>
            </div>
          ) : (
            <div className="response-card sad-card animate-fade-in">
              <span className="sad-emoji">😢💧</span>
              <h2 className="sad-title">We'll Miss You!</h2>
              <p className="response-text">
                Oh no, <strong>{selectedMember.name}</strong>. {selectedMember.sadMsg}
              </p>
              <div className="rain-container">
                <div className="rain-drop" style={{ left: '10%' }}></div>
                <div className="rain-drop" style={{ left: '30%', animationDelay: '0.2s' }}></div>
                <div className="rain-drop" style={{ left: '50%', animationDelay: '0.5s' }}></div>
                <div className="rain-drop" style={{ left: '70%', animationDelay: '0.1s' }}></div>
                <div className="rain-drop" style={{ left: '90%', animationDelay: '0.4s' }}></div>
              </div>
              <button className="btn-secondary" onClick={handleReset}>Change RSVP</button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="rsvp-section">
      <div className="container">
        <h2 className="section-title text-center text-gold">RSVP</h2>
        
        <div className="form-wrapper">
          <form onSubmit={handleSubmit} className="rsvp-form">
            
            {/* Visual Team Member Grid */}
            <div className="form-group">
              <label className="section-label">Select Your Name</label>
              <div className="team-grid">
                {teamMembers.map((member) => (
                  <div 
                    key={member.id} 
                    className={`member-card ${selectedMember?.id === member.id ? 'selected' : ''}`}
                    onClick={() => handleSelectMember(member)}
                  >
                    <div className="member-avatar-wrapper">
                      <img 
                        src={`/team-photos/${member.id}.jpg`} 
                        alt={member.name} 
                        className="member-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          // Try loading png before going to fallback avatar API
                          if (e.target.src.endsWith('.jpg')) {
                            e.target.src = `/team-photos/${member.id}.png`;
                          } else {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0b2046&color=dfb15b&size=200&bold=true`;
                          }
                        }}
                      />
                    </div>
                    <div className="member-info">
                      <h4>{member.name}</h4>
                      <p>{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label className="section-label">Will you be attending?</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="attending" 
                    value="yes" 
                    checked={formData.attending === 'yes'} 
                    onChange={handleChange} 
                  />
                  <span>Yes, I will be there! 🥳</span>
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="attending" 
                    value="no" 
                    checked={formData.attending === 'no'} 
                    onChange={handleChange} 
                  />
                  <span>Sorry, I can't make it 😢</span>
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="message" className="section-label">Leave a message for the team (Optional)</label>
              <textarea 
                id="message" 
                name="message" 
                rows="4" 
                value={formData.message} 
                onChange={handleChange}
                placeholder="Congratulations! The best is yet to come!"
              ></textarea>
            </div>
            
            <button 
              type="submit" 
              className="btn-submit"
              disabled={!selectedMember || isSubmitting}
            >
              {isSubmitting ? 'Saving RSVP...' : `Confirm RSVP ${selectedMember ? `as ${selectedMember.name}` : ''}`}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default RSVPForm;
