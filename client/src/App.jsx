import { Route, Routes } from 'react-router-dom';

// publico
import BlogsLandingPage from './pages/public/BlogsLandingPage.jsx';
import PublicLayout from './components/public/PublicLayout.jsx';
import HomePage from './pages/public/HomePage.jsx';
import PostPage from './pages/public/PostPage.jsx';
import { AboutPage, NotFoundPage } from './pages/public/StaticPages.jsx';
import { CategoriesPage, CategoryPostsPage } from './pages/public/CategoriesPage.jsx';

// painel
import AdminLayout, { ProtectedRoute } from './components/admin/AdminLayout.jsx';
import LoginPage from './pages/admin/LoginPage.jsx';
import BlogsPage from './pages/admin/BlogsPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import PostsPage from './pages/admin/PostsPage.jsx';
import PostEditorPage from './pages/admin/PostEditorPage.jsx';
import CategoriesAdminPage from './pages/admin/CategoriesPage.jsx';
import AppearancePage from './pages/admin/AppearancePage.jsx';
import AccountPage from './pages/admin/AccountPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* ---------------------------- site publico ---------------------------
          Cada blog vive em /b/<slug>. Com um unico blog, / redireciona para ele. */}
      <Route path="/" element={<BlogsLandingPage />} />

      <Route path="/b/:blogSlug" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="buscar" element={<HomePage mode="search" />} />
        <Route path="post/:slug" element={<PostPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="categoria/:slug" element={<CategoryPostsPage />} />
        <Route path="sobre" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* ------------------------------- painel ----------------------------- */}
      <Route path="/admin/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* escopo global */}
        <Route index element={<BlogsPage />} />
        <Route path="blogs/novo" element={<BlogsPage openCreate />} />
        <Route path="conta" element={<AccountPage />} />

        {/* escopo de um blog: /admin/b/:blogId/... */}
        <Route path="b/:blogId">
          <Route index element={<DashboardPage />} />
          <Route path="posts" element={<PostsPage />} />
          <Route path="posts/novo" element={<PostEditorPage />} />
          <Route path="posts/:id" element={<PostEditorPage />} />
          <Route path="categorias" element={<CategoriesAdminPage />} />
          <Route path="aparencia" element={<AppearancePage />} />
        </Route>
      </Route>

      {/* --------------------------------- 404 ------------------------------ */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
