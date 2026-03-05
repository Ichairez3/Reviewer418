import { useState, useEffect } from 'react'
import { ReviewPanel } from './ReviewPanel'
import './ConferenceDetail.css'

interface Conference {
    _id: string
    name: string
    date: string
    location: string
}

interface Submission {
    _id: string
    title: string
    authors: string
    type: 'Paper' | 'Poster' | 'Workshop'
    userId: { username: string }
    submittedAt: string
}

interface ConferenceDetailProps {
    conference: Conference
    username: string
    onBack: () => void
}

export function ConferenceDetail({ conference, username, onBack }: ConferenceDetailProps) {
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showSubmitModal, setShowSubmitModal] = useState(false)
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
    const [showReviewPanel, setShowReviewPanel] = useState(false)
    const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null)
    const [newSubmission, setNewSubmission] = useState({
        title: '',
        authors: '',
        type: 'Paper' as 'Paper' | 'Poster' | 'Workshop'
    })

    useEffect(() => {
        fetchSubmissions()
    }, [conference._id])

    const fetchSubmissions = async () => {
        try {
            const response = await fetch(`/api/conferences/${conference._id}/submissions`)
            if (response.ok) {
                const data = await response.json()
                setSubmissions(data)
            } else {
                setError('Failed to load submissions')
            }
        } catch (err) {
            console.error('Error fetching submissions:', err)
            setError('Unable to reach server')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmitSubmission = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSubmission.title || !newSubmission.authors) {
            setError('Title and authors are required')
            return
        }

        try {
            const response = await fetch('/api/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newSubmission.title,
                    authors: newSubmission.authors,
                    type: newSubmission.type,
                    conferenceId: conference._id,
                    userId: 'current-user-id' // This would be set from auth context
                })
            })

            if (response.ok) {
                const created = await response.json()
                setSubmissions([created, ...submissions])
                setNewSubmission({ title: '', authors: '', type: 'Paper' })
                setShowSubmitModal(false)
                setError('')
            } else {
                setError('Failed to submit')
            }
        } catch (err) {
            console.error('Error submitting:', err)
            setError('Unable to reach server')
        }
    }

    const handleViewReviews = (submission: Submission) => {
        setReviewingSubmission(submission)
        setShowReviewPanel(true)
    }

    if (loading) {
        return (
            <div className="conference-detail-container">
                <button className="back-btn" onClick={onBack}>← Back</button>
                <div className="loading">Loading...</div>
            </div>
        )
    }

    return (
        <div className="conference-detail-container">
            <button className="back-btn" onClick={onBack}>← Back to Conferences</button>

            <div className="detail-header">
                <div className="header-info">
                    <h1>{conference.name}</h1>
                    <p className="date">📅 {new Date(conference.date).toLocaleDateString()}</p>
                    <p className="location">📍 {conference.location}</p>
                </div>
                <button className="submit-btn" onClick={() => setShowSubmitModal(true)}>
                    + Submit Proposal
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {showSubmitModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Submit to {conference.name}</h3>
                            <button className="close-btn" onClick={() => setShowSubmitModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmitSubmission}>
                            <div className="form-group">
                                <label htmlFor="title">Title</label>
                                <input
                                    id="title"
                                    type="text"
                                    value={newSubmission.title}
                                    onChange={(e) => setNewSubmission({ ...newSubmission, title: e.target.value })}
                                    placeholder="Submission title"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="authors">Authors</label>
                                <input
                                    id="authors"
                                    type="text"
                                    value={newSubmission.authors}
                                    onChange={(e) => setNewSubmission({ ...newSubmission, authors: e.target.value })}
                                    placeholder="Author names (comma separated)"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="type">Submission Type</label>
                                <select
                                    id="type"
                                    value={newSubmission.type}
                                    onChange={(e) => setNewSubmission({ ...newSubmission, type: e.target.value as 'Paper' | 'Poster' | 'Workshop' })}
                                >
                                    <option value="Paper">Paper</option>
                                    <option value="Poster">Poster</option>
                                    <option value="Workshop">Workshop</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowSubmitModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-form-btn">
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="submissions-section">
                <h2>Submissions</h2>
                {submissions.length === 0 ? (
                    <div className="no-submissions">
                        <p>No submissions yet</p>
                    </div>
                ) : (
                    <div className="submissions-list">
                        {submissions.map((sub) => (
                            <div 
                                key={sub._id} 
                                className="submission-item"
                                onClick={() => setSelectedSubmission(sub)}
                            >
                                <div className="submission-header">
                                    <h3>{sub.title}</h3>
                                    <span className={`type-badge ${sub.type.toLowerCase()}`}>{sub.type}</span>
                                </div>
                                <p className="authors">By: {sub.authors}</p>
                                <p className="submitter">Submitted by: {sub.userId.username}</p>
                                <p className="date">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                                <button 
                                    className="view-reviews-btn"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleViewReviews(sub)
                                    }}
                                >
                                    View Reviews →
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedSubmission && (
                <div className="modal-overlay" onClick={() => setSelectedSubmission(null)}>
                    <div className="modal submission-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedSubmission.title}</h3>
                            <button className="close-btn" onClick={() => setSelectedSubmission(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Authors:</strong> {selectedSubmission.authors}</p>
                            <p><strong>Type:</strong> {selectedSubmission.type}</p>
                            <p><strong>Submitter:</strong> {selectedSubmission.userId.username}</p>
                            <p><strong>Submitted:</strong> {new Date(selectedSubmission.submittedAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {showReviewPanel && reviewingSubmission && (
                <ReviewPanel 
                    submissionId={reviewingSubmission._id}
                    submissionTitle={reviewingSubmission.title}
                    onClose={() => {
                        setShowReviewPanel(false)
                        setReviewingSubmission(null)
                    }}
                />
            )}
        </div>
    )
}
