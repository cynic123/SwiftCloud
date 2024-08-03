# SwiftCloud
### Overview
SwiftCloud is a comprehensive music analytics platform dedicated to Taylor Swift's discography. It offers various APIs to interact with and analyze song data, providing insights into song plays, popularity trends, and more. The platform is divided into four main microservices, each responsible for different aspects of the analytics:
- **Songs** -  Handles song search by various criteria.
- **Search** - Provides advanced search functionality across the data.
- **Popularity** - Manages and analyzes the popularity of songs, artists, and albums.
- **Trends** - Analyzes and provides trending information.


------------
### Backend Design
The application consists of four core microservices (**songs**, **search**, **popularity**, and **trends**) and a frontend API service (**swift-api**), all built with **Express.JS** (https://expressjs.com/) and bootstrapped using **Lerna** (https://lerna.js.org/). The Swift-API layer communicates with each microservice via the **gRPC protocol**.
### Prerequisites
- Node.JS v16.14.0 installed. (https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-16-04)
- MongoDB v7.0.9 installed. (https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)


------------
### Setup & Installation
- Clone the SwiftCloud repository from github
`$ git clone https://github.com/cynic123/SwiftCloud.git`

- Go to project root directory.
`cd SwiftCloud`

- Run`npm run install:all`

- Run `npm start`

- In Postman or any browser, send a `GET` request to the following URL: `http://localhost:3000/api`.
If the app and its dependencies are successfully installed, you should see the following message on your Postman or browser:
 >Welcome to Swift API!

---------
### Testing
Unit tests for each microservice and the Swift-API are written using Jest.
- To run the unit test cases for the entire application, run 
`npm test`. 
Ensure that the application and its dependencies are installed beforehand.

- To run the test cases for an individual service, use the following command:
`npm run test:<service_name>`
e.g. to run songs-service test case, `npm run test:songs-service`

- For Postman users, import the`SwiftCloud.postman_collection.json`file file located in the`/utils`folder into your application.

- Please refer to the`SwiftCloud API.docx`or`SwiftCloud API.pdf`files located in the`/docs`folder for API specifications.
------
### Deployment
Deployment scripts are provided for each microservice, the Swift-API, and the entire application. These scripts use the **pm2** process manager (https://pm2.keymetrics.io/) for deployment. 
- To deploy all services, run the following command from the project root: 
`sh deploy.sh`

- To deploy each service individually, navigate to the service root and execute the same command.

It is assumed that all deployments are performed on the same instance where the scripts are executed. To deploy to different instances, configure the **ecosystem.config.js**  and **deploys.sh** files in each service accordingly.

-----
### Remarks
This application is a simplified example of how a music analytics platform can be designed. It does not include key areas such as authentication, authorization, database optimizations (indexing, replication, sharding, etc.), or other performance and scalability considerations. In a real production environment, developers must address these aspects as needed.