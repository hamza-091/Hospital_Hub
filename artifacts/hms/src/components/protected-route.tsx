import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route, RouteProps, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps extends RouteProps {
  allowedRoles?: string[];
  title?: string;
}

export function ProtectedRoute({ allowedRoles, title, component: Component, ...rest }: ProtectedRouteProps) {
  const { user, token, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token) {
    return <Redirect to="/login" />;
  }

  if (!user) {
    return null; // Should be handled by useEffect in useAuth
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboard
    if (user.role === "admin") return <Redirect to="/admin" />;
    if (user.role === "doctor") return <Redirect to="/doctor" />;
    if (user.role === "patient") return <Redirect to="/patient" />;
    return <Redirect to="/" />;
  }

  if (!Component) return null;

  return (
    <Route {...rest}>
      {(params) => (
        <Layout title={title}>
          <Component params={params} />
        </Layout>
      )}
    </Route>
  );
}
