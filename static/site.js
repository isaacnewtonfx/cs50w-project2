document.addEventListener('DOMContentLoaded', () => {

if(document.querySelector('#btn-send')!=null){

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);



    // Logout button
    const logoutButton = document.querySelector('#logout');
    logoutButton.addEventListener("click", ()=>{
        localStorage.removeItem('current_channel');

        window.location.href = "/logout";
    });






    // When connected, configure buttons
    socket.on('connect', function() {

        console.log("connected");


        // Get previous current channel from localStorage
        let current_channel = "";
        if (localStorage.getItem("current_channel") == null){
            current_channel = "Private";
        }else{
            current_channel = localStorage.getItem("current_channel");
        }



        // Submit display name to the server
        const dispname = document.querySelector('#dispname').innerHTML.trim();
        socket.emit('connected', {'dispname': dispname, 'current_channel': current_channel});



        // New channel button
        const newChannelButton = document.querySelector('#btn-new-channel');
        newChannelButton.addEventListener("click", ()=>{

            const new_channel_name = document.querySelector('#new_channel_name').value;

            if(new_channel_name == ""){
                alert("New channel name is required");
            }else{
                socket.emit('create_new_channel', {'owner': dispname, 'channel_name': new_channel_name});
            }

        });


        // Send message button
        const sendButton = document.querySelector('#btn-send');
        sendButton.addEventListener("click", ()=>{
            
            const channel = document.querySelector('#current-channel').innerHTML.trim();
            const message = document.querySelector('#message').value;

            if(message == ""){

                document.querySelector('#validation-msg').innerHTML = "Message is required";
                document.querySelector('#validation-msg').style.visibility = "visible";
                
            }else{

                document.querySelector('#validation-msg').style.visibility = "hidden";
                socket.emit('new_message', {'dispname': dispname, 'message': message, 'channel': channel});

                //clear input message
                document.querySelector('#message').value = "";
            }

        });


        // Delete channel button
        document.addEventListener('click', function(e){

            if(e.target && e.target.className== 'btn-delete'){
                
                const channel_name = e.target.dataset.channel;               
                socket.emit('delete_channel', {'channel_name': channel_name, 'dispname': dispname});

             }
         });


        // Join channel button
        document.addEventListener('click', function(e){

            if(e.target && e.target.className== 'btn-join'){
                
                const channel = e.target.dataset.channel.trim();
                const dispname = document.querySelector('#dispname').innerHTML.trim();

                socket.emit('join_channel', {'dispname': dispname, 'channel': channel});

             }
         });


         // Leave channel button
        document.addEventListener('click',function(e){

            if(e.target && e.target.className== 'btn-leave'){    

                const channel = e.target.dataset.channel.trim();
                const dispname = document.querySelector('#dispname').innerHTML.trim();
                
                socket.emit('leave_channel', {'dispname': dispname, 'channel': channel});

             }
         });



         // Enter key to send
         const input = document.querySelector('#message')
         input.addEventListener("keyup", function(event) {
            if (event.keyCode === 13) {
              document.querySelector("#btn-send").click();
            }
          });

    });



    const addMessage = (dispname, message, timestamp)=>{

        const li = `<li>
                        <div><b>${dispname}:</b> ${message}</div> 
                        <div><i id="timestamp" class="color-gray">${timestamp}</i></div>
                    </li>`

        document.querySelector('#messages-ul').insertAdjacentHTML('beforeend', li);

    }


    const appendConnectedUser = user => {

        const li = document.createElement('li');
        li.innerHTML = user;
        document.querySelector('#connected-users-ul').append(li);

    }


    const appendChannel = (channel, owner) => {

        const dispname = document.querySelector('#dispname').innerHTML.trim();

        if (channel!=""){

            let li = "";
            let removeBtn = "";

            // Allow channel deletion if oney they are the owner and also not the default private channel
            if(owner == dispname && channel != dispname){
                removeBtn = `<button class='btn-delete' data-channel='${channel}'>
                                Delete
                            </button>`
            }

            if (localStorage.getItem("current_channel") == channel){
                
                // Leave button
                li = `<li> <span>${channel}</span> 
                            <button class='btn-leave' data-channel='${channel}'>
                                Leave
                            </button>
                            ${removeBtn}
                        </li>`
            }else{

                // Join button
                li = `<li> <span>${channel}</span> 
                            <button class='btn-join' data-channel='${channel}'>
                                Join
                            </button>
                            ${removeBtn}
                        </li>`


            }

            document.querySelector('#channels-ul').insertAdjacentHTML('beforeend', li);
        }
    }



     // When a new connection is made
     socket.on('connected', data => {

        // Populate connected users list
        document.querySelector('#connected-users-ul').innerHTML = "";
        data.users.forEach(user=>{
            appendConnectedUser(user);
        })

 
        // Populate available channels list
        document.querySelector('#channels-ul').innerHTML = "";
        data.channels.forEach(channel => {

            appendChannel(channel[0],channel[1]);
        
        });


        // Populate channel messages
        document.querySelector('#messages-ul').innerHTML = "";
        data.channel_messages.forEach(msg=>{
            addMessage(msg.dispname, msg.message, msg.timestamp);
        });


        const dispname = document.querySelector('#dispname').innerHTML.trim();
        if (data.current_channel == dispname){
            document.querySelector('#current-channel').innerHTML = "Private";
        }else{
            document.querySelector('#current-channel').innerHTML = data.current_channel;
        }
        

    });


    // When a new channel is created
    socket.on('created_new_channel', data => {        
        appendChannel(data.channel_name, data.owner);

        document.querySelector('#validation-msg').style.visibility = "hidden";
    });


    // When a new channel is deleted
    socket.on('deleted_channel', data => {        
        
        document.querySelector('#channels-ul').innerHTML = "";
        data.channels.forEach(channel=>{
            appendChannel(channel[0], channel[1]);
        })

        document.querySelector('#validation-msg').innerHTML = data.channel_name + " has been deleted. Please join a different channel";
        document.querySelector('#validation-msg').style.visibility = "visible";

    });

    // Receiving server side validation messages
    socket.on('validation', data => {        
        document.querySelector('#validation-msg').innerHTML = data.message;
        document.querySelector('#validation-msg').style.visibility = "visible";
    });


    // When a new message is received
    socket.on('on_message', data => {
        console.log(data);
        addMessage(data.dispname, data.message, data.timestamp);
    });


    // When joined channel successfully
    socket.on('joined_channel', data => {
        console.log(data)

        // Clear existing messages from the dom
        document.querySelector('#messages-ul').innerHTML = "";


        // Clear connected users from the dom
        document.querySelector('#connected-users-ul').innerHTML = "";


        // Change the Join button to a leave button
        document.querySelector("[data-channel='" + data.channel + "'").innerHTML = "Leave";
        document.querySelector("[data-channel='" + data.channel + "'").className = 'btn-leave';


        // Add all messages from the joined channel
        document.querySelector('#current-channel').innerHTML = data.channel;
        data.channel_messages.forEach(msg=>{
            addMessage(msg.dispname, msg.message, msg.timestamp);
        });


        // Add all users from the joined channel
        data.channel_users.forEach(user=>{
            appendConnectedUser(user);
        });

        // Set the current channel in localStorage
        localStorage.setItem("current_channel", data.channel);


    });

    // When someone joined channel successfully
    socket.on('new_member_joined_channel', data => {

        const dispname = document.querySelector('#dispname').innerHTML.trim();

        // if it is me, only add notification message
        console.log(dispname);
        
        if (data.dispname == dispname){

            const li = `<li>
                            <div><b><i style='color:blue;'>${data.dispname} has joined channel</i></b></div> 
                        </li>`

            document.querySelector('#messages-ul').insertAdjacentHTML('beforeend', li);
            
        }else{
            // add them to my list of connected users and show notification message
            appendConnectedUser(data.dispname);

            const li = `<li>
                            <div><b><i style='color:blue;'>${data.dispname} has joined channel</i></b></div> 
                        </li>`

            document.querySelector('#messages-ul').insertAdjacentHTML('beforeend', li);

        }

    });


    // When someone left channel successfully
    socket.on('member_left_channel', data => {

        console.log(data)

        const li = `<li>
                    <div><b><i style='color:blue;'>${data.dispname} has left channel</i></b></div> 
                    </li>`

        document.querySelector('#messages-ul').insertAdjacentHTML('beforeend', li);



        // Populate the new user list
        document.querySelector('#connected-users-ul').innerHTML = "";
        data.channel_users.forEach(user=>{
            appendConnectedUser(user);
        });



    });


    // Private function for when user left channel
    socket.on('left_channel', data => {

        console.log(data)

        localStorage.setItem("current_channel", data.current_channel);
        document.querySelector('#current-channel').innerHTML = data.current_channel;

        
        // Populate connected users
        document.querySelector('#connected-users-ul').innerHTML = "";
        data.channel_users.forEach(user=>{
            appendConnectedUser(user);
        });



        // Populate channels
        document.querySelector('#channels-ul').innerHTML = "";
        data.channels.forEach(channel=>{
            appendChannel(channel[0], channel[1]);
        })


        // Populate messages
        document.querySelector('#messages-ul').innerHTML = "";
        data.channel_messages.forEach(msg=>{
            addMessage(msg.dispname, msg.message, msg.timestamp);
        });

    });



}

});