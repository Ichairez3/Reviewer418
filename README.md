# Reviewer418

Welcome to Reviewer418. This guide walks you through setting up your own local copy of the project with your own MongoDB database.

## Project Structure

This repository contains two main parts:

- `Project418` for the React frontend
- `reviewer418-project/server` for the Express backend

## Step 1: Download the Project

Download the project either by:

- downloading the ZIP file
- cloning it through GitHub Desktop

## Step 2: Install Node.js

Before running the project, install Node.js on your computer:

https://nodejs.org/

After installing Node.js, you will be able to use `npm` in your terminal.

## Step 3: Create a MongoDB Atlas Database

Go to MongoDB Atlas:

https://www.mongodb.com/

Then:

1. Create an account.
2. Create a cluster.
3. Choose the plan and cluster name you want.
4. Create a database user with a username and password you will remember.
5. Set up Network Access so your machine is allowed to connect.
6. Copy your MongoDB connection string.

Your connection string will look similar to this:

```env
mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority
```

## Step 4: Create the Server `.env` File

Go to:

```txt
reviewer418-project/server
```

Create a file named `.env`.

Add the following:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string_here
```

Replace `your_mongodb_connection_string_here` with your real MongoDB Atlas connection string.

## Step 5: Install Backend Dependencies

Open a terminal and navigate to:

```txt
reviewer418-project/server
```

Run:

```bash
npm install
```

## Step 6: Install Frontend Dependencies

Open another terminal and navigate to:

```txt
Project418
```

Run:

```bash
npm install
```

## Step 7: Start the Backend Server

In the terminal inside:

```txt
reviewer418-project/server
```

run:

```bash
npm run dev
```

If everything is set up correctly, the terminal should show that MongoDB connected and that the server is running on port `5000`.

## Step 8: Start the Frontend

In the terminal inside:

```txt
Project418
```

run:

```bash
npm run dev
```

This will start the frontend and print a localhost URL, usually something like:

```txt
http://localhost:5173
```

Open that link in your browser.

## Step 9: Use the Software

Once both the backend and frontend are running, you can:

- create accounts
- create conferences
- upload papers
- review submissions
- use your own database-backed copy of Reviewer418

## Notes

- Both the backend and frontend must be running at the same time during local development.
- The database does not come with sample data by default. Data is added as you use the software.
- The frontend expects the backend API to run on `http://localhost:5000`.

## Terminal Navigation Tip

You can move through folders in the terminal with:

```bash
cd ..
```

to go back one folder, and:

```bash
cd folder-name
```

to enter a folder.

You can also use:

```bash
ls
```

or on Windows:

```bash
dir
```

to see the files and folders in your current location.
