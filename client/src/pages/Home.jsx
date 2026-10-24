import './Home.css'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

import {
  ArrowRightIcon,
  UserIcon,
  CalendarIcon,
  LockIcon,
  PillIcon,
} from '../components/icons.jsx'

const FEATURES = [
  {
    to: '/profile',
    Icon: UserIcon,
    title: 'Patient Profile',
    description:
      'Manage your personal details, allergies, emergency contacts and medical history.',
    action: 'Go to profile',
  },
  {
    to: '/medicines',
    Icon: PillIcon,
    title: 'Medicine & Prescription',
    description:
      'Explore medicines, check usage and side effects, and manage prescriptions.',
    action: 'Explore medicines',
  },
  {
    to: '/appointments',
    Icon: CalendarIcon,
    title: 'Appointments',
    description:
      'Book, reschedule and track your upcoming appointments in one place.',
    action: 'View appointments',
  },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <main className="home-page space-y-8">

      {/* HERO SECTION */}
      <section className="home-hero">

        {/* LEFT TEXT SECTION */}
        <div className="home-hero-content">

          <span className="home-badge">
            <span className="home-badge-dot" />
            YOUR HEALTH, SIMPLIFIED
          </span>

          <h1 className="home-hero-title">
            Your health,
            <br />
            all in one place.
          </h1>

          <p className="home-hero-description">
            Manage medicines, prescriptions and appointments
            with a little help from AI.
          </p>

          <div className="home-hero-actions">
            {user ? (
              <Link to="/profile" className="home-primary-button">
                Open workspace
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="home-primary-button">
                  <LockIcon className="h-4 w-4" />
                  Login
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>

                <Link to="/register" className="home-secondary-button">
                  Register
                </Link>
              </>
            )}
          </div>

          <div className="home-trust-row">
            <span className="home-shield">✓</span>
            <span>Simple</span>
            <span className="home-trust-dot">•</span>
            <span>Secure</span>
            <span className="home-trust-dot">•</span>
            <span>Connected care</span>
          </div>

          {user && (
            <p className="home-welcome">
              Welcome back,{' '}
              <strong>
                {user.fullName || user.email}
              </strong>
              . Your workspace is ready.
            </p>
          )}
        </div>

        {/* RIGHT MEDICAL IMAGE */}
        <div className="home-hero-image">
          <img
            src="/medical-hero.jpg"
            alt="Blue medical cross, stethoscope and medicine capsule"
          />
        </div>
      </section>

      {/* FEATURE SECTION */}
      <section aria-labelledby="explore-heading">

        <div className="home-section-heading">
          <div>
            <h2 id="explore-heading">
              Explore your care
            </h2>
            <p>
              Everything you need for your healthcare, in one place.
            </p>
          </div>
        </div>

        <div className="home-feature-grid">
          {FEATURES.map(
            ({ to, Icon, title, description, action }) => (
              <Link
                key={to}
                to={to}
                className="home-feature-card"
              >
                <span className="home-feature-icon">
                  <Icon className="h-7 w-7" />
                </span>

                <h3>{title}</h3>

                <p>{description}</p>

                <span className="home-feature-action">
                  {action}
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            ),
          )}
        </div>
      </section>
    </main>
  )
}
