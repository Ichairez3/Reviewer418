Welcome to **Reviewer418**, Heres how you can get started with our software.

After you download the Code either through a Zip file or open it through Github Desktop you will have some setup to do.

**Step 1: Create a MangoDB Account**
-  https://www.mongodb.com/
-  Go to the site above and Create an account.
-  After creating an account you will be prompted to make a cluster right away. This cluster will be your database so select your plan and the name you want.
-  **YOU WONT BE ABLE TO CHANGE THE NAME LATER**
-  Once you create your cluster you will be prompted to make your database user credentials. Make sure you make it a password you remember, you will need that later.
-  You will then have to choose a connection type whether its through Drivers or MangoDB Compass. Either works. It will then give you specific instructions to connect it to your version of the software.
-  Once connected the Database should start to auto populate with data when the software is ran


**Step 2: Downloading the Dependencies**
- Open up a new terminal
- You will want to type:
  
**npm install**

- Followed by

**npm install vite**

**npm install Node.js**

**npm install mongodb**

After you do all this the software should be ready to run.

**Step 3: Starting the Software**
- You must first start the database connection before you can start the server connection.
- You should open up a terminal and use it to navigate to the file given below. You can navigate using cd .. to go back a file and cd ______ to select specific files. You can also type *ls* and it will show you what files are available in the file your currently in

*example: I use cd .. then cd reviewer418-project/server to navigate to the server folder.*

**\Reviewer418\reviewer418-project\server**

- Then in the terminal, after you've navigated to the file, type *npm run dev* and wait for it to say **MangoDB Connected**
- After you've succesfully connected the Database, use the terminal again to navigate to the folder given below.

**\Reviewer418\Project418**

- After you have navigated to that folder type *npm run dev* in the terminal, it will start a localhost so you can have your own independent copy of the software that you can access through the link it provides you.





