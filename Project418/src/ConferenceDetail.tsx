import { useState, useEffect } from 'react'
import { ReviewPanel } from './ReviewPanel'
import './ConferenceDetail.css'
import logo from './assets/logo.png'

interface Conference {
    _id: string
    name: string
    date: string
    location: string
    paperRequirements?: string
    createdBy?: string
}

interface Submission {
    _id: string
    title: string
    authors: string
    type: 'Paper' | 'Poster' | 'Workshop'
    userId: { username: string }
    submittedAt: string
}

interface ConferenceUser {
    _id?: string
    userId: string
    username: string
    role?: 'organizer' | 'reviewer' | 'submitter'
    roles?: Array<'organizer' | 'reviewer' | 'submitter'>
    addedAt: string
}

interface ConferenceDetailProps {
    conference: Conference
    username: string
    onBack: () => void
}

export function ConferenceDetail({ conference, username, onBack }: ConferenceDetailProps) {
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [conferenceUsers, setConferenceUsers] = useState<ConferenceUser[]>([])
    const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; username: string }>>([]
    )
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showSubmitModal, setShowSubmitModal] = useState(false)
    const [showUserModal, setShowUserModal] = useState(false)
    const [showEditRolesModal, setShowEditRolesModal] = useState(false)
    const [editingUser, setEditingUser] = useState<ConferenceUser | null>(null)
    const [editRoles, setEditRoles] = useState<Array<'organizer' | 'reviewer' | 'submitter'>>([])
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
    const [showReviewPanel, setShowReviewPanel] = useState(false)
    const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null)
    const [activeTab, setActiveTab] = useState<'submissions' | 'users' | 'requirements'>('submissions')
    const [currentRequirements, setCurrentRequirements] = useState(conference.paperRequirements || '')
    const [requirementsDraft, setRequirementsDraft] = useState(conference.paperRequirements || '')
    const [isSavingRequirements, setIsSavingRequirements] = useState(false)
    const [newUser, setNewUser] = useState({
        selectedUsername: '',
        searchTerm: '',
        selectedRoles: ['reviewer'] as Array<'organizer' | 'reviewer' | 'submitter'>
    })
    const [showUserDropdown, setShowUserDropdown] = useState(false)
    const [newSubmission, setNewSubmission] = useState({
        title: '',
        authors: '',
        type: 'Paper' as 'Paper' | 'Poster' | 'Workshop'
    })

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                await Promise.all([
                    fetchSubmissions(),
                    fetchConferenceUsers(),
                    fetchAvailableUsers()
                ])
            } catch (err) {
                console.error('Error fetching data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchAllData()
    }, [conference._id])

    useEffect(() => {
        setCurrentRequirements(conference.paperRequirements || '')
        setRequirementsDraft(conference.paperRequirements || '')
    }, [conference.paperRequirements, conference._id])

    const fetchAvailableUsers = async () => {
        try {
            const response = await fetch('/api/users')
            if (response.ok) {
                const data = await response.json()
                console.log('Available users from API:', data)
                // Handle both formats: array of objects with id/username or just user objects
                const formattedUsers = Array.isArray(data) ? data.map((user: any) => ({
                    id: user._id || user.id || user.username,
                    username: user.username || user.name || user
                })) : []
                setAvailableUsers(formattedUsers)
            }
        } catch (err) {
            console.error('Error fetching available users:', err)
        }
    }

    const fetchConferenceUsers = async () => {
        try {
            const response = await fetch(`/api/conferences/${conference._id}/users`)
            if (response.ok) {
                const data = await response.json()
                setConferenceUsers(data)
            }
        } catch (err) {
            console.error('Error fetching conference users:', err)
        }
    }

    const fetchSubmissions = async () => {
        try {
            const response = await fetch(`/api/conferences/${conference._id}/submissions`)
            if (response.ok) {
                const data = await response.json()
                setSubmissions(data)
            } else {
                setError('Failed to load submissions')
            }
        } catch (err) {
            console.error('Error fetching submissions:', err)
            setError('Unable to reach server')
        }
    }

    const handleSubmitSubmission = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSubmission.title || !newSubmission.authors) {
            setError('Title and authors are required')
            return
        }

        try {
            const response = await fetch('/api/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newSubmission.title,
                    authors: newSubmission.authors,
                    type: newSubmission.type,
                    conferenceId: conference._id,
                    userId: 'current-user-id' // This would be set from auth context
                })
            })

            if (response.ok) {
                const created = await response.json()
                setSubmissions([created, ...submissions])
                setNewSubmission({ title: '', authors: '', type: 'Paper' })
                setShowSubmitModal(false)
                setError('')
            } else {
                setError('Failed to submit')
            }
        } catch (err) {
            console.error('Error submitting:', err)
            setError('Unable to reach server')
        }
    }

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newUser.selectedUsername) {
            setError('Username is required')
            return
        }
        if (newUser.selectedRoles.length === 0) {
            setError('At least one role is required')
            return
        }

        try {
            const response = await fetch(`/api/conferences/${conference._id}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUser.selectedUsername,
                    roles: newUser.selectedRoles,
                    requestedBy: username
                })
            })

            if (response.ok) {
                const created = await response.json()
                setConferenceUsers([...conferenceUsers, created])
                setNewUser({ selectedUsername: '', searchTerm: '', selectedRoles: ['reviewer'] })
                setShowUserDropdown(false)
                setShowUserModal(false)
                setError('')
                fetchConferenceUsers()
            } else {
                setError('Failed to add user')
            }
        } catch (err) {
            console.error('Error adding user:', err)
            setError('Unable to reach server')
        }
    }

    const handleDeleteUser = async (conferenceUserId: string, userToDelete: string) => {
        if (!window.confirm(`Are you sure you want to remove ${userToDelete} from this conference?`)) {
            return
        }

        try {
            const response = await fetch(`/api/conferences/${conference._id}/users/${conferenceUserId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestedBy: username
                })
            })

            if (response.ok) {
                setConferenceUsers(conferenceUsers.filter(u => u.userId !== conferenceUserId))
                setError('')
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to remove user')
            }
        } catch (err) {
            console.error('Error deleting user:', err)
            setError('Unable to reach server')
        }
    }

    const openEditRolesModal = (user: ConferenceUser) => {
        setEditingUser(user)
        setEditRoles(user.roles || [user.role || 'reviewer'])
        setShowEditRolesModal(true)
    }

    const handleEditRoles = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingUser || !editingUser._id) {
            setError('Error: User ID not found')
            return
        }
        if (editRoles.length === 0) {
            setError('At least one role is required')
            return
        }

        try {
            const response = await fetch(`/api/conferences/${conference._id}/users/${editingUser._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roles: editRoles,
                    requestedBy: username
                })
            })

            if (response.ok) {
                const updated = await response.json()
                setConferenceUsers(conferenceUsers.map(u => u._id === editingUser._id ? updated : u))
                setShowEditRolesModal(false)
                setEditingUser(null)
                setEditRoles([])
                setError('')
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to update roles')
            }
        } catch (err) {
            console.error('Error updating roles:', err)
            setError('Unable to reach server')
        }
    }

    const toggleEditRole = (role: 'organizer' | 'reviewer' | 'submitter') => {
        setEditRoles(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        )
    }

    const toggleRole = (role: 'organizer' | 'reviewer' | 'submitter') => {
        setNewUser(prev => ({
            ...prev,
            selectedRoles: prev.selectedRoles.includes(role)
                ? prev.selectedRoles.filter(r => r !== role)
                : [...prev.selectedRoles, role]
        }))
    }

    const filteredUsers = newUser.searchTerm 
        ? availableUsers.filter(user =>
            user.username.toLowerCase().includes(newUser.searchTerm.toLowerCase())
        )
        : availableUsers
    const handleViewReviews = (submission: Submission) => {
        setReviewingSubmission(submission)
        setShowReviewPanel(true)
    }
    const isConferenceCreator = conference.createdBy === username
    const isOrganizer = conferenceUsers.some(u => u.username === username && u.roles?.includes('organizer'))
    const canManageUsers = isConferenceCreator || isOrganizer
    const canEditRequirements = isConferenceCreator || isOrganizer

    const handleSaveRequirements = async () => {
        setIsSavingRequirements(true)
        try {
            const response = await fetch(`/api/conferences/${conference._id}/requirements`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestedBy: username,
                    paperRequirements: requirementsDraft
                })
            })

            if (!response.ok) {
                const data = await response.json()
                setError(data.error || 'Failed to update requirements')
                return
            }

            const updatedConference = await response.json()
            setCurrentRequirements(updatedConference.paperRequirements || '')
            setRequirementsDraft(updatedConference.paperRequirements || '')
            setError('')
        } catch (err) {
            console.error('Error updating requirements:', err)
            setError('Unable to save requirements')
        } finally {
            setIsSavingRequirements(false)
        }
    }

    const requirementLines = currentRequirements
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

    if (loading) {
        return (
            <div className="conference-detail-container">
                <div className="logo-back-container">
                    <img
                        src={logo}
                        alt="Back to Conferences"
                        className="logo-back-btn"
                        onClick={onBack}
                        title="Back to Conferences"
                    />
                </div>
                <div className="loading">Loading...</div>
            </div>
        )
    }

    return (
        <div className="conference-detail-container">
            <div className="logo-back-container">
                <img
                    src={logo}
                    alt="Back to Conferences"
                    className="logo-back-btn"
                    onClick={onBack}
                    title="Back to Conferences"
                />
            </div>

            <div className="detail-header">
                <div className="header-info">
                    <h1>{conference.name}</h1>
                    <p className="date">📅 {new Date(conference.date).toLocaleDateString()}</p>
                    <p className="location">📍 {conference.location}</p>
                </div>
                <button className="submit-btn" onClick={() => setShowSubmitModal(true)}>
                    + Submit Proposal
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {showSubmitModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Submit to {conference.name}</h3>
                            <button className="close-btn" onClick={() => setShowSubmitModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmitSubmission}>
                            <div className="form-group">
                                <label htmlFor="title">Title</label>
                                <input
                                    id="title"
                                    type="text"
                                    value={newSubmission.title}
                                    onChange={(e) => setNewSubmission({ ...newSubmission, title: e.target.value })}
                                    placeholder="Submission title"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="authors">Authors</label>
                                <input
                                    id="authors"
                                    type="text"
                                    value={newSubmission.authors}
                                    onChange={(e) => setNewSubmission({ ...newSubmission, authors: e.target.value })}
                                    placeholder="Author names (comma separated)"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="type">Submission Type</label>
                                <select
                                    id="type"
                                    value={newSubmission.type}
                                    onChange={(e) => setNewSubmission({ ...newSubmission, type: e.target.value as 'Paper' | 'Poster' | 'Workshop' })}
                                >
                                    <option value="Paper">Paper</option>
                                    <option value="Poster">Poster</option>
                                    <option value="Workshop">Workshop</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowSubmitModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-form-btn">
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="detail-tabs">
                <button 
                    className={`tab ${activeTab === 'submissions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('submissions')}
                >
                    Submissions
                </button>
                <button 
                    className={`tab ${activeTab === 'requirements' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requirements')}
                >
                    Paper Requirements
                </button>
                {canManageUsers && (
                    <button 
                        className={`tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Manage Users
                    </button>
                )}
            </div>

            {activeTab === 'submissions' && (
                <div className="submissions-section">
                    <h2>Submissions</h2>
                    {submissions.length === 0 ? (
                        <div className="no-submissions">
                            <p>No submissions yet</p>
                        </div>
                    ) : (
                        <div className="submissions-list">
                            {submissions.map((sub) => (
                                <div 
                                    key={sub._id} 
                                    className="submission-item"
                                    onClick={() => setSelectedSubmission(sub)}
                                >
                                    <div className="submission-header">
                                        <h3>{sub.title}</h3>
                                        <span className={`type-badge ${sub.type.toLowerCase()}`}>{sub.type}</span>
                                    </div>
                                    <p className="authors">By: {sub.authors}</p>
                                    <p className="submitter">Submitted by: {sub.userId.username}</p>
                                    <p className="date">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                                    <button 
                                        className="view-reviews-btn"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleViewReviews(sub)
                                        }}
                                    >
                                        View Reviews →
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'requirements' && (
                <div className="submissions-section">
                    <h2>Paper Requirements</h2>
                    <div className="modal-body" style={{ padding: 0 }}>
                        <p>
                            Authors see these requirements on the public landing page before logging in.
                        </p>
                        {requirementLines.length > 0 ? (
                            <ul style={{ paddingLeft: '1.25rem', marginTop: '1rem' }}>
                                {requirementLines.map((line, index) => (
                                    <li key={`${conference._id}-req-${index}`}>{line}</li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ marginTop: '1rem' }}>No paper requirements have been posted yet.</p>
                        )}

                        {canEditRequirements ? (
                            <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                <label htmlFor="paper-requirements">Edit Requirements</label>
                                <textarea
                                    id="paper-requirements"
                                    value={requirementsDraft}
                                    onChange={(e) => setRequirementsDraft(e.target.value)}
                                    rows={8}
                                    placeholder="Enter one requirement per line"
                                />
                                <div className="form-actions">
                                    <button
                                        type="button"
                                        className="submit-form-btn"
                                        onClick={handleSaveRequirements}
                                        disabled={isSavingRequirements}
                                    >
                                        {isSavingRequirements ? 'Saving...' : 'Save Requirements'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p style={{ marginTop: '1.5rem' }}>
                                Only the conference owner or organizer can edit these requirements.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'users' && canManageUsers && (
                <div className="users-section">
                    <div className="users-header">
                        <h2>Conference Users</h2>
                        <button className="add-user-btn" onClick={() => setShowUserModal(true)}>
                            + Add User
                        </button>
                    </div>
                    {conferenceUsers.length === 0 ? (
                        <div className="no-users">
                            <p>No users added yet</p>
                        </div>
                    ) : (
                        <div className="users-list">
                            {conferenceUsers.map((user) => (
                                <div key={user._id || user.userId} className="user-item">
                                    <div className="user-info">
                                        <h3>{user.username}</h3>
                                        <div className="role-badges-container">
                                            {(user.roles || (user.role ? [user.role] : [])).map((role) => (
                                                <span key={role} className={`role-badge ${role}`}>{role}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="user-item-actions">
                                        <p className="added-date">Added: {new Date(user.addedAt).toLocaleDateString()}</p>
                                        <div className="action-buttons">
                                            <button 
                                                className="edit-user-btn"
                                                onClick={() => openEditRolesModal(user)}
                                                title="Edit user roles"
                                            >
                                                ✎ Edit
                                            </button>
                                            <button 
                                                className="delete-user-btn"
                                                onClick={() => handleDeleteUser(user._id || user.userId, user.username)}
                                                title="Remove user from conference"
                                            >
                                                ✕ Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {showUserModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Add User to Conference</h3>
                            <button className="close-btn" onClick={() => setShowUserModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div className="form-group">
                                <label htmlFor="user-search">Select User</label>
                                <div className="user-dropdown-container">
                                    <input
                                        id="user-search"
                                        type="text"
                                        value={newUser.selectedUsername ? newUser.selectedUsername : newUser.searchTerm}
                                        onChange={(e) => {
                                            setNewUser({ ...newUser, searchTerm: e.target.value, selectedUsername: '' })
                                            setShowUserDropdown(true)
                                        }}
                                        onFocus={() => setShowUserDropdown(true)}
                                        placeholder="Search for users..."
                                        required={!newUser.selectedUsername}
                                    />
                                    {showUserDropdown && filteredUsers.length > 0 && (
                                        <div className="user-dropdown">
                                            {filteredUsers.map((user) => (
                                                <div
                                                    key={user.id}
                                                    className="user-item-option"
                                                    onClick={() => {
                                                        setNewUser({ ...newUser, selectedUsername: user.username, searchTerm: '' })
                                                        setShowUserDropdown(false)
                                                    }}
                                                >
                                                    {user.username}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {showUserDropdown && newUser.searchTerm && filteredUsers.length === 0 && (
                                        <div className="user-dropdown">
                                            <div className="no-results">No users found</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Assign Roles</label>
                                <div className="role-buttons-group">
                                    <button
                                        type="button"
                                        className={`role-btn ${newUser.selectedRoles.includes('submitter') ? 'active' : ''}`}
                                        onClick={() => toggleRole('submitter')}
                                    >
                                        ✓ Submitter
                                    </button>
                                    <button
                                        type="button"
                                        className={`role-btn ${newUser.selectedRoles.includes('reviewer') ? 'active' : ''}`}
                                        onClick={() => toggleRole('reviewer')}
                                    >
                                        ✓ Reviewer
                                    </button>
                                    <button
                                        type="button"
                                        className={`role-btn ${newUser.selectedRoles.includes('organizer') ? 'active' : ''}`}
                                        onClick={() => toggleRole('organizer')}
                                    >
                                        ✓ Organizer
                                    </button>
                                </div>
                                {newUser.selectedRoles.length > 0 && (
                                    <p className="selected-roles">Selected: {newUser.selectedRoles.join(', ')}</p>
                                )}
                            </div>

                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowUserModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-form-btn">
                                    Add User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditRolesModal && editingUser && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Edit Roles for {editingUser.username}</h3>
                            <button className="close-btn" onClick={() => setShowEditRolesModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleEditRoles}>
                            <div className="form-group">
                                <label>Assign Roles</label>
                                <div className="role-buttons-group">
                                    <button
                                        type="button"
                                        className={`role-btn ${editRoles.includes('organizer') ? 'active' : ''}`}
                                        onClick={() => toggleEditRole('organizer')}
                                    >
                                        {editRoles.includes('organizer') ? '✓' : ''} Organizer
                                    </button>
                                    <button
                                        type="button"
                                        className={`role-btn ${editRoles.includes('reviewer') ? 'active' : ''}`}
                                        onClick={() => toggleEditRole('reviewer')}
                                    >
                                        {editRoles.includes('reviewer') ? '✓' : ''} Reviewer
                                    </button>
                                    <button
                                        type="button"
                                        className={`role-btn ${editRoles.includes('submitter') ? 'active' : ''}`}
                                        onClick={() => toggleEditRole('submitter')}
                                    >
                                        {editRoles.includes('submitter') ? '✓' : ''} Submitter
                                    </button>
                                </div>
                                {editRoles.length > 0 && (
                                    <p className="selected-roles">Selected: {editRoles.join(', ')}</p>
                                )}
                            </div>

                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowEditRolesModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-form-btn">
                                    Update Roles
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedSubmission && (
                <div className="modal-overlay" onClick={() => setSelectedSubmission(null)}>
                    <div className="modal submission-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedSubmission.title}</h3>
                            <button className="close-btn" onClick={() => setSelectedSubmission(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Authors:</strong> {selectedSubmission.authors}</p>
                            <p><strong>Type:</strong> {selectedSubmission.type}</p>
                            <p><strong>Submitter:</strong> {selectedSubmission.userId.username}</p>
                            <p><strong>Submitted:</strong> {new Date(selectedSubmission.submittedAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {showReviewPanel && reviewingSubmission && (
                <ReviewPanel 
                    submissionId={reviewingSubmission._id}
                    submissionTitle={reviewingSubmission.title}
                    onClose={() => {
                        setShowReviewPanel(false)
                        setReviewingSubmission(null)
                    }}
                />
            )}
        </div>
    )
}
