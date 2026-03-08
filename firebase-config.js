// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCx75EIrWrRym40d3Ntjy8d_PjDy5V5Gp8",
  authDomain: "chat-online-f6753.firebaseapp.com",
  databaseURL: "https://chat-online-f6753-default-rtdb.firebaseio.com",
  projectId: "chat-online-f6753",
  storageBucket: "chat-online-f6753.appspot.com",
  messagingSenderId: "106228514889",
  appId: "1:106228514889:web:9dcfe5153d63eb55325a0c"
};

// Inicializar Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const messagesRef = database.ref('brandon-chat/messages');
const connectedRef = database.ref('.info/connected');