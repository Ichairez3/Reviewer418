import { useState, useEffect } from 'react'
import { Menu } from './Menu'
import './ReviewerPage.css'
import logo from './assets/logo.png'
import { set } from 'mongoose'

interface ReviewerPageProps {
    username: string
    userID: string
    systemRole: 'owner' | 'admin' | 'user'
    onLogout: () => void
    onBackToMain: () => void
}

interface Conference {
    _id: string
    name: string
    date: string
    location: string
}

interface Submission {
    _id: string
    originalName: string
    fileName: string
    fileSize: number
    uploadedAt: string
    submitterEmail: string
}

interface Review {
    _id: string
    submission: {
        _id: string
        fileName: string
        submitterEmail: string
    }
    score: number
    comments: string
    submittedAt: string
    reviewer: string
}

export function ReviewerPage({ username, userID, systemRole, onLogout, onBackToMain }: ReviewerPageProps) {
    const [reviews, setReviews] = useState<Review[]>([])
    const [conferences, setConferences] = useState<Conference[]>([])
    const [selectedConference, setSelectedConference] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available')
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
    const [reviewForm, setReviewForm] = useState({
        score: 5,
        comments: ''
    })
    const [showReviewForm, setShowReviewForm] = useState(false)
    const [showAccountModal, setShowAccountModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [deletingSubmissionId, setDeletingSubmissionId] = useState<string | null>(null)
    const [submissionHistory, setSubmissionHistory] = useState<Array<{ submission: Submission }>>([])

    useEffect(() => {
        fetchSubmissions()
        fetchReviews()
        fetchConferences()
    }, [])

    useEffect(() => {
        if (selectedConference) {
            setError('')
        } else {
            setReviews([])
            fetchReviews()
        }
    }, [selectedConference])

    const fetchSubmissions = async () => {
        try {
            const response = await fetch('/api/papers')
            if (response.ok) {
                const papers = await response.json()
                const formatted = papers.map((paper: Submission) => ({
                    submission: paper
                }))
                setSubmissionHistory(formatted)
            }
        } catch (err) {
            console.error('Failed to fetch submissions:', err)
        }
    }

    const fetchReviews = async () => {
        try {
            const response = await fetch('/api/reviews')
            if (response.ok) {
                const reviewsJson = await response.json()
                const userReviews = reviewsJson.filter((review: Review) => review.reviewer === userID)
                const reviewMap = userReviews.map((review: Review) => ({
                    _id: review._id,
                    submission: review.submission,
                    score: review.score,
                    comments: review.comments,
                    submittedAt: review.submittedAt,
                    reviewer: review.reviewer
                }))
                setReviews(reviewMap)
            }
        } catch (err) {
            console.error('Failed to fetch reviews:', err)
        }
    }

    const fetchConferences = async () => {
        try {
            const response = await fetch('/api/conferences')
            if (response.ok) {
                const data = await response.json()
                setConferences(data)
            }
        } catch (err) {
            console.error('Failed to fetch conferences:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedSubmission || !reviewForm.comments) {
            setError('Please fill in all fields')
            return
        }

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submissionId: selectedSubmission._id,
                    reviewer: userID,
                    score: reviewForm.score,
                    comments: reviewForm.comments
                })
            })

            if (response.ok) {
                const created = await response.json()
                setReviews([...reviews, created])
                setReviewForm({ score: 5, comments: '' })
                setSelectedSubmission(null)
                setShowReviewForm(false)
                setError('')
            } else {
                setError('Failed to submit review')
            }
        } catch (err) {
            console.error('Error submitting review:', err)
            setError('Unable to reach server')
        }
    }

    const handleDeleteSubmission = async (submissionId: string, fileName: string) => {
        if (!window.confirm(`Delete submission "${fileName}"? This cannot be undone.`)) {
            return
        }

        setDeletingSubmissionId(submissionId)
        try {
            const response = await fetch(`/api/papers/${submissionId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestedBy: username
                })
            })

            const data = await response.json()
            if (!response.ok) {
                setError(data.error || 'Failed to delete submission')
                return
            }

            setSubmissionHistory((currentSubmissions) =>
                currentSubmissions.filter((entry) => entry.submission._id !== submissionId)
            )
            setError('')
        } catch (err) {
            console.error('Error deleting submission:', err)
            setError('Unable to reach server')
        } finally {
            setDeletingSubmissionId(null)
        }
    }

    const closeModals = () => {
        setShowAccountModal(false)
        setShowSettingsModal(false)
    }

    const handleShowAccount = () => {
        setShowAccountModal(true)
    }

    const handleShowSettings = () => {
        setShowSettingsModal(true)
    }

    const handleChangeUsername = async (e: React.FormEvent) => {
        e.preventDefault()
        const input = document.getElementById('newUsername') as HTMLInputElement//gets value from html input element
        const newUsername = input.value.trim()//trims whitespace from input vusername
        if (!newUsername || newUsername === username) {//makes sure a username is input/that the new username is different from the old username
            setError('Please enter a new username')
            return
        }
        
        try {
            //start of username already taken check
            const response = await fetch('/api/users')
            if (response.ok) {
                const users = await response.json()
                const usernameExists = users.some((user: { username: string }) => user.username === newUsername)
                
                if (usernameExists) {
                    setError('Username already taken')
                    return
                }
                //end of username already taken check

                //start of username update
                const updateResponse = await fetch(`/api/users/${userID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: newUsername
                })
                })
                if (!updateResponse.ok) {
                    setError(`Failed to update username`)
                    return
                }
                const updatedUser = await updateResponse.json()
                setError('Username updated to ' + updatedUser.username + '. Please log out and log back in to see changes.')//using error handler for success message. hooray for reuse!
                //end of username update
                
            } else {
                setError('Failed to validate username')
                return
            }
            return

            
        } catch (err) {
                console.error('Error updating username:', err)
                setError('Unable to reach server')
                return
            }
    }


    const getPaperDownloadUrl = (submission: Submission) => `/api/papers/${submission._id}`
    const canDeleteSubmissions = systemRole === 'owner' || systemRole === 'admin'

    if (loading) {
        return <div className="loading">Loading...</div>
    }

    return (
        <div className="reviewer-container">
            <div className="reviewer-header">
                <div className="header-content">
                    <img
                        src={logo}
                        alt="Reviewer418 Logo"
                        className="header-logo"
                        onClick={onBackToMain}
                        style={{ cursor: 'pointer' }}
                        title="Click to change role"
                    />
                    <h1>Reviewer418</h1>
                </div>
                <div className="header-actions">
                    <Menu
                        username={username}
                        onShowPreviousSubmissions={() => setActiveTab('completed')}
                        onShowAccount={handleShowAccount}
                        onShowSettings={handleShowSettings}
                    />
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="reviewer-content">
                {!selectedConference && (
                    <div className="conference-selector">
                        <label htmlFor="conference">Select Conference to Review</label>
                        <select
                            id="conference"
                            value={selectedConference}
                            onChange={(e) => setSelectedConference(e.target.value)}
                        >
                            <option value="">-- Choose a conference --</option>
                            {conferences.map((conf) => (
                                <option key={conf._id} value={conf._id}>
                                    {conf.name} ({new Date(conf.date).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                        {conferences.length === 0 && (
                            <p className="no-conferences-message">No conferences available</p>
                        )}
                    </div>
                )}

                {selectedConference && (
                    <>
                        <div className="tabs">
                            <button
                                className={`tab ${activeTab === 'available' ? 'active' : ''}`}
                                onClick={() => setActiveTab('available')}
                            >
                                Available Submissions ({submissionHistory.length})
                            </button>
                            <button
                                className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                                onClick={() => setActiveTab('completed')}
                            >
                                My Reviews ({reviews.length})
                            </button>
                        </div>

                        {activeTab === 'available' && (
                            <div className="submissions-section">
                                <h2>Submissions to Review</h2>
                                {submissionHistory.length === 0 ? (
                                    <div className="empty-state">
                                        <p>No submissions available for review</p>
                                    </div>
                                ) : (
                                    <div className="submissions-grid">
                                        {submissionHistory.map((sub) => (
                                            <div key={sub.submission._id} className="submission-card">
                                                <div className="card-header">
                                                    <h3>{sub.submission.originalName || sub.submission.fileName}</h3>
                                                </div>
                                                <p className="authors">Authors: {sub.submission.submitterEmail}</p>
                                                <p className="date">Submitted: {new Date(sub.submission.uploadedAt).toLocaleDateString()}</p>
                                                <div className="submission-actions">
                                                    <a
                                                        className="download-btn"
                                                        href={getPaperDownloadUrl(sub.submission)}
                                                        download={sub.submission.originalName || sub.submission.fileName}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Download
                                                    </a>
                                                    <button
                                                        className="review-btn"
                                                        onClick={() => {
                                                            setSelectedSubmission(sub.submission)
                                                            setShowReviewForm(true)
                                                        }}
                                                    >
                                                        Review Now {'->'}
                                                    </button>
                                                    {canDeleteSubmissions && (
                                                        <button
                                                            className="delete-submission-btn"
                                                            onClick={() => handleDeleteSubmission(sub.submission._id, sub.submission.originalName || sub.submission.fileName)}
                                                            disabled={deletingSubmissionId === sub.submission._id}
                                                        >
                                                            {deletingSubmissionId === sub.submission._id ? 'Deleting...' : 'Delete'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'completed' && (
                            <div className="reviews-section">
                                <h2>My Submitted Reviews</h2>
                                {reviews.length === 0 ? (
                                    <div className="empty-state">
                                        <p>You haven't submitted any reviews yet</p>
                                    </div>
                                ) : (
                                    <div className="reviews-list">
                                        {reviews.map((review) => (
                                            <div key={review._id} className="review-card">
                                                <div className="review-header">
                                                    <h3>{review.submission.fileName}</h3>
                                                    <span className="score">Score: {review.score}/10</span>
                                                </div>
                                                <p className="authors">Authors: {review.submission.submitterEmail}</p>
                                                <p className="comments">{review.comments}</p>
                                                <p className="date">{new Date(review.submittedAt).toLocaleDateString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {showReviewForm && selectedSubmission && (
                <div className="modal-overlay" onClick={() => setShowReviewForm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Review: {selectedSubmission.fileName}</h3>
                            <button className="close-btn" onClick={() => setShowReviewForm(false)}>x</button>
                        </div>
                        <form onSubmit={handleSubmitReview} className="review-form">
                            <div className="form-group">
                                <label htmlFor="score">Score (0-10)</label>
                                <input
                                    id="score"
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={reviewForm.score}
                                    onChange={(e) => setReviewForm({ ...reviewForm, score: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="comments">Comments</label>
                                <textarea
                                    id="comments"
                                    value={reviewForm.comments}
                                    onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                                    placeholder="Enter your review comments..."
                                    rows={6}
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowReviewForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    Submit Review
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAccountModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Account Information</h3>
                            <button className="close-btn" onClick={closeModals}>x</button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Username:</strong> {username}</p>
                            <p><strong>Role:</strong> Reviewer</p>
                            <p><strong>Total Reviews:</strong> {reviews.length}</p>
                            <button className="logout-btn" onClick={onLogout}>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSettingsModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Settings</h3>
                            <button className="close-btn" onClick={closeModals}>x</button>
                        </div>
                        <div className="modal-body">
                            <form className="change-username" onSubmit={handleChangeUsername}>
                                <input type='text' placeholder={username} id='newUsername'></input>
                                <button type='submit'>Change Username</button>
                            </form>
                            <p>Settings coming soon...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
