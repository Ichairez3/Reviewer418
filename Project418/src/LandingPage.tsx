import { useEffect, useState } from 'react'
import './LandingPage.css'
import logo from './assets/logo.png'

interface Conference {
    _id: string
    name: string
    date: string
    location: string
    paperRequirements?: string
    createdBy?: string
}

interface LandingPageProps {
    onEnterLogin: () => void
}

export function LandingPage({ onEnterLogin }: LandingPageProps) {
    const [conferences, setConferences] = useState<Conference[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedConference, setSelectedConference] = useState<Conference | null>(null)

    useEffect(() => {
        const fetchConferences = async () => {
            try {
                const response = await fetch('/api/conferences')
                if (!response.ok) {
                    throw new Error('Failed to load conferences')
                }

                const data = await response.json()
                setConferences(data)
                if (data.length > 0) {
                    setSelectedConference(data[0])
                }
            } catch (err) {
                console.error('Failed to fetch conferences:', err)
                setError('Conference requirements are unavailable right now.')
            } finally {
                setLoading(false)
            }
        }

        fetchConferences()
    }, [])

    const requirementLines = selectedConference?.paperRequirements
        ?.split('\n')
        .map((line) => line.trim())
        .filter(Boolean) ?? []

    return (
        <div className="landing-page">
            <section className="landing-hero">
                <div className="landing-copy">
                    <div className="landing-brand">
                        <img src={logo} alt="Reviewer418 Logo" className="landing-logo" />
                        <span>Reviewer418</span>
                    </div>
                    <p className="landing-eyebrow">Conference submissions</p>
                    <h1>Check paper requirements before you log in and submit.</h1>
                    <p className="landing-description">
                        Authors can review each conference&apos;s submission rules up front, then continue to login or sign up when ready to upload.
                    </p>
                    <div className="landing-actions">
                        <button className="landing-primary-btn" onClick={onEnterLogin}>
                            Login or Sign Up
                        </button>
                    </div>
                </div>

                <div className="landing-highlight-card">
                    <p className="highlight-label">Current selection</p>
                    <h2>{selectedConference?.name || 'No conference selected'}</h2>
                    <p>{selectedConference ? new Date(selectedConference.date).toLocaleDateString() : 'No date available'}</p>
                    <p>{selectedConference?.location || 'No location available'}</p>
                    <p className="highlight-owner">
                        Managed by {selectedConference?.createdBy || 'conference owner'}
                    </p>
                </div>
            </section>

            <section className="landing-body">
                <div className="conference-browser">
                    <div className="section-heading">
                        <h2>Conference Requirements</h2>
                        <p>Select a conference to inspect its paper rules.</p>
                    </div>

                    {loading ? (
                        <div className="landing-empty">Loading conferences...</div>
                    ) : error ? (
                        <div className="landing-empty">{error}</div>
                    ) : conferences.length === 0 ? (
                        <div className="landing-empty">No conferences have been created yet.</div>
                    ) : (
                        <div className="landing-grid">
                            <div className="conference-list-panel">
                                {conferences.map((conference) => (
                                    <button
                                        key={conference._id}
                                        className={`conference-list-item ${selectedConference?._id === conference._id ? 'active' : ''}`}
                                        onClick={() => setSelectedConference(conference)}
                                    >
                                        <span className="conference-name">{conference.name}</span>
                                        <span className="conference-meta">
                                            {new Date(conference.date).toLocaleDateString()} • {conference.location}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="requirements-panel">
                                <div className="requirements-header">
                                    <h3>{selectedConference?.name}</h3>
                                    <p>
                                        Submission requirements for authors preparing a conference paper.
                                    </p>
                                </div>

                                {requirementLines.length > 0 ? (
                                    <ul className="requirements-list">
                                        {requirementLines.map((line, index) => (
                                            <li key={`${selectedConference?._id}-${index}`}>{line}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="requirements-empty">
                                        This conference owner has not added paper requirements yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
