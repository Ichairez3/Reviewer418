import { useState, useEffect } from 'react'
import { Menu } from './Menu'
import './ReviewerPage.css'
import logo from './assets/logo.png'

interface ReviewerPageProps {
    username: string
    onLogout: () => void
    onBackToMain: () => void
}

interface Submission {
    _id: string
    title: string
    authors: string
    type: 'Paper' | 'Poster' | 'Workshop'
    submittedAt: string
}

interface Review {
    _id: string
    submission: {
        _id: string
        title: string
        authors: string
    }
    score: number
    comments: string
    submittedAt: string
}

export function ReviewerPage({ username, onLogout, onBackToMain }: ReviewerPageProps) {
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [reviews, setReviews] = useState<Review[]>([])
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

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [submissionsRes, reviewsRes] = await Promise.all([
                fetch('/api/submissions'),
                fetch('/api/reviews') // This would need to be updated to filter by reviewer
            ])

            if (submissionsRes.ok) {
                const data = await submissionsRes.json()
                setSubmissions(data)
            }

            if (reviewsRes.ok) {
                const data = await reviewsRes.json()
                setReviews(data)
            }
        } catch (err) {
            console.error('Error fetching data:', err)
            setError('Unable to load data')
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
                    reviewerId: 'current-reviewer-id', // Would come from auth
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
                <div className="tabs">
                    <button 
                        className={`tab ${activeTab === 'available' ? 'active' : ''}`}
                        onClick={() => setActiveTab('available')}
                    >
                        Available Submissions ({submissions.length})
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
                        {submissions.length === 0 ? (
                            <div className="empty-state">
                                <p>No submissions available for review</p>
                            </div>
                        ) : (
                            <div className="submissions-grid">
                                {submissions.map(sub => (
                                    <div key={sub._id} className="submission-card">
                                        <div className="card-header">
                                            <h3>{sub.title}</h3>
                                            <span className={`type-badge ${sub.type.toLowerCase()}`}>{sub.type}</span>
                                        </div>
                                        <p className="authors">Authors: {sub.authors}</p>
                                        <p className="date">Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</p>
                                        <button 
                                            className="review-btn"
                                            onClick={() => {
                                                setSelectedSubmission(sub)
                                                setShowReviewForm(true)
                                            }}
                                        >
                                            Review Now →
                                        </button>
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
                                {reviews.map(review => (
                                    <div key={review._id} className="review-card">
                                        <div className="review-header">
                                            <h3>{review.submission.title}</h3>
                                            <span className="score">Score: {review.score}/10</span>
                                        </div>
                                        <p className="authors">Authors: {review.submission.authors}</p>
                                        <p className="comments">{review.comments}</p>
                                        <p className="date">{new Date(review.submittedAt).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showReviewForm && selectedSubmission && (
                <div className="modal-overlay" onClick={() => setShowReviewForm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Review: {selectedSubmission.title}</h3>
                            <button className="close-btn" onClick={() => setShowReviewForm(false)}>×</button>
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
                            <button className="close-btn" onClick={closeModals}>×</button>
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
                            <button className="close-btn" onClick={closeModals}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Settings coming soon...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
