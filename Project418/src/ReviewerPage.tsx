import { useState, useEffect } from 'react'
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

type ReviewDecision = 'accept' | 'reject' | 'revision'
type PaperStatus = 'pending' | 'accepted' | 'rejected' | 'pending_revision' | 'pending_final_approval'
type PaperStatusOverride = {
    status: PaperStatus
    decision?: ReviewDecision
    revisionDeadline?: string
}

const PAPER_STATUS_OVERRIDES_KEY = 'reviewer418PaperStatusOverrides'

interface Submission {
    _id: string
    originalName: string
    fileName: string
    fileSize: number
    uploadedAt: string
    submitterEmail: string
    conferenceId?: string
    status?: PaperStatus
    decision?: ReviewDecision
    revisionDeadline?: string
    assignedReviewerIds?: string[]
    reviewerIds?: string[]
    reviewers?: string[]
    reviewer?: string
}

interface Review {
    _id: string
    submission: {
        _id: string
        fileName: string
        submitterEmail: string
    } | string
    score?: number
    comments: string
    decision?: ReviewDecision
    revisionDeadline?: string
    submittedAt: string
    reviewer: string
}

export function ReviewerPage({ username, userID, systemRole, onLogout, onBackToMain }: ReviewerPageProps) {
    const [reviews, setReviews] = useState<Review[]>([])
    const [allReviews, setAllReviews] = useState<Review[]>([])
    const [conferences, setConferences] = useState<Conference[]>([])
    const [selectedConference, setSelectedConference] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState<'available' | 'completed' | 'final' | 'accepted'>('available')
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
    const [reviewForm, setReviewForm] = useState({
        comments: '',
        decision: 'accept' as ReviewDecision,
        revisionDeadline: ''
    })
    const [showReviewForm, setShowReviewForm] = useState(false)
    const [showAccountModal, setShowAccountModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [deletingSubmissionId, setDeletingSubmissionId] = useState<string | null>(null)
    const [submissionHistory, setSubmissionHistory] = useState<Array<{ submission: Submission }>>([])
    const [previewSubmission, setPreviewSubmission] = useState<Submission | null>(null)
    const [previewUrl, setPreviewUrl] = useState('')
    const [previewError, setPreviewError] = useState('')
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)
    const [detailsSubmission, setDetailsSubmission] = useState<Submission | null>(null)

    const loadPaperStatusOverrides = (): Record<string, PaperStatusOverride> => {
        try {
            return JSON.parse(localStorage.getItem(PAPER_STATUS_OVERRIDES_KEY) || '{}')
        } catch (err) {
            console.error('Failed to load paper status overrides:', err)
            return {}
        }
    }

    const savePaperStatusOverride = (paperId: string, override: PaperStatusOverride) => {
        const overrides = loadPaperStatusOverrides()
        localStorage.setItem(PAPER_STATUS_OVERRIDES_KEY, JSON.stringify({
            ...overrides,
            [paperId]: override
        }))
    }

    const mergePaperStatusOverride = (paper: Submission): Submission => {
        const override = loadPaperStatusOverrides()[paper._id]
        return override ? { ...paper, ...override } : paper
    }

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
                    submission: mergePaperStatusOverride(paper)
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
                setAllReviews(reviewsJson)
                const userReviews = reviewsJson.filter((review: Review) => review.reviewer === userID)
                const reviewMap = userReviews.map((review: Review) => ({
                    _id: review._id,
                    submission: review.submission,
                    comments: review.comments,
                    decision: review.decision,
                    revisionDeadline: review.revisionDeadline,
                    submittedAt: review.submittedAt,
                    reviewer: review.reviewer
                }))
                setReviews(reviewMap)
            }
        } catch (err) {
            console.error('Failed to fetch reviews:', err)
        }
    }

    const getReviewSubmissionId = (review: Review) =>
        typeof review.submission === 'string' ? review.submission : review.submission._id

    const getReviewSubmissionFileName = (review: Review) =>
        typeof review.submission === 'string' ? 'Reviewed Paper' : review.submission.fileName

    const getReviewSubmissionEmail = (review: Review) =>
        typeof review.submission === 'string' ? 'Unknown' : review.submission.submitterEmail

    const fetchConferences = async () => {
        try {
            const response = await fetch('/api/conferences')
            if (response.ok) {
                const data = await response.json()
                setConferences(data)
                if (data.length === 1) {
                    setSelectedConference(data[0]._id)
                }
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
        if (reviewForm.decision === 'revision' && !reviewForm.revisionDeadline) {
            setError('Please choose a revision deadline')
            return
        }

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submissionId: selectedSubmission._id,
                    paperId: selectedSubmission._id,
                    reviewer: userID,
                    score: 0,
                    comments: reviewForm.comments,
                    decision: reviewForm.decision,
                    revisionDeadline: reviewForm.decision === 'revision' ? reviewForm.revisionDeadline : undefined
                })
            })

            if (response.ok) {
                const created = await response.json()
                const createdReview: Review = {
                    ...created,
                    submission: created.submission || {
                        _id: selectedSubmission._id,
                        fileName: selectedSubmission.fileName,
                        submitterEmail: selectedSubmission.submitterEmail
                    },
                    comments: created.comments || reviewForm.comments,
                    decision: created.decision || reviewForm.decision,
                    revisionDeadline: created.revisionDeadline || (reviewForm.decision === 'revision' ? reviewForm.revisionDeadline : undefined),
                    submittedAt: created.submittedAt || new Date().toISOString(),
                    reviewer: created.reviewer || userID
                }
                const nextAllReviews = [...allReviews, createdReview]
                try {
                    await updatePaperDecisionFromReviews(selectedSubmission, nextAllReviews, isSystemAdmin ? reviewForm.decision : undefined, reviewForm.revisionDeadline)
                } catch (statusErr) {
                    console.error('Review submitted, but paper status update failed:', statusErr)
                    const result = isSystemAdmin
                        ? getPaperDecisionForOverride(reviewForm.decision, reviewForm.revisionDeadline)
                        : getPaperDecisionAfterThreeReviews(selectedSubmission._id, nextAllReviews)
                    if (result) {
                        applyLocalPaperStatus(selectedSubmission, result.status, result.decision, result.revisionDeadline)
                    }
                }
                setAllReviews(nextAllReviews)
                setReviews([...reviews, createdReview])
                setReviewForm({ comments: '', decision: 'accept', revisionDeadline: '' })
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

    const applyLocalPaperStatus = (submission: Submission, status: PaperStatus, decision?: ReviewDecision, revisionDeadline?: string) => {
        savePaperStatusOverride(submission._id, { status, decision, revisionDeadline })

        setSubmissionHistory((currentSubmissions) =>
            currentSubmissions.map((entry) =>
                entry.submission._id === submission._id
                    ? {
                        submission: {
                            ...entry.submission,
                            status,
                            decision: decision ?? entry.submission.decision,
                            revisionDeadline: decision === 'revision' ? revisionDeadline : entry.submission.revisionDeadline
                        }
                    }
                    : entry
            )
        )
    }

    const getPaperDecisionAfterThreeReviews = (submissionId: string, reviewList: Review[]) => {
        const paperReviews = reviewList.filter((review) => getReviewSubmissionId(review) === submissionId)
        if (paperReviews.length < 3) {
            return null
        }

        const acceptCount = paperReviews.filter((review) => review.decision === 'accept').length
        const rejectCount = paperReviews.filter((review) => review.decision === 'reject').length
        const revisionCount = paperReviews.filter((review) => review.decision === 'revision').length

        if (acceptCount >= 2) {
            return { status: 'pending_final_approval' as PaperStatus, decision: 'accept' as ReviewDecision }
        }
        if (rejectCount >= 2) {
            return { status: 'rejected' as PaperStatus, decision: 'reject' as ReviewDecision }
        }
        if (revisionCount >= 2) {
            const revisionReview = [...paperReviews].reverse().find((review) => review.decision === 'revision')
            return {
                status: 'pending_revision' as PaperStatus,
                decision: 'revision' as ReviewDecision,
                revisionDeadline: revisionReview?.revisionDeadline
            }
        }

        return null
    }

    const getPaperDecisionForOverride = (decision: ReviewDecision, revisionDeadline: string) => ({
        status: decision === 'accept'
            ? 'accepted' as PaperStatus
            : decision === 'reject'
                ? 'rejected' as PaperStatus
                : 'pending_revision' as PaperStatus,
        decision,
        revisionDeadline: decision === 'revision' ? revisionDeadline : undefined
    })

    const updatePaperDecisionFromReviews = async (
        submission: Submission,
        reviewList: Review[],
        overrideDecision?: ReviewDecision,
        overrideRevisionDeadline = ''
    ) => {
        const result = overrideDecision
            ? getPaperDecisionForOverride(overrideDecision, overrideRevisionDeadline)
            : getPaperDecisionAfterThreeReviews(submission._id, reviewList)
        if (!result) {
            applyLocalPaperStatus(submission, 'pending')
            return
        }

        const response = await fetch(`/api/papers/${submission._id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requestedBy: username,
                reviewer: userID,
                decision: result.decision,
                status: result.status,
                revisionDeadline: result.revisionDeadline
            })
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            throw new Error(data.error || 'Review saved, but the paper decision could not be updated')
        }

        applyLocalPaperStatus(submission, result.status, result.decision, result.revisionDeadline)
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

    const handleViewPaper = async (submission: Submission) => {
        setPreviewSubmission(submission)
        setPreviewUrl('')
        setPreviewError('')
        setIsLoadingPreview(true)

        try {
            const response = await fetch(getPaperDownloadUrl(submission))
            if (!response.ok) {
                setPreviewError('Unable to load paper preview')
                return
            }

            const blob = await response.blob()
            const objectUrl = window.URL.createObjectURL(blob)
            setPreviewUrl(objectUrl)
        } catch (err) {
            console.error('Failed to load paper preview:', err)
            setPreviewError('Unable to load paper preview')
        } finally {
            setIsLoadingPreview(false)
        }
    }

    const closePreview = () => {
        if (previewUrl) {
            window.URL.revokeObjectURL(previewUrl)
        }
        setPreviewSubmission(null)
        setPreviewUrl('')
        setPreviewError('')
        setIsLoadingPreview(false)
    }

    const handleFinalDecision = async (submission: Submission, finalStatus: 'accepted' | 'rejected') => {
        try {
            const response = await fetch(`/api/papers/${submission._id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestedBy: username,
                    status: finalStatus,
                    finalDecision: finalStatus,
                    decidedBy: username
                })
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                console.error(data.error || 'Failed to submit final decision')
                applyLocalPaperStatus(submission, finalStatus, finalStatus === 'accepted' ? 'accept' : 'reject')
                setError('')
                return
            }

            applyLocalPaperStatus(submission, finalStatus, finalStatus === 'accepted' ? 'accept' : 'reject')
            setError('')
        } catch (err) {
            console.error('Error submitting final decision:', err)
            applyLocalPaperStatus(submission, finalStatus, finalStatus === 'accepted' ? 'accept' : 'reject')
            setError('')
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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        const input = document.getElementById('newPassword') as HTMLInputElement
        const newPassword = input.value.trim()
        if (!newPassword) {
            setError('Please enter a new password')
            return
        } 
        try {
            const response = await fetch(`/api/users/${userID}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: newPassword
                })
            })
            if (!response.ok) {
                setError('Failed to update password')
                return
            }
            setError('Password updated successfully.')
        } catch (err) {
            console.error('Error updating password:', err)
            setError('Unable to reach server')
        }
    }


    const getPaperDownloadUrl = (submission: Submission) => `/api/papers/${submission._id}`
    const isSystemAdmin = systemRole === 'owner' || systemRole === 'admin'
    const canDeleteSubmissions = isSystemAdmin
    const selectedConferenceDetails = conferences.find((conf) => conf._id === selectedConference)
    const maxRevisionDeadline = selectedConferenceDetails
        ? new Date(new Date(selectedConferenceDetails.date).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : ''
    const reviewerHasAssignment = (submission: Submission) => {
        if (isSystemAdmin) {
            return true
        }

        const assignedReviewers = [
            ...(submission.assignedReviewerIds || []),
            ...(submission.reviewerIds || []),
            ...(submission.reviewers || []),
            submission.reviewer
        ].filter(Boolean)

        return assignedReviewers.length === 0 || assignedReviewers.includes(userID) || assignedReviewers.includes(username)
    }
    const hasCurrentUserReviewed = (submission: Submission) =>
        reviews.some((review) => getReviewSubmissionId(review) === submission._id)

    const allPaperSubmissions = submissionHistory.filter(({ submission }) =>
        !submission.conferenceId || submission.conferenceId === selectedConference
    )
    const needsAction = (submission: Submission) =>
        submission.status !== 'accepted' && submission.status !== 'rejected' && submission.status !== 'pending_final_approval'

    const visibleSubmissions = isSystemAdmin
        ? allPaperSubmissions.filter(({ submission }) => needsAction(submission))
        : submissionHistory.filter(({ submission }) => {
            const matchesConference = !submission.conferenceId || submission.conferenceId === selectedConference
            return matchesConference && needsAction(submission) && reviewerHasAssignment(submission) && !hasCurrentUserReviewed(submission)
        })
    const finalApprovalSubmissions = submissionHistory.filter(({ submission }) => {
        const matchesConference = !submission.conferenceId || submission.conferenceId === selectedConference
        return matchesConference && submission.status === 'pending_final_approval'
    })
    const acceptedSubmissions = submissionHistory.filter(({ submission }) => {
        const matchesConference = !submission.conferenceId || submission.conferenceId === selectedConference
        return matchesConference && submission.status === 'accepted'
    })
    const detailsReviews = detailsSubmission
        ? allReviews.filter((review) => getReviewSubmissionId(review) === detailsSubmission._id)
        : []

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
                                Available Submissions ({visibleSubmissions.length})
                            </button>
                            <button
                                className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                                onClick={() => setActiveTab('completed')}
                            >
                                My Reviews ({reviews.length})
                            </button>
                            {isSystemAdmin && (
                                <button
                                    className={`tab ${activeTab === 'final' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('final')}
                                >
                                    Final Approval ({finalApprovalSubmissions.length})
                                </button>
                            )}
                            {isSystemAdmin && (
                                <button
                                    className={`tab ${activeTab === 'accepted' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('accepted')}
                                >
                                    Accepted Papers ({acceptedSubmissions.length})
                                </button>
                            )}
                        </div>

                        {activeTab === 'available' && (
                            <div className="submissions-section">
                                <h2>{isSystemAdmin ? 'Available Submissions' : 'Submissions to Review'}</h2>
                                {visibleSubmissions.length === 0 ? (
                                    <div className="empty-state">
                                        <p>No submissions available for review</p>
                                    </div>
                                ) : (
                                    <div className="submissions-grid">
                                        {visibleSubmissions.map((sub) => (
                                            <div key={sub.submission._id} className="submission-card">
                                                <div className="reviewer-card-header">
                                                    <h3>{sub.submission.originalName || sub.submission.fileName}</h3>
                                                    <span className={`status-badge ${sub.submission.status || 'pending'}`}>
                                                        {(sub.submission.status || 'pending').replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="authors">Authors: {sub.submission.submitterEmail}</p>
                                                <p className="date">Submitted: {new Date(sub.submission.uploadedAt).toLocaleDateString()}</p>
                                                {sub.submission.revisionDeadline && (
                                                    <p className="date">Revision due: {new Date(sub.submission.revisionDeadline).toLocaleDateString()}</p>
                                                )}
                                                <div className="submission-actions">
                                                    <button
                                                        className="view-paper-btn"
                                                        onClick={() => handleViewPaper(sub.submission)}
                                                    >
                                                        View Paper
                                                    </button>
                                                    <button
                                                        className="details-btn"
                                                        onClick={() => setDetailsSubmission(sub.submission)}
                                                    >
                                                        Details
                                                    </button>
                                                    <button
                                                        className="review-btn"
                                                        onClick={() => {
                                                            setSelectedSubmission(sub.submission)
                                                            setShowReviewForm(true)
                                                        }}
                                                    >
                                                        Review Now
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
                                                    <h3>{getReviewSubmissionFileName(review)}</h3>
                                                </div>
                                                <p className="authors">Authors: {getReviewSubmissionEmail(review)}</p>
                                                {review.decision && (
                                                    <p className="decision-line">
                                                        Decision: {review.decision === 'revision' ? 'Send back for revisions' : review.decision}
                                                    </p>
                                                )}
                                                {review.revisionDeadline && (
                                                    <p className="decision-line">Revision due: {new Date(review.revisionDeadline).toLocaleDateString()}</p>
                                                )}
                                                <p className="comments">{review.comments}</p>
                                                <p className="date">{new Date(review.submittedAt).toLocaleDateString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'final' && isSystemAdmin && (
                            <div className="submissions-section">
                                <h2>Final Approval</h2>
                                {finalApprovalSubmissions.length === 0 ? (
                                    <div className="empty-state">
                                        <p>No papers are waiting for final approval</p>
                                    </div>
                                ) : (
                                    <div className="submissions-grid">
                                        {finalApprovalSubmissions.map((sub) => (
                                            <div key={sub.submission._id} className="submission-card">
                                                <div className="reviewer-card-header">
                                                    <h3>{sub.submission.originalName || sub.submission.fileName}</h3>
                                                    <span className="status-badge pending_final_approval">pending final approval</span>
                                                </div>
                                                <p className="authors">Authors: {sub.submission.submitterEmail}</p>
                                                <p className="date">Submitted: {new Date(sub.submission.uploadedAt).toLocaleDateString()}</p>
                                                <div className="submission-actions">
                                                    <button
                                                        className="view-paper-btn"
                                                        onClick={() => handleViewPaper(sub.submission)}
                                                    >
                                                        View Paper
                                                    </button>
                                                    <button
                                                        className="details-btn"
                                                        onClick={() => setDetailsSubmission(sub.submission)}
                                                    >
                                                        Details
                                                    </button>
                                                </div>
                                                <div className="final-decision-actions">
                                                    <button
                                                        className="final-accept-btn"
                                                        onClick={() => handleFinalDecision(sub.submission, 'accepted')}
                                                    >
                                                        Final Accept
                                                    </button>
                                                    <button
                                                        className="final-reject-btn"
                                                        onClick={() => handleFinalDecision(sub.submission, 'rejected')}
                                                    >
                                                        Final Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'accepted' && isSystemAdmin && (
                            <div className="submissions-section">
                                <h2>Accepted Papers</h2>
                                {acceptedSubmissions.length === 0 ? (
                                    <div className="empty-state">
                                        <p>No papers have been accepted yet</p>
                                    </div>
                                ) : (
                                    <div className="submissions-grid">
                                        {acceptedSubmissions.map((sub) => (
                                            <div key={sub.submission._id} className="submission-card">
                                                <div className="reviewer-card-header">
                                                    <h3>{sub.submission.originalName || sub.submission.fileName}</h3>
                                                    <span className="status-badge accepted">accepted</span>
                                                </div>
                                                <p className="authors">Authors: {sub.submission.submitterEmail}</p>
                                                <p className="date">Submitted: {new Date(sub.submission.uploadedAt).toLocaleDateString()}</p>
                                                <div className="submission-actions">
                                                    <button
                                                        className="view-paper-btn"
                                                        onClick={() => handleViewPaper(sub.submission)}
                                                    >
                                                        View Paper
                                                    </button>
                                                    <button
                                                        className="details-btn"
                                                        onClick={() => setDetailsSubmission(sub.submission)}
                                                    >
                                                        Details
                                                    </button>
                                                </div>
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
                            <div className="decision-button-group" aria-label="Review decision">
                                <button
                                    type="button"
                                    className={`decision-btn accept ${reviewForm.decision === 'accept' ? 'active' : ''}`}
                                    onClick={() => setReviewForm({ ...reviewForm, decision: 'accept', revisionDeadline: '' })}
                                >
                                    Accept
                                </button>
                                <button
                                    type="button"
                                    className={`decision-btn revision ${reviewForm.decision === 'revision' ? 'active' : ''}`}
                                    onClick={() => setReviewForm({ ...reviewForm, decision: 'revision' })}
                                >
                                    Revisions Needed
                                </button>
                                <button
                                    type="button"
                                    className={`decision-btn reject ${reviewForm.decision === 'reject' ? 'active' : ''}`}
                                    onClick={() => setReviewForm({ ...reviewForm, decision: 'reject', revisionDeadline: '' })}
                                >
                                    Reject
                                </button>
                            </div>
                            {reviewForm.decision === 'revision' && (
                                <div className="form-group">
                                    <label htmlFor="revisionDeadline">Revision Deadline</label>
                                    <input
                                        id="revisionDeadline"
                                        type="date"
                                        min={new Date().toISOString().slice(0, 10)}
                                        max={maxRevisionDeadline}
                                        value={reviewForm.revisionDeadline}
                                        onChange={(e) => setReviewForm({ ...reviewForm, revisionDeadline: e.target.value })}
                                        required
                                    />
                                </div>
                            )}
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

            {previewSubmission && (
                <div className="modal-overlay" onClick={closePreview}>
                    <div className="modal paper-preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{previewSubmission.originalName || previewSubmission.fileName}</h3>
                            <button className="close-btn" onClick={closePreview}>x</button>
                        </div>
                        {isLoadingPreview ? (
                            <div className="paper-preview-message">Loading preview...</div>
                        ) : previewError ? (
                            <div className="paper-preview-message">{previewError}</div>
                        ) : (
                            <iframe
                                className="paper-preview-frame"
                                src={previewUrl}
                                title={`Preview of ${previewSubmission.originalName || previewSubmission.fileName}`}
                            />
                        )}
                    </div>
                </div>
            )}

            {detailsSubmission && (
                <div className="modal-overlay" onClick={() => setDetailsSubmission(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Details: {detailsSubmission.originalName || detailsSubmission.fileName}</h3>
                            <button className="close-btn" onClick={() => setDetailsSubmission(null)}>x</button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Author:</strong> {detailsSubmission.submitterEmail}</p>
                            <p><strong>Submitted:</strong> {new Date(detailsSubmission.uploadedAt).toLocaleDateString()}</p>
                            <p><strong>Status:</strong> {(detailsSubmission.status || 'pending').replace('_', ' ')}</p>
                            {detailsSubmission.revisionDeadline && (
                                <p><strong>Revision Due:</strong> {new Date(detailsSubmission.revisionDeadline).toLocaleDateString()}</p>
                            )}

                            <div className="paper-comments-section">
                                <h4>Reviewer Comments</h4>
                                {detailsReviews.length === 0 ? (
                                    <p>No comments have been submitted for this paper yet.</p>
                                ) : (
                                    <div className="paper-comments-list">
                                        {detailsReviews.map((review) => (
                                            <div key={review._id} className="paper-comment-item">
                                                {review.decision && (
                                                    <p className="decision-line">
                                                        Decision: {review.decision === 'revision' ? 'Revisions Needed' : review.decision}
                                                    </p>
                                                )}
                                                <p className="comments">{review.comments}</p>
                                                <p className="date">{new Date(review.submittedAt).toLocaleDateString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
