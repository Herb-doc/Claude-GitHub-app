/**
 * Client for the local HERMES backend (hermes/server/server.py).
 *
 * The backend runs on your own computer and holds the Google login, so the
 * dashboard never handles Google credentials itself.
 */

const BASE = 'http://127.0.0.1:8000'

export class ApiError extends Error {
  constructor(message, { status = 0, offline = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.offline = offline
  }
}

const OFFLINE_MESSAGE =
  'Cannot reach the HERMES backend. Open a Command Prompt, go to the hermes\\server folder, and run: python server.py'

async function request(path, { signal } = {}) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, { signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(OFFLINE_MESSAGE, { offline: true })
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status}).`
    try {
      const body = await response.json()
      if (body?.detail) detail = body.detail
    } catch {
      // Response had no JSON body; keep the generic message.
    }
    throw new ApiError(detail, { status: response.status })
  }

  return response.json()
}

const qs = (params) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value)
    }
  }
  const str = search.toString()
  return str ? `?${str}` : ''
}

export const api = {
  health: (opts) => request('/api/health', opts),

  searchPatients: (query, opts) =>
    request(`/api/patients/search${qs({ q: query })}`, opts),

  patientFolderFiles: (folderId, opts) =>
    request(`/api/patients/${encodeURIComponent(folderId)}/files`, opts),

  fileText: (fileId, opts) =>
    request(`/api/files/${encodeURIComponent(fileId)}/text`, opts),

  driveRecent: (limit = 25, opts) =>
    request(`/api/drive/recent${qs({ limit })}`, opts),

  driveSearch: (query, opts) =>
    request(`/api/drive/search${qs({ q: query })}`, opts),

  docsRecent: (limit = 25, opts) =>
    request(`/api/docs/recent${qs({ limit })}`, opts),

  gmailSearch: (query = '', limit = 20, opts) =>
    request(`/api/gmail/search${qs({ q: query, limit })}`, opts),

  gmailMessage: (messageId, opts) =>
    request(`/api/gmail/message/${encodeURIComponent(messageId)}`, opts),

  calendarUpcoming: (limit = 10, opts) =>
    request(`/api/calendar/upcoming${qs({ limit })}`, opts),
}

export { OFFLINE_MESSAGE }
