// Import all your controllers explicitly
import * as userController from './userController.js';
import * as inventoryController from './inventoryController.js';
import * as orderController from './orderController.js';
import * as warehouseController from './warehouseController.js';

// Export them all as a single object
export {
    userController,
    inventoryController,
    orderController,
    warehouseController
};