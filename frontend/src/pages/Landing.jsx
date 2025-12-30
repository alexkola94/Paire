import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    FiDollarSign,
    FiUsers,
    FiPieChart,
    FiTarget,
    FiBell,
    FiShoppingCart,
    FiArrowRight,
    FiCheck,
    FiTrendingUp,
    FiShield,
    FiSmartphone
} from 'react-icons/fi'
import { publicStatsService } from '../services/api'
import './Landing.css'

/**
 * Landing Page Component
 * Beautiful, modern landing page showcasing app features
 */
function Landing() {
    const { t } = useTranslation()

    // Platform statistics state
    const [stats, setStats] = useState({
        formattedUsers: '0',
        formattedTransactions: '0',
        formattedMoneySaved: '€0'
    })

    // Fetch real statistics on component mount
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await publicStatsService.getStats()
                setStats({
                    formattedUsers: data.formattedUsers || '0',
                    formattedTransactions: data.formattedTransactions || '0',
                    formattedMoneySaved: data.formattedMoneySaved || '€0'
                })
            } catch (error) {
                console.error('Failed to fetch public stats:', error)
                // Keep default values on error
            }
        }
        fetchStats()
    }, [])

    const features = [
        {
            icon: <FiDollarSign />,
            title: t('landing.features.tracking.title'),
            description: t('landing.features.tracking.description'),
            gradient: 'gradient-1'
        },
        {
            icon: <FiUsers />,
            title: t('landing.features.partnership.title'),
            description: t('landing.features.partnership.description'),
            gradient: 'gradient-2'
        },
        {
            icon: <FiPieChart />,
            title: t('landing.features.analytics.title'),
            description: t('landing.features.analytics.description'),
            gradient: 'gradient-3'
        },
        {
            icon: <FiTarget />,
            title: t('landing.features.budgets.title'),
            description: t('landing.features.budgets.description'),
            gradient: 'gradient-4'
        },
        {
            icon: <FiBell />,
            title: t('landing.features.reminders.title'),
            description: t('landing.features.reminders.description'),
            gradient: 'gradient-5'
        },
        {
            icon: <FiShoppingCart />,
            title: t('landing.features.shopping.title'),
            description: t('landing.features.shopping.description'),
            gradient: 'gradient-6'
        }
    ]

    const steps = [
        {
            number: '01',
            title: t('landing.howItWorks.step1.title'),
            description: t('landing.howItWorks.step1.description'),
            icon: <FiUsers />
        },
        {
            number: '02',
            title: t('landing.howItWorks.step2.title'),
            description: t('landing.howItWorks.step2.description'),
            icon: <FiDollarSign />
        },
        {
            number: '03',
            title: t('landing.howItWorks.step3.title'),
            description: t('landing.howItWorks.step3.description'),
            icon: <FiTrendingUp />
        }
    ]

    return (
        <div className="landing-page">
            {/* Floating Background Elements */}
            <div className="floating-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
                <div className="shape shape-4"></div>
                <div className="shape shape-5"></div>
            </div>

            {/* Navigation */}
            <nav className="landing-nav">
                <div className="nav-container">
                    <div className="nav-brand">
                        <img
                            src={`${import.meta.env.BASE_URL}paire-logo.svg`}
                            alt="Paire Logo"
                            className="nav-logo"
                            width="40"
                            height="40"
                        />
                        <span className="nav-title">{t('app.title')}</span>
                    </div>
                    <div className="nav-actions">
                        <Link to="/login" className="nav-link">
                            {t('auth.login')}
                        </Link>
                        <Link to="/login?mode=signup" className="nav-btn-primary">
                            {t('landing.hero.getStarted')}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="hero-content">
                    <div className="hero-badge">
                        <FiShield size={14} />
                        <span>{t('landing.hero.badge')}</span>
                    </div>
                    <h1 className="hero-title">
                        {t('landing.hero.title')}
                    </h1>
                    <p className="hero-subtitle">
                        {t('landing.hero.subtitle')}
                    </p>
                    <div className="hero-actions">
                        <Link to="/login?mode=signup" className="btn-hero-primary">
                            {t('landing.hero.getStarted')}
                            <FiArrowRight />
                        </Link>
                        <Link to="/login" className="btn-hero-secondary">
                            {t('landing.hero.login')}
                        </Link>
                    </div>
                    <div className="hero-trust">
                        <div className="trust-item">
                            <FiCheck className="trust-check" />
                            <span>{t('landing.hero.trust1')}</span>
                        </div>
                        <div className="trust-item">
                            <FiCheck className="trust-check" />
                            <span>{t('landing.hero.trust2')}</span>
                        </div>
                        <div className="trust-item">
                            <FiCheck className="trust-check" />
                            <span>{t('landing.hero.trust3')}</span>
                        </div>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="hero-phone">
                        <div className="phone-frame">
                            <div className="phone-screen">
                                <div className="mock-header">
                                    <div className="mock-logo"></div>
                                    <div className="mock-balance">
                                        <span className="mock-label">Balance</span>
                                        <span className="mock-amount">€2,450.00</span>
                                    </div>
                                </div>
                                <div className="mock-cards">
                                    <div className="mock-card income">
                                        <FiTrendingUp />
                                        <div>
                                            <span className="mock-card-label">Income</span>
                                            <span className="mock-card-value">+€3,200</span>
                                        </div>
                                    </div>
                                    <div className="mock-card expense">
                                        <FiDollarSign />
                                        <div>
                                            <span className="mock-card-label">Expenses</span>
                                            <span className="mock-card-value">-€750</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mock-chart">
                                    <div className="chart-bar" style={{ height: '60%' }}></div>
                                    <div className="chart-bar" style={{ height: '80%' }}></div>
                                    <div className="chart-bar" style={{ height: '45%' }}></div>
                                    <div className="chart-bar" style={{ height: '90%' }}></div>
                                    <div className="chart-bar" style={{ height: '70%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="hero-floating-card card-1">
                        <FiPieChart className="floating-icon" />
                        <span>Analytics</span>
                    </div>
                    <div className="hero-floating-card card-2">
                        <FiUsers className="floating-icon" />
                        <span>Partnership</span>
                    </div>
                    <div className="hero-floating-card card-3">
                        <FiTarget className="floating-icon" />
                        <span>Goals</span>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="landing-features" id="features">
                <div className="section-container">
                    <div className="section-header">
                        <h2 className="section-title">{t('landing.features.title')}</h2>
                        <p className="section-subtitle">{t('landing.features.subtitle')}</p>
                    </div>
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className={`feature-card ${feature.gradient}`}>
                                <div className="feature-icon">
                                    {feature.icon}
                                </div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="landing-steps">
                <div className="section-container">
                    <div className="section-header">
                        <h2 className="section-title">{t('landing.howItWorks.title')}</h2>
                        <p className="section-subtitle">{t('landing.howItWorks.subtitle')}</p>
                    </div>
                    <div className="steps-grid">
                        {steps.map((step, index) => (
                            <div key={index} className="step-card">
                                <div className="step-number">{step.number}</div>
                                <div className="step-icon">{step.icon}</div>
                                <h3 className="step-title">{step.title}</h3>
                                <p className="step-description">{step.description}</p>
                                {index < steps.length - 1 && (
                                    <div className="step-connector">
                                        <FiArrowRight />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="landing-stats">
                <div className="section-container">
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-number">{stats.formattedUsers}</div>
                            <div className="stat-label">{t('landing.stats.users')}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{stats.formattedTransactions}</div>
                            <div className="stat-label">{t('landing.stats.transactions')}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{stats.formattedMoneySaved}</div>
                            <div className="stat-label">{t('landing.stats.saved')}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mobile App Preview */}
            <section className="landing-mobile">
                <div className="section-container">
                    <div className="mobile-content">
                        <div className="mobile-text">
                            <h2 className="section-title">{t('landing.mobile.title')}</h2>
                            <p className="section-subtitle">{t('landing.mobile.subtitle')}</p>
                            <ul className="mobile-features">
                                <li>
                                    <FiCheck className="check-icon" />
                                    <span>{t('landing.mobile.feature1')}</span>
                                </li>
                                <li>
                                    <FiCheck className="check-icon" />
                                    <span>{t('landing.mobile.feature2')}</span>
                                </li>
                                <li>
                                    <FiCheck className="check-icon" />
                                    <span>{t('landing.mobile.feature3')}</span>
                                </li>
                            </ul>
                            <div className="mobile-badge">
                                <FiSmartphone />
                                <span>{t('landing.mobile.pwa')}</span>
                            </div>
                        </div>
                        <div className="mobile-preview">
                            <div className="preview-glow"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="landing-cta">
                <div className="cta-container">
                    <div className="cta-content">
                        <h2 className="cta-title">{t('landing.cta.title')}</h2>
                        <p className="cta-subtitle">{t('landing.cta.subtitle')}</p>
                        <Link to="/login?mode=signup" className="cta-button">
                            {t('landing.cta.button')}
                            <FiArrowRight />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-container">
                    <div className="footer-brand">
                        <img
                            src={`${import.meta.env.BASE_URL}paire-logo.svg`}
                            alt="Paire Logo"
                            width="32"
                            height="32"
                        />
                        <span>{t('app.title')}</span>
                    </div>
                    <div className="footer-links">
                        <Link to="/privacy">{t('landing.footer.privacy')}</Link>
                    </div>
                    <div className="footer-copyright">
                        {t('landing.footer.copyright', { year: new Date().getFullYear() })}
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Landing
