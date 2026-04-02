import { useState, useEffect } from 'react'
import { Login } from './Login'
import { RoleSelection } from './RoleSelection'
import { SubmissionPage } from './SubmissionPage'
import { ReviewerPage } from './ReviewerPage'
import './App.css'

type UserRole = 'submitter' | 'reviewer' | null

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [userRole, setUserRole] = useState<UserRole>(null)

    useEffect(() => {
        const storedUsername = localStorage.getItem('username')
        const storedEmail = localStorage.getItem('email')
        const storedRole = localStorage.getItem('userRole') as UserRole
        if (storedUsername && storedRole) {
            setUsername(storedUsername)
            setEmail(storedEmail || '')
            setUserRole(storedRole)
            setIsLoggedIn(true)
        }
    }, [])

    const handleLogin = (user: string) => {
        setUsername(user)
        setIsLoggedIn(true)
        localStorage.setItem('username', user)
        const storedEmail = localStorage.getItem('email')
        if (storedEmail) {
            setEmail(storedEmail)
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

    const handleLogout = () => {
        setIsLoggedIn(false)
        setUsername('')
        setUserRole(null)
        localStorage.clear()
    }

    return (
        <>
            {!isLoggedIn ? (
                <Login onLogin={handleLogin} />
            ) : !userRole ? (
                <RoleSelection 
                    username={username}
                    onSelectRole={handleRoleSelect}
                    onLogout={handleLogout}
                />
            ) : userRole === 'submitter' ? (
                <SubmissionPage 
                    username={username}
                    email={email}
                    onLogout={handleLogout}
                    onBackToMain={handleBackToRoleSelection}
                />
            ) : (
                <ReviewerPage 
                    username={username} 
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
