import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import doctorsRouter from "./doctors";
import patientsRouter from "./patients";
import appointmentsRouter from "./appointments";
import medicalRecordsRouter from "./medical-records";
import prescriptionsRouter from "./prescriptions";
import medicinesRouter from "./medicines";
import invoicesRouter from "./invoices";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(doctorsRouter);
router.use(patientsRouter);
router.use(appointmentsRouter);
router.use(medicalRecordsRouter);
router.use(prescriptionsRouter);
router.use(medicinesRouter);
router.use(invoicesRouter);
router.use(dashboardRouter);

export default router;
