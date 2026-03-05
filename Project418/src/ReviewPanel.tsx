import { useState, useEffect } from 'react'
import './ReviewPanel.css'

interface Reviewer {
    _id: string
    name: string
    expertise: string
}

interface Review {
    _id: string
    score: number
    comments: string
    reviewer: Reviewer
    submittedAt: string
}

interface ReviewPanelProps {
    submissionId: string
    submissionTitle: string
    onClose: () => void
}

export function ReviewPanel({ submissionId, submissionTitle, onClose }: ReviewPanelProps) {
    const [reviews, setReviews] = useState<Review[]>([])
    const [reviewers, setReviewers] = useState<Reviewer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showReviewForm, setShowReviewForm] = useState(false)
    const [newReview, setNewReview] = useState({
        reviewerId: '',
        score: 5,
        comments: ''
    })

    useEffect(() => {
        Promise.all([fetchReviews(), fetchReviewers()])
            .finally(() => setLoading(false))
    }, [submissionId])

    const fetchReviews = async () => {
        try {
            const response = await fetch(`/api/submissions/${submissionId}/reviews`)
            if (response.ok) {
                const data = await response.json()
                setReviews(data)
            }
        } catch (err) {
            console.error('Error fetching reviews:', err)
            setError('Failed to load reviews')
        }
    }

    const fetchReviewers = async () => {
        try {
            const response = await fetch('/api/reviewers')
            if (response.ok) {
                const data = await response.json()
                setReviewers(data)
            }
        } catch (err) {
            console.error('Error fetching reviewers:', err)
        }
    }

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newReview.reviewerId) {
            setError('Please select a reviewer')
            return
        }

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submissionId,
                    reviewerId: newReview.reviewerId,
                    score: newReview.score,
                    comments: newReview.comments
                })
            })

            if (response.ok) {
                const created = await response.json()
                setReviews([...reviews, created])
                setNewReview({ reviewerId: '', score: 5, comments: '' })
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

    if (loading) {
        return (
            <div className="review-panel-overlay" onClick={onClose}>
                <div className="review-panel" onClick={(e) => e.stopPropagation()}>
                    <div className="panel-header">
                        <h3>{submissionTitle}</h3>
                        <button className="close-btn" onClick={onClose}>×</button>
                    </div>
                    <div className="loading">Loading reviews...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="review-panel-overlay" onClick={onClose}>
            <div className="review-panel" onClick={(e) => e.stopPropagation()}>
                <div className="panel-header">
                    <h3>{submissionTitle}</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="panel-content">
                    <div className="reviews-section">
                        <div className="section-header">
                            <h4>Reviews ({reviews.length})</h4>
                            <button 
                                className="add-review-btn"
                                onClick={() => setShowReviewForm(!showReviewForm)}
                            >
                                {showReviewForm ? '✕ Cancel' : '+ Add Review'}
                            </button>
                        </div>

                        {showReviewForm && (
                            <form className="review-form" onSubmit={handleSubmitReview}>
                                <div className="form-group">
                                    <label htmlFor="reviewer">Assign Reviewer</label>
                                    <select
                                        id="reviewer"
                                        value={newReview.reviewerId}
                                        onChange={(e) => setNewReview({ ...newReview, reviewerId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select a reviewer...</option>
                                        {reviewers.map(r => (
                                            <option key={r._id} value={r._id}>
                                                {r.name} ({r.expertise})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="score">Score (0-10)</label>
                                    <input
                                        id="score"
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={newReview.score}
                                        onChange={(e) => setNewReview({ ...newReview, score: parseInt(e.target.value) })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="comments">Comments</label>
                                    <textarea
                                        id="comments"
                                        value={newReview.comments}
                                        onChange={(e) => setNewReview({ ...newReview, comments: e.target.value })}
                                        placeholder="Enter review comments..."
                                        rows={4}
                                    />
                                </div>

                                <button type="submit" className="submit-review-btn">
                                    Submit Review
                                </button>
                            </form>
                        )}

                        {reviews.length === 0 ? (
                            <div className="no-reviews">
                                <p>No reviews yet</p>
                            </div>
                        ) : (
                            <div className="reviews-list">
                                {reviews.map(review => (
                                    <div key={review._id} className="review-item">
                                        <div className="review-header">
                                            <h5>{review.reviewer.name}</h5>
                                            <span className="score">Score: {review.score}/10</span>
                                        </div>
                                        <p className="expertise">{review.reviewer.expertise}</p>
                                        <p className="comments">{review.comments}</p>
                                        <p className="date">{new Date(review.submittedAt).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="stats-section">
                        <h4>Review Statistics</h4>
                        {reviews.length > 0 ? (
                            <div className="stats">
                                <div className="stat-item">
                                    <span className="label">Average Score</span>
                                    <span className="value">
                                        {(reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length).toFixed(1)}/10
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="label">Total Reviews</span>
                                    <span className="value">{reviews.length}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="no-stats">No reviews submitted yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
