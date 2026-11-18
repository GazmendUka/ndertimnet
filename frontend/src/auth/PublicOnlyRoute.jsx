// frontend/src/auth/PublicOnlyRoute.jsx

import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { IS_IOS_STORE_SANDBOX } from "../config/api";

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
    return <Navigate to={IS_IOS_STORE_SANDBOX && !user.email_verified ? "/verify-email" : "/"} replace />;
    }

    return children;
};

export default PublicOnlyRoute;
