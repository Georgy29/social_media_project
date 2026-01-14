import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import FeedPage from "@/pages/Feed";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import { getToken, type ApiError } from "@/api/client";
import { useMeQuery } from "@/api/queries";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = getToken();
  const meQuery = useMeQuery();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (meQuery.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-svh items-center justify-center">
        Loading…
      </div>
    );
  }

  if (meQuery.isError) {
    const error = meQuery.error as ApiError;
    if (error.status === 401) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return (
      <div className="text-muted-foreground flex min-h-svh items-center justify-center">
        {error.message}
      </div>
    );
  }

  return <>{children}</>;
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const token = getToken();
  const meQuery = useMeQuery();

  if (!token) return <>{children}</>;

  if (meQuery.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-svh items-center justify-center">
        Loading…
      </div>
    );
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
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
