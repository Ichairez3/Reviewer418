import { useState, useEffect } from 'react'
import { LandingPage } from './LandingPage'
import { Login } from './Login'
import { RoleSelection } from './RoleSelection'
import { SubmissionPage } from './SubmissionPage'
import { ReviewerPage } from './ReviewerPage'
import { ConferenceList } from './ConferenceList'
import { ConferenceDetail } from './ConferenceDetail'
import './App.css'

type UserRole = 'submitter' | 'reviewer' | null

interface Conference {
    _id: string
    name: string
    date: string
    location: string
    paperRequirements?: string
    createdBy?: string
}

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [showLogin, setShowLogin] = useState(false)
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [userID, setUserID] = useState('')
    const [userRole, setUserRole] = useState<UserRole>(null)
    const [viewingConferences, setViewingConferences] = useState(false)
    const [selectedConference, setSelectedConference] = useState<Conference | null>(null)

    useEffect(() => {
        const storedUsername = localStorage.getItem('username')
        const storedEmail = localStorage.getItem('email')
        const storedID = localStorage.getItem('id')
        const storedRole = localStorage.getItem('userRole') as UserRole
        if (storedUsername && storedRole) {
            setUsername(storedUsername)
            setEmail(storedEmail || '')
            setUserID(storedID || '')
            setUserRole(storedRole)
            setIsLoggedIn(true)
        }
    }, [])

    const handleLogin = (user: string) => {
        setUsername(user)
        setIsLoggedIn(true)
        setShowLogin(false)
        localStorage.setItem('username', user)
        const storedEmail = localStorage.getItem('email')
        if (storedEmail) {
            setEmail(storedEmail)
        }
        const storedID = localStorage.getItem('id')
        if (storedID) {
            setUserID(storedID)
        }
    }

    const handleRoleSelect = (role: 'submitter' | 'reviewer') => {
        setUserRole(role)
        localStorage.setItem('userRole', role)
    }

    const handleBackToRoleSelection = () => {
        setUserRole(null)
        localStorage.removeItem('userRole')
    }

    const handleViewConferences = () => {
        setViewingConferences(true)
    }

    const handleSelectConference = (conference: Conference) => {
        setSelectedConference(conference)
    }

    const handleBackFromConferenceDetail = () => {
        setSelectedConference(null)
    }

    const handleBackFromConferences = () => {
        setSelectedConference(null)
        setViewingConferences(false)
    }

    const handleLogout = () => {//might not clear emails and ids??
        setIsLoggedIn(false)
        setShowLogin(false)
        setUsername('')
        setUserRole(null)
        setViewingConferences(false)
        setSelectedConference(null)
        localStorage.clear()
    }

    return (
        <>
            {!isLoggedIn ? (
                showLogin ? (
                    <Login onLogin={handleLogin} onBack={() => setShowLogin(false)} />
                ) : (
                    <LandingPage onEnterLogin={() => setShowLogin(true)} />
                )
            ) : viewingConferences ? (
                selectedConference ? (
                    <ConferenceDetail 
                        conference={selectedConference}
                        username={username}
                        onBack={handleBackFromConferenceDetail}
                    />
                ) : (
                    <ConferenceList 
                        username={username}
                        onSelectConference={handleSelectConference}
                        onBack={handleBackFromConferences}
                        onLogout={handleLogout}
                    />
                )
            ) : !userRole ? (
                <RoleSelection 
                    username={username}
                    onSelectRole={handleRoleSelect}
                    onViewConferences={handleViewConferences}
                    onLogout={handleLogout}
                />
            ) : userRole === 'submitter' ? (
                <SubmissionPage 
                    username={username}
                    email={email}
                    onBackToMain={handleBackToRoleSelection}
                />
            ) : (
                <ReviewerPage 
                    username={username} 
                    userID={userID}
                    onLogout={handleLogout}
                    onBackToMain={handleBackToRoleSelection}
                />
            )}
        </>
    )
}

export default App


  /*
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}
*/
