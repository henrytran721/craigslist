# Craigslist Remake

The goal of this project was to remodel craigslist with new UI and to learn how to build a full-fledged app from backend to frontend. 

Viewable at: https://craigslist-remake.herokuapp.com/

Tools used: 
 - Express
 - Passport.js
 - Sass
 - EJS
 - DOTENV
 - Bcrypt.js
 - concurrently
 - MongoDB + Mongoose Schemas
 - Heroku
 
 ## Login and Signup
 
 Sign up
 
 For the signup page, I created a schema called User which stores new information that consists of username, password, first name, last name, email, and phone number. The password is serialized and hashed using Bcrypt.js to prevent stolen passwords in the event the database is hacked. 
 
 Login 
 
 For the login page, I used Passport.js' LocalStrategy class which searches the database and verifies the username and password (with bcrypt unserialize). Once verification has succeeded, the user's info is serialized into a session cookie and deserialized to be stored in the user's browser. I also set the session parameter `maxAge` to 3600000 so that the session will expire in 1 hour and prevent users from having to sign back in every couple of minutes. 
 
 ## Admin and General User Status
 
 When the user is logged in, they are prompted with a menu and they are able to request 'Admin Access'. Admin access will grant the user the ability to create new categories. Those who are general users can only create new posts. To gain admin access, the user must enter the admin password: 'cgAdmin123' and their own password which will POST method the form and update the user object with `isAdmin: true` with their corresponding id. (updated using `findByIdAndUpdate()`)
 
 ## Homepage
 
 The homepage has the main menu where the user is able to view all posts, view their listings, view categories, and request admin access. If their post is listed in all of the posts, they will have the ability to edit the post.
 
 ## Categories
 
 I created a Categories schema which will store category information (category, description, and image) in an object and save it to the database. <br />
Once an admin creates a category, it will show up on the categories page. When a user clicks on a specific category, the database will filter all posts with corresponding categories and display the posts on the page. If there aren't any posts to display, they will be prompted with the message 'No posts to display'. 
 
 ## Post Details Page
 I created a Post schema which will store category information (category, title, username, price, date, description, and image) in an object and save it to the database. For the category and username parameters, I rendered the type as `Schema.Types.ObjectId` and whenever I queried the post object from the database, I would use `.populate(Schema)` to fill in the specific data for the post. <br />
If a user clicks on an individual post, they will be redirected to the url `/post/:id`. The GET method will then query the post and display the corresponding post based on parameters entered. They are prompted with an update button and delete button <strong>if it is a post they created</strong>.

- Update 
  When a user wants to update their post, they will be redirected to the url `/update/:id/`. The GET method will query all the data from the post object and enter these values into their corresponding input field. When the user is ready to update the post they will click the update button. A POST method will occur and run the function `findByIdAndUpdate()` and update the fields with the corresponding id. 
  
 - Delete 
 When a user wants to delete their post, they will be redirected to the url `delete/:id`. The GET method will query the post data and display the title and image for the post object. When the user confirms they want to delete their post by clicking the button, a POST method will occur and run the function `findByIdAndDelete` and remove the entry from the database. 
 
 ## Your Listings
 
When a user clicks on the 'Your Listings' link from the menu on the homepage, they will be redirected to `/yourlistings/:id` which takes into account their individual id. I took this Id and ran a query against all Post objects in the database and filtered with `Post.find({'username': req.params.id})` to find all posts that the user had made and display it. 


## Other features

I added the package dotenv and created a .env file. I added the parameters DB_USER, DB_PASS, and PORT to secure my database information when pushing to github.
