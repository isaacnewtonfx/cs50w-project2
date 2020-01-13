# Project 3

[Click to view how it works on Youtube](https://www.youtube.com/watch?v=Yq5yn7ZsQgA&list=PLN7IjqCA_0yBy38bWpZo7b30hZYx6f5dS&index=4&t=9s)

Web Programming with Python and JavaScript

Project Author: Isaac Newton Kissiedu

This project is a Flask web app similar to the Slack platform for chatting.

The project relies on HTML, CSS,Bootstrap Framework, Python, Flask, Flask-Socketio for bi-directional messages between the client and the server via a websocket protocol.

**FILES IN THE PROJECT**

1. **application.py:**

This is the main python module for controlling the entire application. It defines the application by creating routes and functions for handling requests such as Login,Logout and all Socket-IO API.

2. **templates:** 

This is a folder that contains all the html files. By convension, Flask will load html files from here

3. **static:**

This is a folder that contains all the site javascript and stylesheets

4. **flask_session:** 

This is a folder that is used by Flask for session storage on disk



**HOW TO RUN THE APP**

1. Create a Python 3 virtual environment and activate it.

2. Install the packages available in requiremnts.txt

3. Run the application by using the following command: `$ python3 application.py`