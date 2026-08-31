import { useMemo } from "react";
import {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
  type NavigateOptions,
} from "react-router-dom";

export function useAppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  return useMemo(
    () => ({
      navigate,
      location,
      pathname: location.pathname,
      params,
      searchParams,
      setSearchParams,
      goTo: (to: string, options?: NavigateOptions) => navigate(to, options),
      goToLogin: () => navigate("/login"),
      goToHome: () => navigate("/"),
      goToFacultyProfile: () => navigate("/faculty-profile"),
      goToAdminDashboard: () => navigate("/admin-dashboard"),
      goToDetailed: () => navigate("/detailed"),
    }),
    [navigate, location, params, searchParams, setSearchParams],
  );
}

export default useAppNavigation;
