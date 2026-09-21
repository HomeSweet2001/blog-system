const TOKEN_KEY = 'blog.admin.token';
export const LAST_BLOG_KEY = 'blog.admin.lastBlogId';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getLastBlogId() {
  try {
    const raw = localStorage.getItem(LAST_BLOG_KEY);
    return raw ? Number.parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export function setLastBlogId(id) {
  try {
    if (id) localStorage.setItem(LAST_BLOG_KEY, String(id));
    else localStorage.removeItem(LAST_BLOG_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function qs(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  return new URLSearchParams(clean).toString();
}

/**
 * Chamada a API. Envia JSON automaticamente e injeta o token quando `auth` = true
 * ou quando ha um token salvo.
 */
export async function api(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = {};
  const token = getToken();

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    signal,
    body:
      body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    if (res.status === 401 && auth) {
      setToken(null);
      window.dispatchEvent(new CustomEvent('blog:unauthorized'));
    }
    throw new ApiError(payload?.error || `Erro ${res.status}`, res.status);
  }

  return payload;
}

/** Upload de imagem para a pasta do blog no Cloudinary (via backend). */
export async function uploadImage(file, folder, blogId, onProgress) {
  if (!blogId) {
    throw new ApiError('Nenhum blog selecionado para o upload.', 400);
  }

  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/admin/blogs/${blogId}/upload`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data?.error || 'Falha no upload.', xhr.status));
    };

    xhr.onerror = () => reject(new ApiError('Falha de rede durante o upload.', 0));
    xhr.send(form);
  });
}

/* ------------------------------- autenticacao ------------------------------ */
export const apiAuth = {
  login: (username, password) =>
    api('/api/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: () => api('/api/auth/me'),
  updateCredentials: (payload) => api('/api/auth/credentials', { method: 'PUT', body: payload }),
};

/* ---------------------------------- blogs --------------------------------- */
export const apiBlogs = {
  /** Lista publica (pagina inicial). */
  listPublic: () => api('/api/blogs', { auth: false }),
  /** Blog + aparencia pelo slug (publico). */
  getPublic: (slug) => api(`/api/blogs/${encodeURIComponent(slug)}`, { auth: false }),
  /** Posts publicos de um blog. */
  posts: (slug, params = {}) =>
    api(`/api/blogs/${encodeURIComponent(slug)}/posts?${qs(params)}`, { auth: false }),
  post: (slug, postSlug) =>
    api(`/api/blogs/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postSlug)}`, {
      auth: false,
    }),
  /** Categorias publicas de um blog. */
  categories: (slug) => api(`/api/blogs/${encodeURIComponent(slug)}/categories`, { auth: false }),

  /* --- administrativo --- */
  list: () => api('/api/admin/blogs'),
  get: (blogId) => api(`/api/admin/blogs/${blogId}`),
  create: (payload) => api('/api/admin/blogs', { method: 'POST', body: payload }),
  update: (blogId, payload) => api(`/api/admin/blogs/${blogId}`, { method: 'PUT', body: payload }),
  remove: (blogId, deleteImages = false) =>
    api(`/api/admin/blogs/${blogId}${deleteImages ? '?deleteImages=true' : ''}`, {
      method: 'DELETE',
    }),
};

/* ------------------------- aparencia (por blog) --------------------------- */
export const apiSettings = {
  get: (blogId) => api(`/api/admin/blogs/${blogId}/settings`),
  update: (blogId, payload) =>
    api(`/api/admin/blogs/${blogId}/settings`, { method: 'PUT', body: payload }),
  reset: (blogId) => api(`/api/admin/blogs/${blogId}/settings/reset`, { method: 'POST' }),
};

/* ----------------------------- posts (admin) ------------------------------ */
export const apiAdminPosts = {
  list: (blogId, params = {}) => api(`/api/admin/blogs/${blogId}/posts?${qs(params)}`),
  get: (blogId, id) => api(`/api/admin/blogs/${blogId}/posts/${id}`),
  create: (blogId, payload) =>
    api(`/api/admin/blogs/${blogId}/posts`, { method: 'POST', body: payload }),
  update: (blogId, id, payload) =>
    api(`/api/admin/blogs/${blogId}/posts/${id}`, { method: 'PUT', body: payload }),
  setStatus: (blogId, id, status) =>
    api(`/api/admin/blogs/${blogId}/posts/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (blogId, id) => api(`/api/admin/blogs/${blogId}/posts/${id}`, { method: 'DELETE' }),
};

/* --------------------------- categorias (admin) --------------------------- */
export const apiAdminCategories = {
  list: (blogId) => api(`/api/admin/blogs/${blogId}/categories`),
  create: (blogId, payload) =>
    api(`/api/admin/blogs/${blogId}/categories`, { method: 'POST', body: payload }),
  update: (blogId, id, payload) =>
    api(`/api/admin/blogs/${blogId}/categories/${id}`, { method: 'PUT', body: payload }),
  remove: (blogId, id) => api(`/api/admin/blogs/${blogId}/categories/${id}`, { method: 'DELETE' }),
};

/* -------------------------------- diversos -------------------------------- */
export const apiStats = {
  get: (blogId) => api(`/api/admin/blogs/${blogId}/stats`),
};

export const apiUpload = {
  status: (blogId) => api(`/api/admin/blogs/${blogId}/upload/status`),
};
