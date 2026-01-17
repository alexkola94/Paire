import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
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
    FiSmartphone,
    FiMap
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
        },
        {
            icon: <FiMap />,
            title: t('landing.features.travel.title'),
            description: t('landing.features.travel.description'),
            gradient: 'gradient-7'
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
                <motion.div
                    className="hero-content"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                >
                    <motion.div
                        className="hero-badge"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <FiShield size={14} />
                        <span>{t('landing.hero.badge')}</span>
                    </motion.div>
                    <motion.h1
                        className="hero-title"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        {t('landing.hero.title')}
                    </motion.h1>
                    <motion.p
                        className="hero-subtitle"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        {t('landing.hero.subtitle')}
                    </motion.p>
                    <motion.div
                        className="hero-actions"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                    >
                        <Link to="/login?mode=signup" className="btn-hero-primary">
                            {t('landing.hero.getStarted')}
                            <FiArrowRight />
                        </Link>
                        <Link to="/login" className="btn-hero-secondary">
                            {t('landing.hero.login')}
                        </Link>
                    </motion.div>
                    <motion.div
                        className="hero-trust"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                    >
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
                    </motion.div>
                </motion.div>
                <motion.div
                    className="hero-visual"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
                >
                    <motion.div
                        className="hero-phone"
                        initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ duration: 0.8, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    >
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
                    </motion.div>
                    <motion.div
                        className="hero-floating-card card-1"
                        initial={{ opacity: 0, x: 20, y: -20 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <FiPieChart className="floating-icon" />
                        <span>Analytics</span>
                    </motion.div>
                    <motion.div
                        className="hero-floating-card card-2"
                        initial={{ opacity: 0, x: -20, y: 20 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.9, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <FiUsers className="floating-icon" />
                        <span>Partnership</span>
                    </motion.div>
                    <motion.div
                        className="hero-floating-card card-3"
                        initial={{ opacity: 0, x: 20, y: 20 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.6, delay: 1, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <FiTarget className="floating-icon" />
                        <span>Goals</span>
                    </motion.div>
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="landing-features" id="features">
                <div className="section-container">
                    <motion.div
                        className="section-header"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className="section-title">{t('landing.features.title')}</h2>
                        <p className="section-subtitle">{t('landing.features.subtitle')}</p>
                    </motion.div>
                    <motion.div
                        className="features-grid"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={{
                            visible: {
                                transition: {
                                    staggerChildren: 0.1
                                }
                            }
                        }}
                    >
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                className={`feature-card ${feature.gradient}`}
                                variants={{
                                    hidden: { opacity: 0, y: 30, scale: 0.95 },
                                    visible: {
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        transition: {
                                            duration: 0.4,
                                            ease: [0.4, 0, 0.2, 1]
                                        }
                                    }
                                }}
                            >
                                <div className="feature-icon">
                                    {feature.icon}
                                </div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="landing-steps">
                <div className="section-container">
                    <motion.div
                        className="section-header"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className="section-title">{t('landing.howItWorks.title')}</h2>
                        <p className="section-subtitle">{t('landing.howItWorks.subtitle')}</p>
                    </motion.div>
                    <motion.div
                        className="steps-grid"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={{
                            visible: {
                                transition: {
                                    staggerChildren: 0.15
                                }
                            }
                        }}
                    >
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                className="step-card"
                                variants={{
                                    hidden: { opacity: 0, x: -30 },
                                    visible: {
                                        opacity: 1,
                                        x: 0,
                                        transition: {
                                            duration: 0.5,
                                            ease: [0.4, 0, 0.2, 1]
                                        }
                                    }
                                }}
                            >
                                <div className="step-number">{step.number}</div>
                                <div className="step-icon">{step.icon}</div>
                                <h3 className="step-title">{step.title}</h3>
                                <p className="step-description">{step.description}</p>
                                {index < steps.length - 1 && (
                                    <div className="step-connector">
                                        <FiArrowRight />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="landing-stats">
                <div className="section-container">
                    <motion.div
                        className="stats-grid"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={{
                            visible: {
                                transition: {
                                    staggerChildren: 0.1
                                }
                            }
                        }}
                    >
                        <motion.div
                            className="stat-card"
                            variants={{
                                hidden: { opacity: 0, scale: 0.8 },
                                visible: {
                                    opacity: 1,
                                    scale: 1,
                                    transition: {
                                        duration: 0.4,
                                        ease: [0.4, 0, 0.2, 1]
                                    }
                                }
                            }}
                        >
                            <div className="stat-number">{stats.formattedUsers}</div>
                            <div className="stat-label">{t('landing.stats.users')}</div>
                        </motion.div>
                        <motion.div
                            className="stat-card"
                            variants={{
                                hidden: { opacity: 0, scale: 0.8 },
                                visible: {
                                    opacity: 1,
                                    scale: 1,
                                    transition: {
                                        duration: 0.4,
                                        ease: [0.4, 0, 0.2, 1]
                                    }
                                }
                            }}
                        >
                            <div className="stat-number">{stats.formattedTransactions}</div>
                            <div className="stat-label">{t('landing.stats.transactions')}</div>
                        </motion.div>
                        <motion.div
                            className="stat-card"
                            variants={{
                                hidden: { opacity: 0, scale: 0.8 },
                                visible: {
                                    opacity: 1,
                                    scale: 1,
                                    transition: {
                                        duration: 0.4,
                                        ease: [0.4, 0, 0.2, 1]
                                    }
                                }
                            }}
                        >
                            <div className="stat-number">{stats.formattedMoneySaved}</div>
                            <div className="stat-label">{t('landing.stats.saved')}</div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Mobile App Preview */}
            <section className="landing-mobile">
                <div className="section-container">
                    <motion.div
                        className="mobile-content"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={{
                            visible: {
                                transition: {
                                    staggerChildren: 0.15
                                }
                            }
                        }}
                    >
                        <motion.div
                            className="mobile-text"
                            variants={{
                                hidden: { opacity: 0, x: -30 },
                                visible: {
                                    opacity: 1,
                                    x: 0,
                                    transition: {
                                        duration: 0.5,
                                        ease: [0.4, 0, 0.2, 1]
                                    }
                                }
                            }}
                        >
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
                        </motion.div>
                        <motion.div
                            className="mobile-preview"
                            variants={{
                                hidden: { opacity: 0, x: 30 },
                                visible: {
                                    opacity: 1,
                                    x: 0,
                                    transition: {
                                        duration: 0.5,
                                        ease: [0.4, 0, 0.2, 1]
                                    }
                                }
                            }}
                        >
                            <div className="preview-glow"></div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="landing-cta">
                <div className="cta-container">
                    <motion.div
                        className="cta-content"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <h2 className="cta-title">{t('landing.cta.title')}</h2>
                        <p className="cta-subtitle">{t('landing.cta.subtitle')}</p>
                        <Link to="/login?mode=signup" className="cta-button">
                            {t('landing.cta.button')}
                            <FiArrowRight />
                        </Link>
                    </motion.div>
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
