import { useEffect, useState } from "react";
import { Menu } from "./Menu";

interface MenuSettingsProps {
    username: string
    email: string
    userID: string
    onLogout: () => void
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

interface Submission {
    _id: string
    originalName: string
    fileName: string
    fileSize: number
    uploadedAt: string
    submitterEmail: string
}


export function MenuSettings({ username, email, userID, onLogout }: MenuSettingsProps) {
    const [showPreviousSubmissions, setShowPreviousSubmissions] = useState(false)
    const [showAccountModal, setShowAccountModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [error, setError] = useState('')
    const [submissionHistory, setSubmissionHistory] = useState<any[]>([])
    const [reviews, setReviews] = useState<any[]>([])

    useEffect(() => {
        fetchReviews()
        fetchSubmissions()
    }, [])

    const fetchSubmissions = async () => {
        try {
            const response = await fetch('/api/papers')
            if (response.ok) {
                const papers = await response.json()
                const userPapers = papers.filter((paper: Submission) => paper.submitterEmail === email)
                const formatted = userPapers.map((paper: Submission) => ({
                    id: paper._id,
                    filename: paper.originalName,
                    size: formatFileSize(paper.fileSize),
                    timestamp: new Date(paper.uploadedAt).toLocaleString(),
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

    const formatFileSize = (bytes: number) => {
        return (bytes / 1024).toFixed(2) + 'KB'
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

    const closeModals = () => {
        setShowAccountModal(false)
        setShowSettingsModal(false)
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

    const handleShowAccount = () => {
        setShowAccountModal(true)
    }

    const handleShowSettings = () => {
        setShowSettingsModal(true)
    }

    const settingsLogout = () => {
        onLogout()
        closeModals()
    }

    return (
            <div>
                <Menu
                    username={username}
                    email={email}
                    onShowPreviousSubmissions={() => setShowPreviousSubmissions(true)}
                    onShowAccount={handleShowAccount}
                    onShowSettings={handleShowSettings}
                />
                {showAccountModal && (
                    <div className="modal-overlay" onClick={closeModals}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Account Information</h3>
                                <button className="close-btn" onClick={closeModals}>x</button>
                            </div>
                            <div className="modal-body">
                                <p><strong>Username:</strong> {username}</p>
                                <p><strong>Email:</strong> {email}</p>
                                <p><strong>Role:</strong> Reviewer</p>{/*make dynamic later */}
                                <p><strong>Total Submissions:</strong> {submissionHistory.length}</p>
                                <p><strong>Total Reviews:</strong> {reviews.length}</p>
                                <button className="logout-btn" onClick={settingsLogout}>
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
                                <div className="error-message" style={{ color: 'white', marginBottom: '10px' }}>{error}</div>
                                <form className="change-username" onSubmit={handleChangeUsername} style={{ marginTop: '20px' }}>
                                    <input type='text' placeholder={username} id='newUsername'></input>
                                    <button type='submit'>Change Username</button>
                                </form>
                                <form className="change-password" onSubmit={handleChangePassword} style={{ marginTop: '20px' }}>
                                    <input type='password' placeholder='' id='newPassword'></input>
                                    <button type='submit'>Change Password</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            

        )
}