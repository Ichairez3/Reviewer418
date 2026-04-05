import './RoleSelection.css'
import logo from './assets/logo.png'

interface RoleSelectionProps {
    username: string
    onSelectRole: (role: 'submitter' | 'reviewer') => void
    onViewConferences: () => void
    onLogout: () => void
}

export function RoleSelection({ username, onSelectRole, onViewConferences, onLogout }: RoleSelectionProps) {
    return (
        <div className="role-selection-container">
            <div className="role-selection-box">
                <img src={logo} alt="Reviewer418 Logo" className="role-logo" />
                <h1>Reviewer418</h1>
                <p className="welcome-text">Welcome, {username}!</p>
                <p className="subtitle">Select your role to continue</p>

                <div className="role-options">
                    <button 
                        className="role-button submitter-btn"
                        onClick={() => onSelectRole('submitter')}
                    >
                        <div className="role-title">Submitter</div>
                        <div className="role-description">Submit papers and proposals</div>
                    </button>

                    <button 
                        className="role-button reviewer-btn"
                        onClick={() => onSelectRole('reviewer')}
                    >
                        <div className="role-title">Reviewer</div>
                        <div className="role-description">Review submissions and provide feedback</div>
                    </button>
                </div>

                <button 
                    className="role-button conferences-btn"
                    onClick={onViewConferences}
                >
                    <div className="role-title">Conferences</div>
                    <div className="role-description">Browse and manage conferences</div>
                </button>

                <button className="logout-btn" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </div>
    )
}
