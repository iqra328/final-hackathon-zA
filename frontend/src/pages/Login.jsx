import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { API_URL } from '../config/api';
import '../styles/global.css';
import '../styles/Login.css';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [is3DActive, setIs3DActive] = useState(true);
  const sceneRef = useRef(null);
  const canvasRef = useRef(null);
  const pointerTarget = useRef({ x: -0.6, y: 0.7 });
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const userParam = params.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/dashboard');
        window.location.reload();
      } catch (error) {
        console.error('Google auth error:', error);
        setError('Google authentication failed. Please try again.');
      }
    }
  }, [location, navigate]);

  useEffect(() => {
    const container = sceneRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    camera.position.z = 5.5;

    const group = new THREE.Group();
    scene.add(group);

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x7c3aed,
      emissive: 0x1d4ed8,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9,
    });

    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), material);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.82, 1.82, 1.82)),
      new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.8 })
    );
    group.add(cube, edges);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.06, 24, 160),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = Math.PI / 2.5;
    ring.rotation.y = Math.PI / 5;
    group.add(ring);

    const ring2 = ring.clone();
    ring2.scale.setScalar(0.72);
    ring2.material = new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.5 });
    ring2.rotation.x = Math.PI / 1.8;
    ring2.rotation.y = Math.PI / 2.7;
    group.add(ring2);

    const floaters = new THREE.Group();
    const geometry = new THREE.SphereGeometry(0.06, 12, 12);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    for (let i = 0; i < 18; i += 1) {
      const particle = new THREE.Mesh(geometry, particleMaterial);
      const angle = (i / 18) * Math.PI * 2;
      const radius = 2.4 + (i % 3) * 0.3;
      particle.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (i % 2 === 0 ? 1 : -1) * 1.2);
      floaters.add(particle);
    }
    group.add(floaters);

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      const width = Math.max(clientWidth, 320);
      const height = Math.max(clientHeight, 220);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const handlePointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      pointerTarget.current = {
        x: (0.5 - y) * 1.4,
        y: (x - 0.5) * 2.2,
      };
    };

    const resetPointer = () => {
      pointerTarget.current = { x: -0.6, y: 0.7 };
    };

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    const directionalLight = new THREE.DirectionalLight(0x93c5fd, 1.9);
    directionalLight.position.set(3, 3, 5);
    scene.add(ambientLight, directionalLight);

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', resetPointer);
    resize();
    window.addEventListener('resize', resize);

    const timer = new THREE.Timer();
    let animationFrame;

    const animate = () => {
      timer.update();
      const elapsed = timer.getElapsed();
      const speed = is3DActive ? 1 : 0.2;

      group.rotation.x += (pointerTarget.current.x - group.rotation.x) * 0.06 * speed;
      group.rotation.y += (pointerTarget.current.y - group.rotation.y) * 0.06 * speed;
      group.rotation.z = elapsed * 0.3 * speed;
      ring.rotation.z += 0.01 * speed;
      ring2.rotation.z -= 0.008 * speed;
      floaters.rotation.y += 0.004 * speed;
      floaters.rotation.x += 0.005 * speed;
      cube.rotation.x = elapsed * 0.8 * speed;
      cube.rotation.y = elapsed * 1.1 * speed;
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
      renderer.dispose();
      cube.geometry.dispose();
      cube.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
      ring2.geometry.dispose();
      ring2.material.dispose();
      geometry.dispose();
      particleMaterial.dispose();
      edges.geometry.dispose();
      edges.material.dispose();
    };
  }, [is3DActive]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(form.email, form.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  const fillDemo = (email, password) => {
    setForm({ email, password });
  };

  // Google Login Handler
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    // Redirect to Google OAuth
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <div className="login-page">
      {/* Background Orbs */}
      <div className="orb"></div>
      <div className="orb"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>

      <div className="login-container">
        {/* ===== LEFT SIDE ===== */}
        <div className="login-left">
          <div className="login-left-content">
            <div className="login-left-brand">
              <div className="login-left-brand-icon">🎫</div>
              <div>
                <div className="login-left-brand-text">
                  Support<span>Desk</span>
                </div>
                <span className="login-left-brand-sub">AI Powered Support</span>
              </div>
            </div>

            <h1 className="login-left-title">
              Welcome <span className="highlight">Back</span>
            </h1>
            <p className="login-left-desc">
              Sign in to manage your support tickets with AI-powered assistance.
            </p>

            <div className="login-visual">
              <div className="login-visual-header">
                <span className="mini-pill">Live Ops</span>
                <button
                  type="button"
                  className="scene-toggle"
                  onClick={() => setIs3DActive((prev) => !prev)}
                >
                  {is3DActive ? 'Pause 3D' : 'Resume 3D'}
                </button>
              </div>

              <div
                ref={sceneRef}
                className={`three-d-scene ${is3DActive ? 'is-active' : 'is-paused'}`}
              >
                <canvas ref={canvasRef} className="three-d-canvas" />
                <div className="scene-grid" />
                <div className="scene-ring scene-ring-one" />
                <div className="scene-ring scene-ring-two" />

                <div className="ticket-card ticket-card-one">
                  <div className="ticket-card-top">
                    <span className="ticket-dot" />
                    <small>Ticket #1042</small>
                  </div>
                  <strong>Billing escalated</strong>
                  <span>AI triage in 2 min</span>
                </div>

                <div className="ticket-card ticket-card-two">
                  <div className="ticket-card-top">
                    <span className="ticket-dot success" />
                    <small>AI Resolution</small>
                  </div>
                  <strong>89% confidence</strong>
                  <span>Customer satisfied</span>
                </div>

                <div className="floating-badge badge-one">AI Assist</div>
                <div className="floating-badge badge-two">+120%</div>
                <div className="floating-badge badge-three">Live</div>
              </div>

              <div className="login-visual-stats">
                <div>
                  <strong>24/7</strong>
                  <span>Support</span>
                </div>
                <div>
                  <strong>98.4%</strong>
                  <span>Satisfaction</span>
                </div>
                <div>
                  <strong>3.2x</strong>
                  <span>Faster</span>
                </div>
              </div>
            </div>

            <div className="login-left-features">
              <div className="login-left-feature">
                <span className="feature-icon">🤖</span> AI-Powered Analysis
              </div>
              <div className="login-left-feature">
                <span className="feature-icon">⚡</span> Real-time Updates
              </div>
              <div className="login-left-feature">
                <span className="feature-icon">🔒</span> Secure & Private
              </div>
              <div className="login-left-feature">
                <span className="feature-icon">📊</span> Smart Dashboard
              </div>
            </div>

            <div className="login-left-footer">
              <span className="login-left-footer-text">
                Don't have an account? <Link to="/register">Sign up</Link>
              </span>
            </div>
          </div>
        </div>

        {/* ===== RIGHT SIDE ===== */}
        <div className="login-right">
          <div className="login-right-header">
            <h2 className="login-right-title">
              Sign In to <span>Your Account</span>
            </h2>
            <p className="login-right-subtitle">Welcome back! Please enter your details.</p>
          </div>

          {/* Social Login */}
          <div className="login-social">
            <button 
              className="login-social-btn google-btn" 
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <span className="social-icon" aria-hidden="true">G</span>
                  Google
                </>
              )}
            </button>
            <button 
              className="login-social-btn github-btn" 
              type="button"
              onClick={() => {
                // GitHub OAuth can be added similarly
                alert('GitHub authentication coming soon!');
              }}
            >
              <span className="social-icon" aria-hidden="true">GH</span>
              GitHub
            </button>
          </div>

          <div className="login-divider">or continue with email</div>

          {/* Error */}
          {error && (
            <div className="login-error">
              <span className="login-error-icon">⚠️</span> {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-form-group">
              <label className="login-label">
                Email Address
                <span className="login-label-optional">required</span>
              </label>
              <div className="login-input-wrapper">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="login-input"
                  required
                  placeholder="you@example.com"
                />
                <span className="login-input-icon">📧</span>
              </div>
            </div>

            <div className="login-form-group">
              <label className="login-label">
                Password
                <span className="login-label-optional">required</span>
              </label>
              <div className="login-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="login-input"
                  required
                  placeholder="••••••••"
                />
                <span className="login-input-icon">🔒</span>
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="login-forgot">
              <Link to="/forgot-password" className="login-forgot-link">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="login-submit-btn">
              <span>{loading ? <LoadingSpinner size="sm" /> : 'Sign In'}</span>
              <span className="btn-arrow">→</span>
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="login-demo">
            <div className="login-demo-title">🚀 Quick Demo Access</div>
            <div className="login-demo-grid">
              <div className="login-demo-item" onClick={() => fillDemo('customer@test.com', '123456')}>
                <strong>👤 Customer</strong>
                <span>customer@test.com</span>
              </div>
              <div className="login-demo-item" onClick={() => fillDemo('agent@test.com', '123456')}>
                <strong>🎯 Agent</strong>
                <span>agent@test.com</span>
              </div>
              <div className="login-demo-item" onClick={() => fillDemo('worker@test.com', '123456')}>
                <strong>🔧 Worker</strong>
                <span>worker@test.com</span>
              </div>
              <div className="login-demo-item" onClick={() => fillDemo('admin@test.com', '123456')}>
                <strong>👑 Admin</strong>
                <span>admin@test.com</span>
              </div>
            </div>
          </div>

          <div className="login-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;