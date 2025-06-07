# How to start

Clone the project  
Open a git bash terminal, get to the root : 'something/bundle-and-bloom-dashboard$'  
Execute 'npm run install-all' to install the node modules  
Then use the command 'npm run dev' to start both the frontend and the backend simultaneously 

# Accounts

## admin account
admin@logistics.com  
admin123  

## manager
manager@logistics.com  
manager123  

## employee
employee@logistics.com  
employee123  

# Possible upgrade
## technical debt
-Add a middleware/permissions handling in the backend to increase security  
-Finish permission implementation in frontend  
-Replace secret and environment dependent variable by value in a .env  
-Maybe add a cache for table page, so the change of page is more fluid*  
-Add debouncing or a filter button to avoid doing requests too often  
-Isolate csv, excel and pdf in function to make code less redundant  
-Get rid of isComposite in the orders table, use the presence or absence of children to know if it's composite**  
-Add 'request input' validation (like the body in a post)  
-Rework the db to tie the warehouse to a different component of the order

## feature
-Add a page to manage the inventory of warehouses  
-Add a page to manage the users and their permissions  
-Add some graphs to represent metrics on the home page, like the volume of orders and their total value for last month  
-Handle composite orders from different warehouses
-Replace statistics on home page by real statistics  
-Add a modal when clicking on an order that contains the full details of the order  

*Backend pagination was chosen with volume in mind to avoid huge initial loading time at the cost of fluidity when changing page  
**Orders Structure could be better. In this project I will assume products don't get deleted or edited but 'inactivated' and a new one is created. 

## bug
-The customDatePicker let you choose a end date before the start date  
