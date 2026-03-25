const BASE = 'http://localhost:8000/api/auth'

function extractError(data, fallback) {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return Array.isArray(data.detail) ? data.detail.join(' ') : String(data.detail)
  if (Array.isArray(data)) return data.map(String).join(' ')
  if (typeof data === 'object') {
    const parts = []
    for (const [key, val] of Object.entries(data)) {
      if (Array.isArray(val)) parts.push(`${key}: ${val.join(' ')}`)
      else parts.push(`${key}: ${String(val)}`)
    }
    if (parts.length) return parts.join(' | ')
  }
  return fallback
}

async function request(url, options = {}) {
  try {
    const res = await fetch(url, options)
    const isJson = res.headers.get('content-type')?.includes('application/json')
    const data = isJson ? await res.json() : null
    if (!res.ok) {
      const detail = extractError(data, res.statusText)
      throw new Error(detail || 'Ошибка запроса')
    }
    return data
  } catch (e) {
    if (e.name === 'TypeError') {
      // сетевые ошибки fetch (например, сервер не поднят)
      throw new Error('Сервер недоступен. Проверьте, что backend запущен на http://localhost:8000')
    }
    throw e
  }
}


export async function register(username, email, password, password2) {
  return request(`${BASE}/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, password2 }),
  })
}


export async function login(username, password) {
  return request(`${BASE}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
}

// Получить профиль
export async function getProfile(accessToken) {
  return request(`${BASE}/profile/`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })
}

// Обновить профиль
export async function updateProfile(accessToken, data) {
  return request(`${BASE}/profile/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  })
}

// Выход
export async function logout(accessToken, refreshToken) {
  await fetch(`${BASE}/logout/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refresh: refreshToken }),
  })
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
}
