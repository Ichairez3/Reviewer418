export const REVIEWER_REQUESTS_KEY = 'reviewer418ReviewerRequests'

export type ReviewerRequest = {
    username: string
    requestedAt: string
}

export const loadReviewerRequests = (): ReviewerRequest[] => {
    try {
        const storedRequests = localStorage.getItem(REVIEWER_REQUESTS_KEY)
        if (!storedRequests) {
            return []
        }

        const parsed = JSON.parse(storedRequests)
        if (!Array.isArray(parsed)) {
            return []
        }

        return parsed.filter((request): request is ReviewerRequest =>
            typeof request?.username === 'string' && typeof request?.requestedAt === 'string'
        )
    } catch (err) {
        console.error('Failed to load reviewer requests:', err)
        return []
    }
}

export const saveReviewerRequests = (requests: ReviewerRequest[]) => {
    localStorage.setItem(REVIEWER_REQUESTS_KEY, JSON.stringify(requests))
}

export const hasReviewerRequest = (username: string, requests = loadReviewerRequests()) => {
    return requests.some((request) => request.username === username)
}

export const requestReviewerPriority = (username: string) => {
    const requests = loadReviewerRequests()
    if (hasReviewerRequest(username, requests)) {
        return requests
    }

    const updatedRequests = [
        ...requests,
        {
            username,
            requestedAt: new Date().toISOString(),
        },
    ]
    saveReviewerRequests(updatedRequests)
    return updatedRequests
}

export const cancelReviewerPriorityRequest = (username: string) => {
    const updatedRequests = loadReviewerRequests().filter((request) => request.username !== username)
    saveReviewerRequests(updatedRequests)
    return updatedRequests
}
