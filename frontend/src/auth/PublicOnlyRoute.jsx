// frontend/src/auth/PublicOnlyRoute.jsx

import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();

    if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-600 text-lg">Laddar...</span>
        </div>
    );
    }

    if (user) {
    return <Navigate to="/" replace />;
    }

    return children;
};

export default PublicOnlyRoute;
