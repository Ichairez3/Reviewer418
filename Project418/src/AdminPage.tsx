import { useEffect, useState } from 'react'
import './AdminPage.css'
import logo from './assets/logo.png'

interface AdminPageProps {
    username: string
    systemRole: 'owner' | 'admin' | 'user'
    onBackToMain: () => void
    onLogout: () => void
}

interface UserRecord {
    _id: string
    username: string
    email?: string
    systemRole?: 'owner' | 'admin' | 'user'
}

export function AdminPage({ username, systemRole, onBackToMain, onLogout }: AdminPageProps) {
    const [users, setUsers] = useState<UserRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [savingUserId, setSavingUserId] = useState<string | null>(null)

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/users')
                if (!response.ok) {
                    throw new Error('Failed to load users')
                }

                const data = await response.json()
                setUsers(data)
            } catch (err) {
                console.error('Failed to fetch users:', err)
                setError('Unable to load user accounts')
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [])

    const handleSystemRoleUpdate = async (userId: string, nextSystemRole: 'admin' | 'user') => {
        setSavingUserId(userId)
        setError('')

        try {
            const response = await fetch(`/api/users/${userId}/system-role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestedBy: username,
                    systemRole: nextSystemRole
                })
            })

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update admin privileges')
            }

            setUsers((currentUsers) =>
                currentUsers.map((user) => user._id === userId ? data : user)
            )
        } catch (err) {
            console.error('Failed to update system role:', err)
            setError(err instanceof Error ? err.message : 'Failed to update admin privileges')
        } finally {
            setSavingUserId(null)
        }
    }

    const isAdminViewer = systemRole === 'owner' || systemRole === 'admin'

    if (!isAdminViewer) {
        return null
    }

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div className="admin-brand">
                    <img
                        src={logo}
                        alt="Back to role selection"
                        className="admin-logo"
                        onClick={onBackToMain}
                        title="Back to role selection"
                    />
                    <div>
                        <h1>Admin Controls</h1>
                        <p>Manage system-wide admin privileges for this Reviewer418 instance.</p>
                    </div>
                </div>
                <button className="admin-logout-btn" onClick={onLogout}>Logout</button>
            </div>

            <div className="admin-panel">
                <div className="admin-summary">
                    <span className={`system-badge ${systemRole}`}>{systemRole}</span>
                    <span>Signed in as {username}</span>
                </div>

                {error && <div className="admin-error">{error}</div>}

                {loading ? (
                    <div className="admin-empty">Loading users...</div>
                ) : (
                    <div className="admin-user-list">
                        {users.map((user) => {
                            const role = user.systemRole || 'user'
                            const isOwner = role === 'owner'
                            const isCurrentUser = user.username === username
                            const canPromote = role === 'user'
                            const canDemote = role === 'admin'

                            return (
                                <div key={user._id} className="admin-user-card">
                                    <div className="admin-user-info">
                                        <h2>{user.username}{isCurrentUser ? ' (You)' : ''}</h2>
                                        <p>{user.email || 'No email on file'}</p>
                                    </div>
                                    <div className="admin-user-actions">
                                        <span className={`system-badge ${role}`}>{role}</span>
                                        {isOwner ? (
                                            <span className="owner-note">Owner account cannot be changed here.</span>
                                        ) : (
                                            <div className="admin-action-buttons">
                                                {canPromote && (
                                                    <button
                                                        className="grant-admin-btn"
                                                        onClick={() => handleSystemRoleUpdate(user._id, 'admin')}
                                                        disabled={savingUserId === user._id}
                                                    >
                                                        {savingUserId === user._id ? 'Saving...' : 'Grant Admin'}
                                                    </button>
                                                )}
                                                {canDemote && (
                                                    <button
                                                        className="remove-admin-btn"
                                                        onClick={() => handleSystemRoleUpdate(user._id, 'user')}
                                                        disabled={savingUserId === user._id}
                                                    >
                                                        {savingUserId === user._id ? 'Saving...' : 'Remove Admin'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
