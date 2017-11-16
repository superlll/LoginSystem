you can download the project and open it on your workspace, but the github authorization will not workspace
before run our project, you must make sure that you have install mongo and nmp:
do this command in your bash for a new workspace:

1.sudo apt-get install -y mongodb-org

2.mongod --smallfiles --syslog --fork

3.npm install

4.node server.js

after that, open a new windows and use the URL to visit the page:
https://"your project name"-"your user name".c9users.io/login