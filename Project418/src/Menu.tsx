import { useState } from 'react'
import './Menu.css'
import {
    cancelReviewerPriorityRequest,
    hasReviewerRequest,
    requestReviewerPriority,
} from './reviewerRequests'

interface MenuProps {
    username: string
    onShowPreviousSubmissions: () => void
    onShowAccount: () => void
    onShowSettings?: () => void
}

export function Menu({ username, onShowPreviousSubmissions, onShowAccount, onShowSettings }: MenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [hasRequestedReviewerPriority, setHasRequestedReviewerPriority] = useState(() => hasReviewerRequest(username))

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

    const handleReviewerRequest = () => {
        if (hasRequestedReviewerPriority) {
            cancelReviewerPriorityRequest(username)
            setHasRequestedReviewerPriority(false)
            return
        }

        requestReviewerPriority(username)
        setHasRequestedReviewerPriority(true)
    }

    const handleSettings = () => {
        if (onShowSettings) {
            onShowSettings()
            setIsOpen(false)
        }
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
                    <button
                        className={`dropdown-item reviewer-request-item ${hasRequestedReviewerPriority ? 'active' : ''}`}
                        onClick={handleReviewerRequest}
                    >
                        {hasRequestedReviewerPriority ? 'Reviewer Request Sent' : 'Request to be Reviewer'}
                    </button>
                    {onShowSettings && (
                        <button
                            className="dropdown-item"
                            onClick={handleSettings}
                        >
                            Settings
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
