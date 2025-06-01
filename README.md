# How to start

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
-When the token is expired, you don't get disconnected
-Get rid of isComposite in the orders table, use the presence or absence of children to know if it's composite**
-Add 'request input' validation (like the body in a post)

## feature
-Add a page to manage the inventory of warehouses
-Add a page to manage the users and their permissions
-Add some graphs to represent metrics on the home page, like the volume of orders and their total value for last month
-Handle composite orders from different warehouses, create subdivision by warehouse and an order would regroup those subdivisions
-Replace statistics on home page by real statistics
-Add a modal when clicking on an order that contains the full details of the order

*Backend pagination was chosen with volume in mind to avoid huge initial loading time at the cost of fluidity when changing page
**Orders Structure could be better. In this project I will assume products don't get deleted or edited but 'inactivated' and a new one is created.

## bug
-The customDatePicker let you choose a end date before the start date

# Thoughts

## App Presentation

I'd like to preface that I kind of got carried away and the take home became more of a personal project.
While I took on the role of a parent, a lot of code was written by an AI which results in inconsistency or duplication in terms of logic.
While I componentized and isolated some, there's still some redundant code left.

In the parent readme you will find a more concise transcript of this video.
You will also find the installation instructions
The connection ids
The list of ameliorations and things I wanted to do in an ideal world

First let's cover the application working, what you can do and how.

There's an authentication system in place.
  Regardless of which page you go to if you're disconnected you will get redirected to the login page.
Therefore you should start by authenticating yourself, use the admin account, admin@logistics.com and
admin12

As you can see if you don't input the right credentials you can't login and an error message is displayed
The right password is admin123

Now you should have landed on the main page 'http://localhost:5173/'

The website is following a header, main, footer layout.
In the header once logged in you can:
In the top left corner:
Open the navigation menu by clicking the hamburger icon
Go back to the main page (the one you are currently on) by clicking on the logo.
In the top right corner:
Change the language (it does nothing sadly)
See your profile, by clicking on it a little overlay appears that displays some more information and lets you disconnect.
The footer is simple it's only copyright all the time.

Now the main page, it contains the name of the user connected and 2 buttons, one that takes you to the inventory page and the other to the order page, where you can get the list of items that need picking.
Lastly there's a banner representing last month statistics

Let's go to inventory
On the Inventory page you can select which warehouse you want to see the stocks of and it will display accordingly,
There's a pagination system and a search filter on top of the warehouse filter.
Lastly you can export it in 3 formats, csv, excel or pdf.
In the case of export filters remain taken into account but pagination is not. Also the display varies depending on the format.

Now orders, navigate to orders and let's check it out!
More specificity on this one.
You will probably be welcomed by a page displaying no products. That's normal because none correspond to the default filter.
Considering the assignment I put the datepicker default to 'yesterday' and the status default to 'pending'.
Changing the date to 'all dates' should display few orders.
Changing the time selection to custom will make a datepicker appear which lets you pick freely, the interval selected will be kept even if you change to something else but will not be applied. 

Now you should've noticed there are two sections picking and orders
Picking corresponds to all the non composite products that need picking (so only the products of pending orders) for the time lapse picked.
In short pagination and status are ignored for this section.

The orders section will display all the orders that satisfy the selected conditions.

Once again it is possible to export in csv, excel or pdf. The display will vary.
Filters will be applied, pagination will be ignored and in the case of picking so will status.

That should cover it for the application functionality.


## Code and choices

Now let's discuss the architecture choices, the implementation choices and the design choices.

I'll try to do a quick covering of everything and go more in depth regarding the picking feature and the database design choices which are from my understanding the core of the assignment.

I chose to work with vite, react.js, node.js and express because I am mostly familiar with those technologies and I long wanted to test vite personally. In my experience the development experience is way faster with vite and I wanted to try setting it up.
The project also uses ESLint for code formatting, a few versions of bootstrap for styling.
For the main libraries used there's JWT for the auth system, bcrypt for password encryption, exceljs and pdfkit for document generation.

For the structure I chose to use the classical layered approach for both frontend and backend, frankly it's not perfectly implemented. In the case of the backend I combined what would normally be the DB layer with the serviceLayer due to the db being json files.

### Frontend
Authentication is handled by a Context, that context sets the token for axios requests - handles login/logout and handles logout when a request returns a 401, it was set up to handle user permissions with them being extracted from the token when logging in, but I didn't end up implementing it further.

The context and browser router wrap <App/> in main.jsx so routes can be used freely and the authContext is accessible everywhere in the app.
The <App> component/page is more the real main, it's where the routing is handled and it also dictates the layout, with the rendering of the header, main and footer section.

Custom hook is empty for the moment ideally, I wanted to create a custom hook to handle the axios requests or use the react-query library.
It would have been the first step in extracting the business logic from the components/pages.

Now let's ignore the rest and focus on order.jsx I'll keep it short and explain the big lines of the inner working.
The filters are in the same state, but there are 2 exceptions, the customDate time lapse thing has its own state and the warehouse filter also has its own state.

At the first render the page fetches all the warehouses, orders and picking product list corresponding to the default options of the filters, there are 3 functions with 3 useEffect. The warehouse list is charged once and never again.
On the contrary the picking list and orders list are fetched every time the filters change.
While this assures responsiveness, it places an unnecessary load on the server especially in case of big data volume.
Debouncing the call or adding a 'search/filter' button would solve this issue. 
The filtering is done in backend to avoid latency in case of big data volume. 
Exports are also done in backend with performance and security in mind. Exporting from frontend would require sending all the data to the frontend which is not good.

Now, for the 
### Backend

The requests come in to routes, where the routes are grouped by controller.
Except login they must all go through the middleware to verify if the token is valid.
The middleware also has a method to control access based on permissions or role but as mentioned before it remains unused.
A limitation here would've been that the permissions come from the token, if they are changed since the token was generated you'd need to blacklist the token or revoke it somehow.

After that the request goes to controller, let's say order, the get methods are designed to accept filters, and validate them but require a pagination. All the get methods are like this even if they aren't necessarily used with filters.
The export methods use the get methods to get the data, but they bypass the required pagination by passing 1 page and 10000 elements as filters.
So export isn't a real 'exportAll' it could be added like it was done in the warehouse controller by accepting specific input (i.e. page : 1, elem : 'all')
But it's debatable if that's really desirable, if there are say 1 million+ datasets to export, do you really want them all?
At that kind of volume other issues like customer feedback and the process time also come into play.

In a nutshell the controllers do request validation and call the service layer.
In retrospect I would've liked to implement something like Express-Validator which is a middleware or another form of more 'professional' request input validation.

Service
I chose to use classes as I wanted to avoid loading the 'db' every time a request was made and most of the endpoints ended up sharing the same state (the db).
Inventory and orders service have an 'enrich' method that basically reenacts the behavior of a real DB. It goes through the json object and replaces the foreign_key by the json object or some particular information (I only add the client name from the client object in the case of order for example).

Other than that it's pretty basic, you get the data, enrich them, filter/sort them and return them.
The picking list is interesting, I made the db in a way that you could have composite of composite of..etc so there was a need to involve some recursion as we only want to keep the 'nonComposite children' i.e. products that aren't composed of other products for the picking list.

The document generation functions were fully vibecoded by AI there's probably a way to recoup the logic and avoid redundancy but I didn't spend much time on that.

### Database

I won't go into details, field by field, feel free to open the .json and look at it. Most fields aren't anything special I'll focus on table particularities.

Customers : It could use a field 'updatedAt' and it contains a reference to 1 address
Addresses: not great, with the current structure we can end up with addresses whose owner we ignore, ideally they should be attached to a customer either through a joint table, by transforming the address field on customer to an array or by adding the customer_id on the address entry.
Inventory: Could use a field 'location' to indicate to the worker where in the warehouse the product is. It has reference to product and warehouse.
Warehouse: has a field isActive so if you need to 'delete' it you turn it inactive and the orders can still refer to it. It has a reference to an address
Product : has a field isActive for the same reason as warehouse, in case of edit or delete you turn the product inactive. This avoids the need of 'product_snapshot', as the product information never changes once entered you don't need to save them at the moment of the purchase.
The field children contains references to other products and their quantity. As mentioned previously you can combine bundles into a mega bundle and even more. The isComposite field was thought to signal that something is a bundle but it could be deleted as the products having children is an indicator in itself.
Orders : It contains references to the tables : customer, warehouse, address, product and user. I tied orders to warehouse in this project, but it cause an issue, you can't order items from different warehouses in one order. We could then put the warehouse_id on the line_item. But then composite product could only be composed of product from the same warehouse. Depending if the bundle are physical box of product or a group of product the way to handle the situation would be different.
Users: typical users structure, contains a hashed password, permissions but no role.
Transactions : unused table, It was intended to represent payment/money movement and display their status on a page

