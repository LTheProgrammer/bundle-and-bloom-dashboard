import express from 'express';
import { authenticateJWT, authorize } from '../middleware/auth.js';
import * as controllers from '../controllers/index.js';

const router = express.Router();


router.post('/login', controllers.userController.login);

router.get('/warehouses/', authenticateJWT, controllers.warehouseController.getWarehouses);

router.get('/inventory/stocks', authenticateJWT, controllers.inventoryController.getStocks);
router.get('/inventory/export', authenticateJWT, controllers.inventoryController.exportStocks);

router.get('/orders/', authenticateJWT, controllers.orderController.getOrders);
router.get('/orders/export', authenticateJWT, controllers.orderController.exportOrders);
router.get('/orders/picking-list', authenticateJWT, controllers.orderController.getPickingList);
router.get('/orders/picking-list/export', authenticateJWT, controllers.orderController.exportPickingList);

export default router;
