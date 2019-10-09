import os

from datetime import datetime

from flask import Flask,request, render_template, session, redirect, url_for, jsonify
from flask_session import Session
from flask_socketio import SocketIO, send, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = 'fgzgiqkqolatya'
socketio = SocketIO(app)


# Configure session to use filesystem
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)


display_name_list = []

channels = {
    'General': {
        'owner': 'system',
        'users': [], 
        'messages': [
            # {'dispname' : '', 'message' : '', 'timestamp' : ''}
        ]
    }
}

@app.route("/", methods = ["GET", "POST"])
def index():
    if request.method == "GET":

        # available_channels = [c for c in list(channels) if c != dispname]
        # current_channel = session['current_channel']
        # channel_messages = channels[current_channel]['messages']
        # channel_users    = channels[current_channel]['users']

        return render_template('index.html')

    # Process post
    dispname = request.form.get("dispname")

    errors = []

    # Make sure display name is entered
    if dispname == "" or dispname is None:
        errors.append("Display Name is required")
        return render_template('index.html', errors=errors)


    # Make sure display name is unique
    if dispname in display_name_list:
        errors.append("Display Name already exist")
        return render_template('index.html', errors=errors)


    display_name_list.append(dispname)
    session['dispname'] = dispname
    session['current_channel'] = 'Private'

    return redirect( url_for('index') )


@app.route("/logout")
def logout():

    if session.get('dispname', None) in display_name_list:
        display_name_list.remove(session.get('dispname', None))

    # channels.pop(session['dispname'], None)
    session.pop('dispname', None)   
    session.pop('current_channel', None)

    return redirect(url_for('index'))


@socketio.on('connected')
def connected(data):

    # Get user details
    dispname = data["dispname"]    
    current_channel = dispname if data['current_channel'] == "Private" else data['current_channel']


    # Create a private channel if not created
    if dispname not in list(channels):
        channels[dispname] = {
            'owner' : dispname,
            'users' : [dispname],
            'messages': []
        }

    # Join them to their own channel
    join_room(dispname)

    # available_channels = [c for c in list(channels) if c != dispname]
    available_channels = [ [c,d['owner']] for c,d in channels.items() if c != dispname]
    channel_messages = channels[current_channel]['messages']
    channel_users    = channels[current_channel]['users']


    emit('connected', {'current_channel':current_channel, 
                        'users': channel_users, 
                        'channels': available_channels, 
                        'channel_messages':channel_messages })




@socketio.on('create_new_channel')
def create_new_channel(data):

    owner = data["owner"]
    channel_name = data["channel_name"]

    if channel_name not in list(channels):

        channels[channel_name] = {
                'owner' : owner,
                'users' : [],
                'messages': []
        }

        # Announce to everyone
        emit('created_new_channel', {'channel_name':channel_name,'owner': owner}, broadcast = True)

    else:
        emit('validation', {'message':'Cannot create an already existing channel'})



@socketio.on('delete_channel')
def delete_channel(data):
    dispname = data["dispname"]
    channel_name = data["channel_name"]
    channels.pop(channel_name)

    # Announce to everyone
    available_channels = [ [c,d['owner']] for c,d in channels.items() if c != dispname]
    emit('deleted_channel', {'channel_name':channel_name,'channels': available_channels}, broadcast = True)



@socketio.on('disconnected')
def disconnected(data):
    print('Client disconnected')


@socketio.on('new_message')
def new_message(data):

    dispname = data["dispname"]
    message = data["message"]
    channel = data["channel"]
    dateTimeObj = datetime.now()
    timestampStr = dateTimeObj.strftime("%d-%b-%Y (%H:%M:%S.%f)")

    if channel == "Private":

        # Store the message in the user's private channel
        if len(channels[dispname]['messages']) == 100:
            channels[dispname]['messages'].pop(0)

        channels[dispname]['messages'].append({'dispname' : dispname, 'message' : message, 'timestamp' : timestampStr})
        

        # emit the message to anyone connected to this channel
        emit('on_message', {'dispname': dispname, 
                            'message': message , 
                            'channel': channel, 
                            'timestamp': timestampStr},
                            room=dispname)
    
    else:

        # Store the message in the channel
        if len(channels[channel]['messages']) == 100:
            channels[channel]['messages'].pop(0)

        channels[channel]['messages'].append({'dispname' : dispname, 'message' : message, 'timestamp' : timestampStr})

        # Emit the message to everyone on the channel
        emit('on_message', {'dispname': dispname,
                             'message': message , 
                             'channel': channel, 
                             'timestamp': timestampStr},
                              room=channel)



@socketio.on('join_channel')
def join_channel(data):

    dispname = data["dispname"]
    channel = data["channel"]

    join_room(channel)

    # Add them to the channel users
    if dispname not in channels[channel]['users']:
        channels[channel]['users'].append(dispname)

    # Update everyone on the channel
    send(dispname + ' has joined this channel.', room=channel)

    # Update the user
    channel_messages = channels[channel]['messages']
    channel_users    = channels[channel]['users']
    emit('joined_channel', {'dispname': dispname, 
                            'channel': channel, 
                            'channel_messages':channel_messages, 
                            'channel_users': channel_users })
   
    # Update everyone on the channel
    emit('new_member_joined_channel', {'dispname': dispname}, room=channel)



@socketio.on('leave_channel')
def leave_channel(data):

    dispname = data['dispname']
    channel = data['channel']
    leave_room(channel)

    # Remvove them from channel user list
    if dispname in channels[channel]['users']:
        channels[channel]['users'].remove(dispname)

    # Update everyone on the channel
    emit('member_left_channel', {'dispname': dispname, 'channel_users': channels[channel]['users']}, room=channel)

    # Update the user to go back to their private channel automatically
    #available_channels = [c for c in list(channels) if c != dispname]
    available_channels = [ [c,d['owner']] for c,d in channels.items() if c != dispname]
    channel_messages = channels[dispname]['messages']
    channel_users    = channels[dispname]['users']


    emit('left_channel', {'dispname': dispname, 
                          'current_channel': 'Private', 
                          'channel_users': channel_users,
                          'channels' : available_channels,
                          'channel_messages': channel_messages})


if __name__ == '__main__':
    socketio.run(app)