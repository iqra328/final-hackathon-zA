import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/global.css';
import '../styles/Register.css';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [is3DActive, setIs3DActive] = useState(true);
  const sceneRef = useRef(null);
  const canvasRef = useRef(null);
  const pointerTarget = useRef({ x: -0.35, y: 0.65 });
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const container = sceneRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    camera.position.z = 6;

    const group = new THREE.Group();
    scene.add(group);

    const cubeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2563eb,
      emissive: 0x172554,
      roughness: 0.18,
      metalness: 0.75,
      transparent: true,
      opacity: 0.92,
    });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 1.7), cubeMaterial);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.9,
    });
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.74, 1.74, 1.74)),
      edgeMaterial
    );
    group.add(cube, edges);

    const ringGeometry = new THREE.TorusGeometry(2.35, 0.055, 20, 128);
    const ring = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = Math.PI / 2.3;
    ring.rotation.y = Math.PI / 5;
    group.add(ring);

    const ringTwo = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.04, 16, 96),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.65 })
    );
    ringTwo.rotation.x = Math.PI / 1.7;
    ringTwo.rotation.y = Math.PI / 3;
    group.add(ringTwo);

    const particles = new THREE.Group();
    const particleGeometry = new THREE.SphereGeometry(0.045, 10, 10);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    for (let index = 0; index < 22; index += 1) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      const angle = (index / 22) * Math.PI * 2;
      const radius = 2.1 + (index % 4) * 0.22;
      particle.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        (index % 2 === 0 ? 1 : -1) * (0.7 + (index % 3) * 0.25)
      );
      particles.add(particle);
    }
    group.add(particles);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    const keyLight = new THREE.DirectionalLight(0x93c5fd, 2);
    keyLight.position.set(3, 3, 5);
    scene.add(ambientLight, keyLight);

    const resize = () => {
      const width = Math.max(container.clientWidth, 280);
      const height = Math.max(container.clientHeight, 220);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const handlePointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      pointerTarget.current = { x: (0.5 - y) * 1.2, y: (x - 0.5) * 1.8 };
    };

    const resetPointer = () => {
      pointerTarget.current = { x: -0.35, y: 0.65 };
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', resetPointer);
    window.addEventListener('resize', resize);
    resize();

    const timer = new THREE.Timer();
    let animationFrame;
    const animate = () => {
      timer.update();
      const elapsed = timer.getElapsed();
      const speed = is3DActive ? 1 : 0.16;
      group.rotation.x += (pointerTarget.current.x - group.rotation.x) * 0.055 * speed;
      group.rotation.y += (pointerTarget.current.y - group.rotation.y) * 0.055 * speed;
      group.rotation.z = elapsed * 0.22 * speed;
      cube.rotation.x = elapsed * 0.7 * speed;
      cube.rotation.y = elapsed * 0.95 * speed;
      ring.rotation.z += 0.009 * speed;
      ringTwo.rotation.z -= 0.012 * speed;
      particles.rotation.y += 0.003 * speed;
      particles.rotation.x += 0.002 * speed;
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      cube.geometry.dispose();
      cube.material.dispose();
      edges.geometry.dispose();
      edges.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
      ringTwo.geometry.dispose();
      ringTwo.material.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, [is3DActive]);

  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', class: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (score <= 1) return { score, label: 'Weak', class: 'weak' };
    if (score <= 2) return { score, label: 'Medium', class: 'medium' };
    if (score <= 3) return { score, label: 'Strong', class: 'strong' };
    return { score, label: 'Very Strong', class: 'strong' };
  };

  const passwordStrength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!termsAccepted) {
      setError('Please accept the Terms & Conditions');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(form.name, form.email, form.password, form.role);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } else {
      setError(result.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="register-page">
      {/* Floating Elements */}
      <div className="floating-element"></div>
      <div className="floating-element"></div>
      <div className="floating-element"></div>

      <div className="register-container">
        {/* ===== LEFT SIDE - BRAND ===== */}
        <div className="register-left">
          <div className="register-left-content">
            {/* Brand */}
            <div className="register-left-brand">
              <div className="register-left-brand-icon">🎫</div>
              <div>
                <div className="register-left-brand-text">
                  Support<span>Desk</span>
                </div>
                <span className="register-left-brand-sub">AI Powered Support</span>
              </div>
            </div>

            {/* Hero */}
            <h1 className="register-left-title">
              Create your <br />
              <span className="highlight">Account</span> today
            </h1>
            <p className="register-left-desc">
              Join thousands of users managing their support tickets with AI-powered assistance.
            </p>

            <div className="register-visual">
              <div className="register-visual-header">
                <span className="register-live-pill"><span /> Workspace ready</span>
                <button
                  type="button"
                  className="register-scene-toggle"
                  onClick={() => setIs3DActive((previous) => !previous)}
                >
                  {is3DActive ? 'Pause motion' : 'Resume motion'}
                </button>
              </div>
              <div
                ref={sceneRef}
                className={`register-three-scene ${is3DActive ? 'is-active' : 'is-paused'}`}
              >
                <canvas ref={canvasRef} className="register-three-canvas" />
                <div className="register-scene-grid" />
                <div className="register-scene-label register-scene-label-one">AI triage</div>
                <div className="register-scene-label register-scene-label-two">Secure access</div>
              </div>
              <div className="register-visual-stats">
                <div><strong>24/7</strong><span>Coverage</span></div>
                <div><strong>98.4%</strong><span>Resolution</span></div>
                <div><strong>&lt; 2m</strong><span>First reply</span></div>
              </div>
            </div>

            {/* Features */}
            <div className="register-left-features">
              <div className="register-left-feature">
                <span className="feature-icon">🤖</span>
                AI-Powered Analysis
              </div>
              <div className="register-left-feature">
                <span className="feature-icon">⚡</span>
                Real-time Updates
              </div>
              <div className="register-left-feature">
                <span className="feature-icon">🔒</span>
                Secure & Private
              </div>
              <div className="register-left-feature">
                <span className="feature-icon">📊</span>
                Smart Dashboard
              </div>
            </div>

            {/* Footer */}
            <div className="register-left-footer">
              <span className="register-left-footer-text">
                Already have an account? <Link to="/login">Sign in</Link>
              </span>
            </div>
          </div>
        </div>

        {/* ===== RIGHT SIDE - FORM ===== */}
        <div className="register-right">
          <div className="register-right-header">
            <h2 className="register-right-title">
              Get Started <span>Free</span>
            </h2>
            <p className="register-right-subtitle">Create your account in seconds</p>
          </div>

          {/* Social */}
          <div className="register-social">
            <button className="register-social-btn" type="button">
              <span className="social-icon" aria-hidden="true">G</span>
              Google
            </button>
            <button className="register-social-btn" type="button">
              <span className="social-icon" aria-hidden="true">GH</span>
              GitHub
            </button>
          </div>

          <div className="register-divider">or continue with email</div>

          {/* Error/Success */}
          {error && (
            <div className="register-error">
              <span className="register-error-icon">⚠️</span> {error}
            </div>
          )}
          {success && (
            <div className="register-success">
              <span className="register-success-icon">✅</span> 
              Registration successful! Redirecting...
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="register-form">
            <div className="register-form-row">
              <div className="register-form-group">
                <label className="register-label">
                  Full Name <span className="register-label-required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="register-input"
                    required
                    placeholder="John Doe"
                  />
                  <span className="register-input-icon">👤</span>
                </div>
              </div>

              <div className="register-form-group">
                <label className="register-label">
                  Email <span className="register-label-required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="register-input"
                    required
                    placeholder="you@email.com"
                  />
                  <span className="register-input-icon">📧</span>
                </div>
              </div>
            </div>

            <div className="register-form-row">
              <div className="register-form-group">
                <label className="register-label">
                  Password <span className="register-label-required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="register-input"
                    required
                    placeholder="Min 6 characters"
                  />
                  <span className="register-input-icon">🔒</span>
                  <span 
                    className="register-input-icon register-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </span>
                </div>
                {form.password && (
                  <div className="register-password-strength">
                    <div className="register-strength-bars">
                      {[...Array(4)].map((_, i) => (
                        <div 
                          key={i}
                          className={`register-strength-bar ${i < passwordStrength.score ? `active ${passwordStrength.class}` : ''}`}
                        ></div>
                      ))}
                    </div>
                    <span className={`register-strength-text ${passwordStrength.class}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="register-form-group">
                <label className="register-label">
                  Confirm Password <span className="register-label-required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className={`register-input ${
                      form.confirmPassword && form.password === form.confirmPassword ? 'success' : 
                      form.confirmPassword && form.password !== form.confirmPassword ? 'error' : ''
                    }`}
                    required
                    placeholder="Confirm password"
                  />
                  <span className="register-input-icon">🔐</span>
                  <span 
                    className="register-input-icon register-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </span>
                </div>
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <span className="register-match-success">✅ Passwords match</span>
                )}
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <span className="register-match-error">❌ Passwords don't match</span>
                )}
              </div>
            </div>

            <div className="register-form-group">
              <label className="register-label">Register as</label>
              <div className="register-select-wrapper">
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="register-select"
                >
                  <option value="customer">👤 Customer</option>
                  <option value="agent">🎯 Support Agent</option>
                  <option value="worker">🔧 Service Worker</option>
                  <option value="admin">👑 Administrator</option>
                </select>
                <span className="register-select-icon">▼</span>
              </div>
              {form.role && (
                <span className={`register-role-badge ${form.role}`}>
                  {form.role === 'customer' ? '👤 Customer' : 
                   form.role === 'agent' ? '🎯 Agent' : 
                   form.role === 'worker' ? '🔧 Worker' : '👑 Admin'}
                </span>
              )}
            </div>

            <div className="register-terms">
              <input 
                type="checkbox" 
                id="terms" 
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <label htmlFor="terms">
                I agree to the <a href="#">Terms & Conditions</a> and <a href="#">Privacy Policy</a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="register-submit-btn"
            >
              <span>{loading ? <LoadingSpinner size="sm" /> : 'Create Account'}</span>
              <span className="btn-arrow">→</span>
            </button>
          </form>

          <div className="register-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;