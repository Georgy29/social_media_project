import { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { getToken, type ApiError } from "@/api/client";
import { useMeQuery } from "@/api/queries";

const FeedPage = lazy(() => import("@/pages/Feed"));
const BookmarksPage = lazy(() => import("@/pages/Bookmarks"));
const LoginPage = lazy(() => import("@/pages/Login"));
const PostDetailPage = lazy(() => import("@/pages/PostDetail"));
const ProfilePage = lazy(() => import("@/pages/Profile"));
const RegisterPage = lazy(() => import("@/pages/Register"));

function FullPageStatus({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex min-h-svh items-center justify-center">
      {message}
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = getToken();
  const meQuery = useMeQuery();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (meQuery.isPending) {
    return <FullPageStatus message="Loading..." />;
  }

  if (meQuery.isError) {
    const error = meQuery.error as ApiError;
    if (error.status === 401) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return <FullPageStatus message={error.message} />;
  }

  return <>{children}</>;
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const token = getToken();
  const meQuery = useMeQuery();

  if (!token) return <>{children}</>;

  if (meQuery.isPending) {
    return <FullPageStatus message="Loading..." />;
  }

  if (meQuery.data) {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  useMeQuery();

  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageStatus message="Loading..." />}>
        <Routes>
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route
            path="/login"
            element={
              <RequireGuest>
                <LoginPage />
              </RequireGuest>
            }
          />
          <Route
            path="/register"
            element={
              <RequireGuest>
                <RegisterPage />
              </RequireGuest>
            }
          />
          <Route
            path="/feed"
            element={
              <RequireAuth>
                <FeedPage />
              </RequireAuth>
            }
          />
          <Route
            path="/bookmarks"
            element={
              <RequireAuth>
                <BookmarksPage />
              </RequireAuth>
            }
          />
          <Route
            path="/posts/:postId"
            element={
              <RequireAuth>
                <PostDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/:username"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
