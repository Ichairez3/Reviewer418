import { useState } from 'react'
import './Login.css'

interface LoginProps {
    onLogin: (username: string) => void
}

export function Login({ onLogin }: LoginProps) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [email, setEmail] = useState('')
    const [isSignup, setIsSignup] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login'
            const payload = isSignup
                ? { username, email, password }
                : { username, password }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json()

            if (response.ok) {
                localStorage.setItem('username', username)
                setLoading(false)
                onLogin(username)
            } else {
                setError(data.error || 'Authentication failed')
                setLoading(false)
            }

        } catch (err) {
            console.error('Network error:', err)
            setError('Unable to reach server. Please try again later.')
            setLoading(false)
        }
    }
    return (
        <div className = "login-container">
            <div className = "login-box">
                <h1> Reviewer418 </h1>
                <h2>{isSignup ? 'Create Account' : 'Login'}</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit = {handleSubmit}>
                    <div className = "form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id = "username"
                            type = "text"
                            value = {username}
                            onChange = {(e) => setUsername(e.target.value)}
                            required
                            placeholder = "Enter your Username"
                        />
                    </div>

                    {isSignup && (
                        <div className = "form-group">
                            <label htmlFor = "email">Email</label>
                            <input
                                id = "email"
                                type = "email"
                                value = {email}
                                onChange = {(e) => setEmail(e.target.value)}
                                required
                                placeholder = "Enter your Email"
                            />
                        </div>
                    )}

                    <div className = "form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id = "password"
                            type = "password"
                            value = {password}
                            onChange = {(e) => setPassword(e.target.value)}
                            required
                            placeholder = "Enter Your Password"
                        />
                    </div>

                    <button
                        type = "submit"
                        className = "login-btn"
                        disabled = {loading}
                    >
                        {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Login'}
                    </button>
                </form>

                <div className = "toggle-auth">
                    <p>
                        {isSignup ? 'Already have an account?' : "Dont have an Account?"}
                        {' '}
                        <button
                            type = "button"
                            onClick = {() => {
                                setIsSignup(!isSignup)
                                setError('')
                            }}
                            className = "toggle-btn"
                        >
                            {isSignup ? 'Login' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}