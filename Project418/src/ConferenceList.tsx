import { useState, useEffect } from 'react'
import './ConferenceList.css'
import logo from './assets/logo.png'

interface Conference {
    _id: string
    name: string
    date: string
    location: string
    paperRequirements?: string
    isHidden?: boolean
    createdBy?: string
}

interface ConferenceListProps {
    username: string
    systemRole: 'owner' | 'admin' | 'user'
    onSelectConference: (conference: Conference) => void
    onLogout: () => void
    onBack?: () => void
}

export function ConferenceList({ username, systemRole, onSelectConference, onLogout, onBack }: ConferenceListProps) {
    const [conferences, setConferences] = useState<Conference[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newConference, setNewConference] = useState({
        name: '',
        date: '',
        location: '',
        paperRequirements: ''
    })
    const canManageConferenceVisibility = systemRole === 'owner' || systemRole === 'admin'

    useEffect(() => {
        fetchConferences()
    }, [])

    const fetchConferences = async () => {
        try {
            const response = await fetch(`/api/conferences?requestedBy=${encodeURIComponent(username)}`)
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
                    location: newConference.location,
                    paperRequirements: newConference.paperRequirements,
                    createdBy: username
                })
            })

            const data = await response.json()
            if (response.ok) {
                setConferences([data, ...conferences])
                setNewConference({ name: '', date: '', location: '', paperRequirements: '' })
                setShowCreateModal(false)
                setError('')
            } else {
                setError(data.error || 'Failed to create conference')
            }
        } catch (err) {
            console.error('Error creating conference:', err)
            setError('Unable to reach server')
        }
    }

    const handleToggleVisibility = async (conferenceId: string, nextHiddenState: boolean) => {
        try {
            const response = await fetch(`/api/conferences/${conferenceId}/visibility`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestedBy: username,
                    isHidden: nextHiddenState
                })
            })

            const data = await response.json()
            if (!response.ok) {
                setError(data.error || 'Failed to update conference visibility')
                return
            }

            setConferences((currentConferences) =>
                currentConferences.map((conference) => conference._id === conferenceId ? data : conference)
            )
            setError('')
        } catch (err) {
            console.error('Error updating conference visibility:', err)
            setError('Unable to reach server')
        }
    }

    const handleDeleteConference = async (conferenceId: string, conferenceName: string) => {
        if (!window.confirm(`Delete conference "${conferenceName}"? This cannot be undone.`)) {
            return
        }

        try {
            const response = await fetch(`/api/conferences/${conferenceId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestedBy: username
                })
            })

            const data = await response.json()
            if (!response.ok) {
                setError(data.error || 'Failed to delete conference')
                return
            }

            setConferences((currentConferences) =>
                currentConferences.filter((conference) => conference._id !== conferenceId)
            )
            setError('')
        } catch (err) {
            console.error('Error deleting conference:', err)
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
                    {onBack && (
                        <img
                            src={logo}
                            alt="Back to Menu"
                            className="header-logo-clickable"
                            onClick={onBack}
                            title="Back to Menu"
                        />
                    )}
                    <span className="username">Welcome, {username}</span>
                    <button className="logout-btn" onClick={onLogout}>Logout</button>
                </div>
            </div>

            <div className="conference-controls">
                <h2>Conferences</h2>
                {canManageConferenceVisibility ? (
                    <button className="create-btn" onClick={() => setShowCreateModal(true)}>
                        + Create Conference
                    </button>
                ) : (
                    <p className="create-restriction">Only admins and the owner can create conferences.</p>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}

            {showCreateModal && canManageConferenceVisibility && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create New Conference</h3>
                            <button className="close-btn" onClick={() => setShowCreateModal(false)}>x</button>
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
                            <div className="form-group">
                                <label htmlFor="conf-requirements">Paper Requirements</label>
                                <textarea
                                    id="conf-requirements"
                                    value={newConference.paperRequirements}
                                    onChange={(e) => setNewConference({ ...newConference, paperRequirements: e.target.value })}
                                    placeholder="One requirement per line, for example: PDF only"
                                    rows={6}
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
                        <p>No conferences available.</p>
                    </div>
                ) : (
                    conferences.map((conf) => (
                        <div key={conf._id} className="conference-card">
                            <div className="card-header">
                                <h3>{conf.name}</h3>
                                {conf.isHidden && <span className="hidden-badge">Hidden</span>}
                            </div>
                            <div className="card-body">
                                <p className="date">
                                    <strong>Date:</strong> {new Date(conf.date).toLocaleDateString()}
                                </p>
                                <p className="location">
                                    <strong>Location:</strong> {conf.location}
                                </p>
                            </div>
                            <button
                                className="view-btn"
                                onClick={() => onSelectConference(conf)}
                            >
                                View Details {'->'}
                            </button>
                            {canManageConferenceVisibility && (
                                <div className="conference-admin-actions">
                                    <button
                                        className="visibility-btn"
                                        onClick={() => handleToggleVisibility(conf._id, !conf.isHidden)}
                                    >
                                        {conf.isHidden ? 'Unhide' : 'Hide'}
                                    </button>
                                    <button
                                        className="delete-conference-btn"
                                        onClick={() => handleDeleteConference(conf._id, conf.name)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
