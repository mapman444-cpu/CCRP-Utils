const requests = new Map();

function createRequest(request) {
    requests.set(request.id, {
        ...request,
        status: "selecting",
        createdAt: Date.now(),
    });
}

function getRequest(id) {
    return requests.get(id) || null;
}

function updateRequest(id, updates) {
    const request = requests.get(id);
    if (!request) return null;

    Object.assign(request, updates);
    return request;
}

function deleteRequest(id) {
    return requests.delete(id);
}

function claimDecision(id, reviewerId, decision) {
    const request = requests.get(id);

    if (!request || request.status !== "pending") {
        return false;
    }

    request.status = decision;
    request.reviewerId = reviewerId;

    return true;
}

module.exports = {
    createRequest,
    getRequest,
    updateRequest,
    deleteRequest,
    claimDecision,
};
