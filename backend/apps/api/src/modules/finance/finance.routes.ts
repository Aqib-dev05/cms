import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./finance.controller";

const router = Router();
router.use(authenticate);

// Student's own finance
router.get("/me", ctrl.getMyFinance);

// Summary — head clerk / admin
router.get("/summary", requirePermission("fee.manage"), ctrl.getFinanceSummary);
router.get("/students/:userId", requirePermission("fee.read"), ctrl.getStudentFinance);

// Fee types
router.get   ("/fee-types",     requirePermission("fee.read"),   ctrl.getFeeTypes);
router.post  ("/fee-types",     requirePermission("fee.manage"), ctrl.createFeeType);
router.patch ("/fee-types/:id", requirePermission("fee.manage"), ctrl.updateFeeType);

// Fee structures
router.get   ("/structures",     requirePermission("fee.read"),   ctrl.getFeeStructures);
router.get   ("/structures/:id", requirePermission("fee.read"),   ctrl.getFeeStructure);
router.post  ("/structures",     requirePermission("fee.manage"), ctrl.createFeeStructure);

// Invoices
router.get   ("/invoices",     requirePermission("fee.read"),   ctrl.getInvoices);
router.get   ("/invoices/:id", requirePermission("fee.read"),   ctrl.getInvoice);
router.post  ("/invoices",     requirePermission("fee.create"), ctrl.createInvoice);

// Payments
router.post("/payments", requirePermission("payment.create"), ctrl.recordPayment);

// Discounts
router.post("/discounts", requirePermission("fee.manage"), ctrl.applyDiscount);

export default router;
