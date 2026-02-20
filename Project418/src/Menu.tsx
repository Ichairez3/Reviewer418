import { useState } from 'react'
import './Menu.css'

interface MenuProps {
    username: string
    onShowPreviousSubmissions: () => void
    onShowAccount: () => void
}

export function Menu({ username, onShowPreviousSubmissions, onShowAccount }: MenuProps) {
    const [isOpen, setIsOpen] = useState(false)

    const handleMenuToggle = () => {
        setIsOpen(!isOpen)
    }

    const handlePreviousSubmissions = () => {
        onShowPreviousSubmissions()
        setIsOpen(false)
    }

    const handleAccount = () => {
        onShowAccount()
        setIsOpen(false)
    }

    return (
        <div className="menu-container">
            <button
                className={`hamburger-button ${isOpen ? 'open' : ''}`}
                onClick={handleMenuToggle}
                aria-label="Toggle menu"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            {isOpen && (
                <div className="dropdown-menu">
                    <div className="dropdown-header">
                        <span className="username">Account: {username}</span>
                    </div>
                    <button
                        className="dropdown-item"
                        onClick={handlePreviousSubmissions}
                    >
                        Previous Submissions
                    </button>
                    <button
                        className="dropdown-item"
                        onClick={handleAccount}
                    >
                        Account
                    </button>
                </div>
            )}
        </div>
    )
}
