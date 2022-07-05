'use strict'

const express = require('express');
const bodyParser = require('body-parser')
const axios = require('axios');
const admin = require("firebase-admin");
const {initializeApp} = require('firebase-admin/app');
const {getDatabase} = require('firebase-admin/database');


const app = express();
const port = process.env.PORT || 3000;
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),

});

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json())

app.get("/webhook", (req, res) => {
    res.send("Bienvenido a mi webhook");
})


app.listen(port, () => {
    // console.log('Servicio corriendo en el puerto ' + port);
})

app.post("/webhook", (req, res) => {
    var data = req.body;

    if (data !== undefined) {
        let playload = data.uplink_message.decoded_payload;


        if(playload !== null && playload !== undefined && playload.tipo){

            let sensor = {
                id: playload.id,
                nombre: playload.nombre,
                activo: playload.activo,
                fechDato: new Date(),
                lati: playload.lati,
                longi: playload.longi,
                montado: playload.montado,
                tipo: playload.tipo,
                bateria: playload.bateria,
            }

            guardarDatos(sensor)

            if (sensor.tipo !== "gps" && sensor.activo){
                enviarNotificacion(sensor)
            }


        }


    }

    res.sendStatus(200)

})

const guardarDatos = (sensor) =>{

    const db = admin.firestore();

    const cityRef = db.collection('sensores').doc(sensor.id);

    cityRef.set(sensor, {merge: true}).then((dox) => {
         // console.log("Subio")
    });

}


const enviarNotificacion = (sensor) => {
    const fcm = "https://fcm.googleapis.com/fcm/send"


    let message = {

        "to": "/topics/all",
        "priority": "high",
        "notification": {
            "body": "Ha sido Activada en la fecha: " +  sensor.fechDato.toLocaleString(),
            "title": sensor.nombre,
            "sound": "siren",


        },
        "data": {
            "nombre": sensor,
        },

        android: {
            notification: {
                sound: 'siren'
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'siren'
                },
            },
        },
        webpush: {
            notification: {
                sound: 'siren'
            },
        },

    }


    const headers = {
        "Authorization": "key=AAAA6TfiKFc:APA91bFZP7SIroAwrhRBejuaplTlY52FhiHp5ULCuiWiNFYwe81UcBxCpVhB6SAwAv1NCnAMLirU9vU-VCPvikNmT-WOAe_2VUlwtfTDKbnHRXZNITBhBcbAsy2CIsTIPQjCbPyvtF6P",
        "Content-Type": "application/json",
    }

    axios.post(fcm, message, {headers}).then((doc) => {
        //  console.log("Enviado")
    }).catch((err) => {
        //  console.log(err.message)
    })
}











