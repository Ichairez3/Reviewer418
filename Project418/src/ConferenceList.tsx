import { useState, useEffect } from 'react'
import './ConferenceList.css'

interface Conference {
    _id: string
    name: string
    date: string
    location: string
}

interface ConferenceListProps {
    username: string
    onSelectConference: (conference: Conference) => void
    onLogout: () => void
}

export function ConferenceList({ username, onSelectConference, onLogout }: ConferenceListProps) {
    const [conferences, setConferences] = useState<Conference[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newConference, setNewConference] = useState({
        name: '',
        date: '',
        location: ''
    })

    useEffect(() => {
        fetchConferences()
    }, [])

    const fetchConferences = async () => {
        try {
            const response = await fetch('/api/conferences')
            if (response.ok) {
                const data = await response.json()
                setConferences(data)
            } else {
                setError('Failed to load conferences')
            }
        } catch (err) {
            console.error('Error fetching conferences:', err)
            setError('Unable to reach server')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateConference = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newConference.name || !newConference.date || !newConference.location) {
            setError('All fields are required')
            return
        }

        try {
            const response = await fetch('/api/conferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newConference.name,
                    date: new Date(newConference.date).toISOString(),
                    location: newConference.location
                })
            })

            if (response.ok) {
                const created = await response.json()
                setConferences([created, ...conferences])
                setNewConference({ name: '', date: '', location: '' })
                setShowCreateModal(false)
                setError('')
            } else {
                setError('Failed to create conference')
            }
        } catch (err) {
            console.error('Error creating conference:', err)
            setError('Unable to reach server')
        }
    }

    if (loading) {
        return <div className="loading">Loading conferences...</div>
    }

    return (
        <div className="conference-list-container">
            <div className="conference-header">
                <div className="header-content">
                    <h1>Reviewer418</h1>
                    <p>Conference Management System</p>
                </div>
                <div className="header-actions">
                    <span className="username">Welcome, {username}</span>
                    <button className="logout-btn" onClick={onLogout}>Logout</button>
                </div>
            </div>

            <div className="conference-controls">
                <h2>Conferences</h2>
                <button className="create-btn" onClick={() => setShowCreateModal(true)}>
                    + Create Conference
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create New Conference</h3>
                            <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateConference}>
                            <div className="form-group">
                                <label htmlFor="conf-name">Conference Name</label>
                                <input
                                    id="conf-name"
                                    type="text"
                                    value={newConference.name}
                                    onChange={(e) => setNewConference({ ...newConference, name: e.target.value })}
                                    placeholder="e.g., International AI Conference 2026"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="conf-date">Date</label>
                                <input
                                    id="conf-date"
                                    type="datetime-local"
                                    value={newConference.date}
                                    onChange={(e) => setNewConference({ ...newConference, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="conf-location">Location</label>
                                <input
                                    id="conf-location"
                                    type="text"
                                    value={newConference.location}
                                    onChange={(e) => setNewConference({ ...newConference, location: e.target.value })}
                                    placeholder="e.g., San Francisco, CA"
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    Create Conference
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="conferences-grid">
                {conferences.length === 0 ? (
                    <div className="no-conferences">
                        <p>No conferences yet. Create one to get started!</p>
                    </div>
                ) : (
                    conferences.map((conf) => (
                        <div key={conf._id} className="conference-card" onClick={() => onSelectConference(conf)}>
                            <div className="card-header">
                                <h3>{conf.name}</h3>
                            </div>
                            <div className="card-body">
                                <p className="date">
                                    <strong>Date:</strong> {new Date(conf.date).toLocaleDateString()}
                                </p>
                                <p className="location">
                                    <strong>Location:</strong> {conf.location}
                                </p>
                            </div>
                            <button className="view-btn">View Details →</button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
