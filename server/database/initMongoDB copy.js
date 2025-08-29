const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const UserAuth = require('./models/userAuths');
const UserProfile = require('./models/userProfiles');
const Status = require('./models/statuses');
const Project = require('./models/projects');
const Task = require('./models/tasks');

const rawData = fs.readFileSync(path.join(__dirname, '../../web-client/src/data/testListChain.json'), 'utf8');
const data = JSON.parse(rawData);

const userAuthData = Object.values(data.userAuth);
const userProfileData = Object.values(data.userProfile);
const statusData = Object.values(data.status);
const projectData = Object.values(data.projectList);
const taskData = Object.values(data.taskList);

async function main() {
    await mongoose.connect('mongodb+srv://gerrytao1995_db_user:rmuOlbEEFxv0ZPTr@raccoon-todolist-cluste.eg0xsyc.mongodb.net/raccoon-study-db')
    .then(() => console.log("connected!"))
    .catch(err => console.error(err));


    // Clear existing collections
    await UserAuth.deleteMany({})
    .then(() => console.log("UserAuth collection cleared"))
    .catch(err => console.error(err));

    await UserProfile.deleteMany({})
    .then(() => console.log("UserProfile collection cleared"))
    .catch(err => console.error(err));

    await Status.deleteMany({})
    .then(() => console.log("Status collection cleared"))
    .catch(err => console.error(err));

    await Project.deleteMany({})
    .then(() => console.log("Project collection cleared"))
    .catch(err => console.error(err));

    await Task.deleteMany({})
    .then(() => console.log("Task collection cleared"))
    .catch(err => console.error(err));


    // Insert UserAuth data
    await UserAuth.insertMany(userAuthData)
    .then(() => console.log("UserAuth data inserted"))
    .catch(err => console.error(err));

    // Insert UserProfile data
    await UserProfile.insertMany(userProfileData)
    .then(() => console.log("UserProfile data inserted"))
    .catch(err => console.error(err));

    // Insert Status data
    await Status.insertMany(statusData)
    .then(() => console.log("Status data inserted"))
    .catch(err => console.error(err));

    // Insert Project data
    await Project.insertMany(projectData)
    .then(() => console.log("Project data inserted"))
    .catch(err => console.error(err));

    // Insert Task data
    await Task.insertMany(taskData)
    .then(() => console.log("Task data inserted"))
    .catch(err => console.error(err));


    // Close the connection
    await mongoose.disconnect()
    .then(() => console.log("disconnected"))
    .catch(err => console.error(err));
}

main().catch(err => {
    console.error(err);
    mongoose.disconnect()
});