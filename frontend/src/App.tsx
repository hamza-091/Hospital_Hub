import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminDoctors from "@/pages/admin/doctors";
import AdminAppointments from "@/pages/admin/appointments";
import AdminMedicines from "@/pages/admin/medicines";
import AdminInvoices from "@/pages/admin/invoices";
import DoctorDashboard from "@/pages/doctor/dashboard";
import DoctorAppointments from "@/pages/doctor/appointments";
import DoctorRecords from "@/pages/doctor/records";
import DoctorPrescriptions from "@/pages/doctor/prescriptions";
import PatientDashboard from "@/pages/patient/dashboard";
import PatientBook from "@/pages/patient/book";
import PatientAppointments from "@/pages/patient/appointments";
import PatientRecords from "@/pages/patient/records";
import PatientPrescriptions from "@/pages/patient/prescriptions";
import PatientInvoices from "@/pages/patient/invoices";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <ProtectedRoute path="/admin" component={AdminDashboard} allowedRoles={["admin"]} title="Dashboard" />
      <ProtectedRoute path="/admin/users" component={AdminUsers} allowedRoles={["admin"]} title="Users" />
      <ProtectedRoute path="/admin/doctors" component={AdminDoctors} allowedRoles={["admin"]} title="Doctors" />
      <ProtectedRoute path="/admin/appointments" component={AdminAppointments} allowedRoles={["admin"]} title="Appointments" />
      <ProtectedRoute path="/admin/medicines" component={AdminMedicines} allowedRoles={["admin"]} title="Medicines" />
      <ProtectedRoute path="/admin/invoices" component={AdminInvoices} allowedRoles={["admin"]} title="Invoices" />

      <ProtectedRoute path="/doctor" component={DoctorDashboard} allowedRoles={["doctor"]} title="Dashboard" />
      <ProtectedRoute path="/doctor/appointments" component={DoctorAppointments} allowedRoles={["doctor"]} title="Appointments" />
      <ProtectedRoute path="/doctor/records" component={DoctorRecords} allowedRoles={["doctor"]} title="Medical Records" />
      <ProtectedRoute path="/doctor/prescriptions" component={DoctorPrescriptions} allowedRoles={["doctor"]} title="Prescriptions" />

      <ProtectedRoute path="/patient" component={PatientDashboard} allowedRoles={["patient"]} title="Dashboard" />
      <ProtectedRoute path="/patient/book" component={PatientBook} allowedRoles={["patient"]} title="Book Appointment" />
      <ProtectedRoute path="/patient/appointments" component={PatientAppointments} allowedRoles={["patient"]} title="My Appointments" />
      <ProtectedRoute path="/patient/records" component={PatientRecords} allowedRoles={["patient"]} title="Medical Records" />
      <ProtectedRoute path="/patient/prescriptions" component={PatientPrescriptions} allowedRoles={["patient"]} title="Prescriptions" />
      <ProtectedRoute path="/patient/invoices" component={PatientInvoices} allowedRoles={["patient"]} title="Invoices" />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
